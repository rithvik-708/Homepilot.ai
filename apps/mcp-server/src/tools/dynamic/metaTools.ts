import { assertSafeAST } from '../../security/ring0Guard.js';
import { ring1Classifier } from '../../security/ring1Classifier.js';
import { generateConsequenceContract } from '../../security/ring2Contract.js';
import { dynamicRegistry } from './registry.js';
import { runDeclarativeHttp, runSandboxedScript } from './dualEngineRunner.js';
import { publishAgentEvent } from '../../pubsub/redis.js';

export interface MetaToolCreateInput {
  name: string;
  description: string;
  inputSchema: any;
  runtime: 'declarative_http' | 'isolated_vm';
  codeDefinition: any;
  allowedDomains: string[];
  runId?: string;
}

export interface MetaToolTestInput {
  runtime: 'declarative_http' | 'isolated_vm';
  codeDefinition: any;
  testInput: any;
  allowedDomains: string[];
}

export async function handleMetaToolCreate(input: MetaToolCreateInput): Promise<any> {
  // Input validity checks (SWE Principle)
  if (!input.name || typeof input.name !== 'string') {
    throw new Error('Tool name is required and must be a string.');
  }
  if (!input.description || typeof input.description !== 'string') {
    throw new Error('Tool description is required and must be a string.');
  }
  if (!input.allowedDomains || !Array.isArray(input.allowedDomains)) {
    throw new Error('allowedDomains must be an array of strings.');
  }

  // 1. Ring 0 Deterministic AST Check for scripts
  if (input.runtime === 'isolated_vm') {
    assertSafeAST(input.codeDefinition?.script || '');
  }

  // 2. Ring 1 Edge Classification
  const verdict = await ring1Classifier.evaluate({
    name: input.name,
    description: input.description,
    targetUrl: input.codeDefinition?.urlTemplate,
  });

  if (!verdict.isSafe) {
    throw new Error(`[Security Control Plane] Tool rejected by security classifier: ${verdict.reason}`);
  }

  const toolRecord = {
    name: input.name,
    description: input.description,
    inputSchema: input.inputSchema || { type: 'object', properties: {} },
    runtime: input.runtime,
    codeDefinition: input.codeDefinition,
    allowedDomains: input.allowedDomains,
    riskClass: verdict.riskClass,
    status: verdict.requiresHITL ? ('pending_approval' as const) : ('active' as const),
  };

  // 3. Branching: Auto-Approve vs. Plain-Language HITL Contract
  if (verdict.requiresHITL) {
    const contract = generateConsequenceContract({
      name: input.name,
      description: input.description,
      riskClass: verdict.riskClass,
      allowedDomains: input.allowedDomains,
    });

    dynamicRegistry.register(toolRecord);

    publishAgentEvent({
      type: 'tool_approval_required',
      toolName: input.name,
      contract,
      timestamp: new Date().toISOString(),
    });

    return {
      status: 'awaiting_human_approval',
      name: input.name,
      contract,
      message: 'Tool requires physical security authorization from homeowner before activation.',
    };
  }

  // Auto-approved low risk tool
  dynamicRegistry.register(toolRecord);
  publishAgentEvent({
    type: 'tool_auto_approved',
    toolName: toolRecord.name,
    riskClass: toolRecord.riskClass,
    timestamp: new Date().toISOString(),
  });
  return {
    status: 'registered',
    name: toolRecord.name,
    riskClass: toolRecord.riskClass,
  };
}

export async function handleMetaToolTest(
  input: MetaToolTestInput,
  skipDnsResolution: boolean = false
): Promise<any> {
  const startTime = Date.now();

  try {
    if (input.runtime === 'isolated_vm') {
      assertSafeAST(input.codeDefinition?.script || '');
      const result = await runSandboxedScript(
        input.codeDefinition.script,
        input.testInput || {},
        2000,
        64
      );
      return {
        status: 'success',
        latencyMs: Date.now() - startTime,
        result,
      };
    } else {
      const result = await runDeclarativeHttp(
        input.codeDefinition,
        input.testInput || {},
        input.allowedDomains || [],
        skipDnsResolution
      );
      return {
        status: 'success',
        latencyMs: Date.now() - startTime,
        result,
      };
    }
  } catch (err: any) {
    return {
      status: 'error',
      latencyMs: Date.now() - startTime,
      error: err.message,
    };
  }
}

export async function handleMetaToolDelete(name: string): Promise<any> {
  const deleted = dynamicRegistry.unregister(name);
  return {
    status: deleted ? 'deleted' : 'not_found',
    name,
  };
}

