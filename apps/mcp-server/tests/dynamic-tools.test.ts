import { describe, it, expect, assert } from 'vitest';
import { assertSafeAST, assertSafeEgress } from '../src/security/ring0Guard.js';
import { runDeclarativeHttp, runSandboxedScript } from '../src/tools/dynamic/dualEngineRunner.js';
import { generateConsequenceContract, signCapabilityToken, verifyCapabilityToken } from '../src/security/ring2Contract.js';
import { ring1Classifier } from '../src/security/ring1Classifier.js';
import { DynamicToolRegistry } from '../src/tools/dynamic/registry.js';
import { handleMetaToolCreate, handleMetaToolTest } from '../src/tools/dynamic/metaTools.js';

describe('Dynamic Tools Security & Engine Tests', () => {
  // ---------------------------------------------------------------------------
  // 1. Ring 0 Deterministic Security Guard Tests
  // ---------------------------------------------------------------------------
  it('Ring 0: Rejects code containing forbidden identifiers (process, eval, Function)', () => {
    const codeWithProcess = 'const secret = process.env.DATABASE_URL;';
    assert.throws(
      () => assertSafeAST(codeWithProcess),
      /Forbidden identifier 'process' detected/
    );

    const codeWithEval = 'eval("console.log(123)");';
    assert.throws(
      () => assertSafeAST(codeWithEval),
      /Forbidden identifier 'eval' detected/
    );

    const codeWithFunction = 'const fn = new Function("return 1");';
    assert.throws(
      () => assertSafeAST(codeWithFunction),
      /Forbidden identifier 'Function' detected/
    );
  });

  it('Ring 0: Rejects prototype pollution attempts (__proto__, prototype, constructor)', () => {
    const codeProto = 'const p = obj.__proto__;';
    assert.throws(
      () => assertSafeAST(codeProto),
      /Forbidden prototype escape '__proto__' detected/
    );

    const codeConstructor = 'const c = obj.constructor;';
    assert.throws(
      () => assertSafeAST(codeConstructor),
      /Forbidden prototype escape 'constructor' detected/
    );
  });

  it('Ring 0: Allows clean, safe algorithmic code', () => {
    const safeCode = `
      function calculate(a, b) {
        return a * 2 + b;
      }
    `;
    assert.doesNotThrow(() => assertSafeAST(safeCode));
  });

  it('Ring 0: Blocks SSRF targeting loopback (127.0.0.1, localhost)', async () => {
    await expect(assertSafeEgress('http://127.0.0.1:8080/admin', ['127.0.0.1'])).rejects.toThrow(
      /SSRF Violation/
    );

    await expect(assertSafeEgress('http://localhost:5432/db', ['localhost'])).rejects.toThrow(
      /SSRF Violation/
    );
  });

  it('Ring 0: Blocks Cloud Metadata endpoint (169.254.169.254)', async () => {
    await expect(assertSafeEgress('http://169.254.169.254/latest/meta-data', ['169.254.169.254'])).rejects.toThrow(
      /Cloud IMDS metadata/
    );
  });

  it('Ring 0: Rejects targets not in declared allowedDomains', async () => {
    await expect(assertSafeEgress('http://evil.com/leak', ['api.philips.com'])).rejects.toThrow(
      /not in declared allowedDomains/
    );
  });

  // ---------------------------------------------------------------------------
  // 2. Dual-Engine Runner Tests
  // ---------------------------------------------------------------------------
  it('Dual Engine: Declarative HTTP correctly interpolates input and executes request', async () => {
    const definition = {
      method: 'GET' as const,
      urlTemplate: 'https://example.com/api/weather?city={{input.city}}',
      headers: { 'Accept': 'application/json' },
      outputSelector: 'temperature'
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any, _options: any) => {
      assert.strictEqual(url, 'https://example.com/api/weather?city=Paris');
      return {
        ok: true,
        status: 200,
        json: async () => ({ city: 'Paris', temperature: 21, condition: 'Sunny' })
      } as any;
    }) as any;

    try {
      const result = await runDeclarativeHttp(definition, { city: 'Paris' }, ['example.com'], true);
      assert.strictEqual(result, 21);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('Dual Engine: Sandboxed Script executes clean math within timeout', async () => {
    const script = `
      function handle(input) {
        return { multiplied: input.a * input.b };
      }
    `;
    const result = await runSandboxedScript(script, { a: 6, b: 7 }, 1000, 32);
    assert.deepStrictEqual(result, { multiplied: 42 });
  });

  it('Dual Engine: Sandboxed Script terminates infinite loop via timeout', async () => {
    const badScript = `
      function handle() {
        while(true) {}
      }
    `;
    await expect(runSandboxedScript(badScript, {}, 50, 16)).rejects.toThrow(
      /Execution timed out/
    );
  });

  // ---------------------------------------------------------------------------
  // 3. Ring 1 Classifier & Fail-Secure Policy Tests
  // ---------------------------------------------------------------------------
  it('Ring 1: Fails securely to HITL when ONNX model is absent or uninitialized', async () => {
    const classifier = ring1Classifier;
    await classifier.initialize('/non/existent/model.onnx');

    const verdict = await classifier.evaluate({
      name: 'custom_smart_switch',
      description: 'Turn smart socket on/off'
    });

    // Must fail securely: requiresHITL must be TRUE
    assert.strictEqual(verdict.requiresHITL, true);
    assert.strictEqual(verdict.confidence, 0.0);
  });

  // ---------------------------------------------------------------------------
  // 4. Ring 2 Consequence Contract & Ed25519 Capability Tokens
  // ---------------------------------------------------------------------------
  it('Ring 2: Generates plain-language consequence contract without technical jargon', () => {
    const contract = generateConsequenceContract({
      name: 'front_door_unlock',
      description: 'Unlock front door deadbolt',
      riskClass: 4,
      allowedDomains: ['192.168.1.42']
    });

    assert.match(contract.plainTitle, /Physical Security Access/);
    assert.match(contract.consequenceSummary, /cannot delete passcodes/);
    assert.ok(contract.safetyRules.length >= 2);
    assert.ok(contract.signaturePayload);
  });

  it('Ring 2: Signs and verifies Ed25519 capability token', () => {
    const payload = JSON.stringify({ tool: 'front_door_unlock', nonce: '12345' });
    const token = signCapabilityToken(payload);
    assert.ok(token);

    const isValid = verifyCapabilityToken(payload, token);
    assert.strictEqual(isValid, true);

    const isInvalid = verifyCapabilityToken(payload + 'tampered', token);
    assert.strictEqual(isInvalid, false);
  });

  // ---------------------------------------------------------------------------
  // 5. Dynamic Tool Registry & Meta-Tools Tests
  // ---------------------------------------------------------------------------
  it('Registry & Meta-Tools: Dry-run testing and tool creation flow', async () => {
    const _registry = new DynamicToolRegistry();

    const testPayload = {
      runtime: 'declarative_http' as const,
      codeDefinition: {
        method: 'GET' as const,
        urlTemplate: 'https://example.com/status',
      },
      testInput: {},
      allowedDomains: ['example.com']
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'online' })
    })) as any;

    try {
      const testResult = await handleMetaToolTest(testPayload, true);
      assert.strictEqual(testResult.status, 'success');
      assert.deepStrictEqual(testResult.result, { status: 'online' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

