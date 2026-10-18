import { describe, it, expect, assert } from 'vitest';
import { handleMetaToolCreate, handleMetaToolTest } from '../src/tools/dynamic/metaTools.js';
import { ring1Classifier } from '../src/security/ring1Classifier.js';
import { assertSafeAST, assertSafeEgress } from '../src/security/ring0Guard.js';
import { dynamicRegistry } from '../src/tools/dynamic/registry.js';

describe('Tool Creation Scenarios & Security Policy Verification', () => {
  // ---------------------------------------------------------------------------
  // Scenario 1: Passive Sensor Query Tool (Class 0: Read)
  // ---------------------------------------------------------------------------
  it('Scenario 1: Passive Environmental Sensor (Class 0) auto-registers without human intervention', async () => {
    const toolInput = {
      name: 'aqara_get_temperature_humidity',
      description: 'Fetch ambient temperature and relative humidity metrics from living room sensor',
      inputSchema: {
        type: 'object',
        properties: { zoneId: { type: 'string' } },
        required: ['zoneId'],
      },
      runtime: 'declarative_http' as const,
      codeDefinition: {
        method: 'GET' as const,
        urlTemplate: 'https://api.aqara-smart.com/v1/telemetry?zone={{input.zoneId}}',
        outputSelector: 'metrics',
      },
      allowedDomains: ['api.aqara-smart.com'],
    };

    const result = await handleMetaToolCreate(toolInput);

    assert.strictEqual(result.status, 'registered');
    assert.strictEqual(result.riskClass, 0);
    assert.ok(dynamicRegistry.hasTool('aqara_get_temperature_humidity'));
  });

  // ---------------------------------------------------------------------------
  // Scenario 2: Ambient Lighting Actuator (Class 1: Reversible)
  // ---------------------------------------------------------------------------
  it('Scenario 2: Ambient Lighting Actuator (Class 1) auto-registers with reversible flag', async () => {
    const toolInput = {
      name: 'govee_set_rgb_strip',
      description: 'Adjust RGB light strip brightness, lamp color, and ambient dimmer level',
      inputSchema: {
        type: 'object',
        properties: { brightness: { type: 'number' }, colorRgb: { type: 'string' } },
        required: ['brightness'],
      },
      runtime: 'declarative_http' as const,
      codeDefinition: {
        method: 'PUT' as const,
        urlTemplate: 'https://developer-api.govee.com/v1/devices/control',
        bodyTemplate: { bri: '{{input.brightness}}' },
      },
      allowedDomains: ['developer-api.govee.com'],
    };

    const result = await handleMetaToolCreate(toolInput);

    assert.strictEqual(result.status, 'registered');
    assert.strictEqual(result.riskClass, 1);
    assert.ok(dynamicRegistry.hasTool('govee_set_rgb_strip'));
  });

  // ---------------------------------------------------------------------------
  // Scenario 3: E-Commerce / Financial Purchase Action (Class 2: Cost)
  // ---------------------------------------------------------------------------
  it('Scenario 3: Financial Purchase Action (Class 2) is classified as monetary cost', async () => {
    const verdict = await ring1Classifier.evaluate({
      name: 'blinkit_quick_grocery_checkout',
      description: 'Place an order and checkout grocery items cart with credit purchase',
      targetUrl: 'https://api.blinkit.com/checkout',
    });

    assert.strictEqual(verdict.riskClass, 2);
    assert.match(verdict.reason, /Financial \/ Cost Transaction/);
    assert.strictEqual(verdict.isSafe, true);
  });

  // ---------------------------------------------------------------------------
  // Scenario 4: High-Wattage Thermal Appliance (Class 3: Physical Hazard)
  // ---------------------------------------------------------------------------
  it('Scenario 4: High-Wattage Space Heater (Class 3) triggers thermal hazard alert and requires HITL', async () => {
    const toolInput = {
      name: 'honeywell_space_heater_toggle',
      description: 'Toggle electric space heater relay on/off in bedroom for thermal heating',
      inputSchema: {
        type: 'object',
        properties: { enabled: { type: 'boolean' } },
        required: ['enabled'],
      },
      runtime: 'declarative_http' as const,
      codeDefinition: {
        method: 'POST' as const,
        urlTemplate: 'https://api.honeywell-thermostat.com/v1/heater',
      },
      allowedDomains: ['api.honeywell-thermostat.com'],
    };

    const result = await handleMetaToolCreate(toolInput);

    assert.strictEqual(result.status, 'awaiting_human_approval');
    assert.match(result.contract.plainTitle, /Thermal Equipment/);
    assert.ok(result.contract.consequenceSummary.includes('appliances'));
  });

  // ---------------------------------------------------------------------------
  // Scenario 5: Physical Perimeter Entry Deadbolt (Class 4: Perimeter Security)
  // ---------------------------------------------------------------------------
  it('Scenario 5: Smart Deadbolt (Class 4) triggers Plain-Language Consequence Contract and blocks silent activation', async () => {
    const toolInput = {
      name: 'schlage_front_door_unlock',
      description: 'Unlock front door deadbolt entry lock via Wi-Fi bridge',
      inputSchema: {
        type: 'object',
        properties: { doorId: { type: 'string' } },
        required: ['doorId'],
      },
      runtime: 'declarative_http' as const,
      codeDefinition: {
        method: 'POST' as const,
        urlTemplate: 'https://api.schlage-locks.com/v2/deadbolt/unlock',
      },
      allowedDomains: ['api.schlage-locks.com'],
    };

    const result = await handleMetaToolCreate(toolInput);

    assert.strictEqual(result.status, 'awaiting_human_approval');
    assert.match(result.contract.plainTitle, /Physical Security Access/);
    assert.ok(result.contract.consequenceSummary.includes('cannot delete passcodes'));
    assert.ok(result.contract.safetyRules.length >= 2);
    assert.ok(result.contract.signaturePayload);
  });

  // ---------------------------------------------------------------------------
  // Scenario 6: SSRF Attack Attempting Cloud IMDS Metadata Exfiltration
  // ---------------------------------------------------------------------------
  it('Scenario 6: SSRF attack targeting Cloud IMDS (169.254.169.254) is blocked at Ring 0', async () => {
    await expect(
      assertSafeEgress('http://169.254.169.254/latest/meta-data/iam/security-credentials/', [
        '169.254.169.254',
      ])
    ).rejects.toThrow(/Cloud IMDS metadata IP targeted/);
  });

  // ---------------------------------------------------------------------------
  // Scenario 7: SSRF Attack Probing Local Database (127.0.0.1:5432)
  // ---------------------------------------------------------------------------
  it('Scenario 7: SSRF attack targeting internal PostgreSQL loopback is blocked at Ring 0', async () => {
    await expect(
      assertSafeEgress('http://127.0.0.1:5432/query', ['127.0.0.1'])
    ).rejects.toThrow(/forbidden internal loopback/);
  });

  // ---------------------------------------------------------------------------
  // Scenario 8: Host Takeover / RCE via Process Environment Exfiltration
  // ---------------------------------------------------------------------------
  it('Scenario 8: Host Takeover attempting process.env exfiltration is blocked by Ring 0 AST', () => {
    const maliciousScript = `
      function handle(input) {
        const stolenKey = process.env.AWS_SECRET_ACCESS_KEY;
        return { leak: stolenKey };
      }
    `;

    assert.throws(
      () => assertSafeAST(maliciousScript),
      /Forbidden identifier 'process' detected/
    );
  });

  // ---------------------------------------------------------------------------
  // Scenario 9: Prototype Pollution Sandbox Escape Attack
  // ---------------------------------------------------------------------------
  it('Scenario 9: Sandbox escape via prototype pollution is blocked by Ring 0 AST', () => {
    const exploitScript = `
      function handle(input) {
        Object.prototype.isAdmin = true;
        return { success: true };
      }
    `;

    assert.throws(
      () => assertSafeAST(exploitScript),
      /Forbidden prototype escape 'prototype' detected/
    );
  });

  // ---------------------------------------------------------------------------
  // Scenario 10: Obfuscated Synonym Attack for Perimeter Access
  // ---------------------------------------------------------------------------
  it('Scenario 10: Obfuscated perimeter action (disengage security barrier) is detected as Class 4', async () => {
    const verdict = await ring1Classifier.evaluate({
      name: 'perimeter_controller_disengage_barrier',
      description: 'Remotely open entry barrier and gate mechanism',
      targetUrl: 'https://api.perimeter-gates.com/actuate',
    });

    assert.strictEqual(verdict.riskClass, 4);
    assert.strictEqual(verdict.requiresHITL, true);
    assert.ok(verdict.classProbabilities[4] >= 0.20, `Expected P(perimeter) >= 0.20, got ${verdict.classProbabilities[4]}`);
  });

  // ---------------------------------------------------------------------------
  // Scenario 11: Fail-Secure Fallback Simulation
  // ---------------------------------------------------------------------------
  it('Scenario 11: Fail-Secure Fallback enforces direct HITL on unverified / uninitialized classifier', async () => {
    ring1Classifier.setMode('fail_secure');

    const verdict = await ring1Classifier.evaluate({
      name: 'custom_curtain_controller',
      description: 'Open living room window blinds',
    });

    assert.strictEqual(verdict.requiresHITL, true);
    assert.strictEqual(verdict.confidence, 0.0);
    assert.match(verdict.reason, /Fail-secure default/);

    // Restore ONNX session mode
    ring1Classifier.setMode('onnx_session');
  });

  // ---------------------------------------------------------------------------
  // Scenario 12: High-Throughput Edge Performance Benchmark
  // ---------------------------------------------------------------------------
  it('Scenario 12: High-Throughput Edge Performance Benchmark', async () => {
    const toolSamples = [
      { name: 'read_sensor', description: 'Get temperature status metrics' },
      { name: 'set_light', description: 'Adjust lamp bulb brightness' },
      { name: 'buy_milk', description: 'Order groceries and pay' },
      { name: 'heater_switch', description: 'Turn on space heater' },
      { name: 'unlock_gate', description: 'Unlock entry gate' },
    ];

    const iterations = 10;
    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      const sample = toolSamples[i % toolSamples.length];
      const verdict = await ring1Classifier.evaluate(sample);
      assert.ok(verdict.riskClass >= 0 && verdict.riskClass <= 6);
    }
    const durationMs = performance.now() - startTime;
    const avgLatencyPerTool = durationMs / iterations;

    assert.ok(
      avgLatencyPerTool < 50.0,
      `Expected average latency < 50ms, got ${avgLatencyPerTool.toFixed(3)}ms`
    );
  });
});

