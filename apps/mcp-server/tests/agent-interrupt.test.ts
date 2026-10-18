import { describe, it, expect, assert, beforeEach } from 'vitest';
import { interruptManager, AgentInterrupt } from '../src/security/interruptManager.js';
import { AgentOrchestrator } from '../src/agent/orchestrator.js';
import { dynamicRegistry } from '../src/tools/dynamic/registry.js';
import { localBus } from '../src/pubsub/redis.js';
import { AutonomousToolPlannerProvider } from '../src/agent/providers/AutonomousToolPlannerProvider.js';

function waitForCondition(fn: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (fn()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error(`Condition not met within ${timeoutMs}ms`));
      }
    }, 15);
  });
}

describe('Agent Interrupt System: Structured HITL Interrupt and Resolution Lifecycle', () => {
  beforeEach(() => {
    interruptManager.clear();
  });

  it('1. Interrupt Manager creates structured interrupt and resolves on human approval', async () => {
    const { interrupt, promise } = interruptManager.createInterrupt({
      runId: 'run_test_01',
      toolName: 'smart_deadbolt_unlock',
      toolCallId: 'call_test_01',
      contract: {
        plainTitle: 'Unlock front door',
        consequenceSummary: 'Permits entry through physical perimeter.',
        safetyRules: ['Auto-relock', 'Audit log'],
        riskClass: 4,
        capabilityToken: 'tok_test',
      },
      type: 'tool_clearance_required',
    });

    assert.equal(interrupt.status, 'pending');
    assert.equal(interrupt.toolName, 'smart_deadbolt_unlock');
    assert.equal(interrupt.type, 'tool_clearance_required');
    assert.ok(interrupt.interruptId.startsWith('int_'));

    // Verify pending interrupts query
    const pendingList = interruptManager.getPendingInterrupts();
    assert.equal(pendingList.length, 1);
    assert.equal(pendingList[0].interruptId, interrupt.interruptId);

    // Resolve as approved
    const resolved = interruptManager.resolveInterrupt(interrupt.interruptId, 'approved');
    assert.equal(resolved, true);

    const decision = await promise;
    assert.equal(decision, 'approved');
    assert.equal(interruptManager.getPendingInterrupts().length, 0);
  });

  it('2. Interrupt Manager fails secure to rejected upon timeout', async () => {
    const { interrupt, promise } = interruptManager.createInterrupt({
      runId: 'run_test_timeout',
      toolName: 'garage_heater',
      toolCallId: 'call_test_02',
      timeoutMs: 50, // 50ms fast timeout for testing
    });

    assert.equal(interrupt.status, 'pending');

    const decision = await promise;
    assert.equal(decision, 'rejected');
    assert.equal(interrupt.status, 'timeout');
  });

  it('3. End-to-End Orchestrator: Agent pauses on high-risk tool creation, emits structured interrupt, and resumes on approval', async () => {
    dynamicRegistry.unregister('smart_deadbolt_unlock');

    let interruptEventReceived: any = null;
    let resolutionEventReceived: any = null;

    const onAgentUpdate = (event: any) => {
      if (event.type === 'agent_interrupted') {
        interruptEventReceived = event;
      }
      if (event.type === 'interrupt_resolved') {
        resolutionEventReceived = event;
      }
    };

    localBus.on('agent_updates', onAgentUpdate);

    const orchestrator = new AgentOrchestrator({
      provider: new AutonomousToolPlannerProvider(),
      skipDbLogging: true,
    });

    // Start execution in background promise
    const taskPromise = orchestrator.executeTask(
      'I installed a new Yale Smart Deadbolt at https://locks.internal/unlock. Integrate it and unlock the front door.'
    );

    try {
      // Deterministically wait for interrupt event
      await waitForCondition(() => interruptEventReceived !== null, 3000);

      // Verify interrupt was raised with correct structured schema
      assert.ok(interruptEventReceived, 'agent_interrupted event must be published over localBus');
      assert.equal(interruptEventReceived.type, 'agent_interrupted');
      assert.ok(interruptEventReceived.interrupt.interruptId);
      assert.equal(interruptEventReceived.interrupt.toolName, 'smart_deadbolt_unlock');
      assert.equal(interruptEventReceived.interrupt.type, 'tool_clearance_required');
      assert.equal(interruptEventReceived.interrupt.contract.riskClass, 4);

      // Simulate Human User resolving the interrupt from Web Dashboard
      const interruptId = interruptEventReceived.interrupt.interruptId;
      const resolved = interruptManager.resolveInterrupt(interruptId, 'approved');
      assert.equal(resolved, true);

      // Await agent task completion
      const summary = await taskPromise;

      // Verify agent unblocked and processed the human authorization
      assert.ok(resolutionEventReceived, 'interrupt_resolved event must be published upon resolution');
      assert.equal(resolutionEventReceived.decision, 'approved');
      assert.ok(summary.includes('authorized') || summary.includes('unlocked') || summary.includes('registered'));

      // Verify tool was activated in the dynamic registry
      const tool = dynamicRegistry.getTool('smart_deadbolt_unlock');
      assert.ok(tool, 'Tool must be registered in dynamicRegistry');
      assert.equal(tool?.status, 'active');
    } finally {
      localBus.off('agent_updates', onAgentUpdate);
    }
  });

  it('4. End-to-End Orchestrator: Agent safely aborts tool activation when human denies authorization', async () => {
    dynamicRegistry.unregister('garage_space_heater_boost');

    let interruptEventReceived: any = null;

    const onAgentUpdate = (event: any) => {
      if (event.type === 'agent_interrupted') {
        interruptEventReceived = event;
      }
    };

    localBus.on('agent_updates', onAgentUpdate);

    const orchestrator = new AgentOrchestrator({
      provider: new AutonomousToolPlannerProvider(),
      skipDbLogging: true,
    });

    const taskPromise = orchestrator.executeTask(
      'Connect to the high-wattage garage space heater at https://devices.internal/heater and turn on max heat.'
    );

    try {
      // Deterministically wait for interrupt
      await waitForCondition(() => interruptEventReceived !== null, 3000);

      assert.ok(interruptEventReceived, 'Interrupt must be emitted for high wattage heater');
      assert.equal(interruptEventReceived.interrupt.contract.riskClass, 3);

      // Simulate Human User denying the action
      const interruptId = interruptEventReceived.interrupt.interruptId;
      interruptManager.resolveInterrupt(interruptId, 'rejected');

      const summary = await taskPromise;

      // Verify denial was communicated back to the agent and user
      assert.ok(
        summary.includes('denied') || summary.includes('aborted') || summary.includes('blocked'),
        `Summary must state denial: received "${summary}"`
      );

      // Verify tool was not left active in registry
      assert.equal(dynamicRegistry.hasTool('garage_space_heater_boost'), false);
    } finally {
      localBus.off('agent_updates', onAgentUpdate);
    }
  });
});

