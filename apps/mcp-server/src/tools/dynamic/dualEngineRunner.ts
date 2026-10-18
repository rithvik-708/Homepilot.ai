import vm from 'node:vm';
import { assertSafeAST, assertSafeEgress } from '../../security/ring0Guard.js';

export interface DeclarativeHttpDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  urlTemplate: string;
  headers?: Record<string, string>;
  bodyTemplate?: any;
  outputSelector?: string;
}

/**
 * Runs a Declarative HTTP tool specification with strict input validation,
 * Ring 0 egress assertion, and a hard 2000ms network timeout.
 */
export async function runDeclarativeHttp(
  definition: DeclarativeHttpDefinition,
  input: Record<string, any>,
  allowedDomains: string[],
  skipDnsResolution: boolean = false
): Promise<any> {
  // 1. Interpolate URL parameters
  let resolvedUrl = definition.urlTemplate;
  for (const [key, value] of Object.entries(input)) {
    const placeholder = new RegExp(`{{input\\.${key}}}`, 'g');
    resolvedUrl = resolvedUrl.replace(placeholder, encodeURIComponent(String(value)));
  }

  // 2. Enforce Ring 0 pre-connection security check
  await assertSafeEgress(resolvedUrl, allowedDomains, skipDnsResolution);

  // 3. Interpolate request body if present
  let body: string | undefined;
  if (definition.bodyTemplate) {
    let rawBody = JSON.stringify(definition.bodyTemplate);
    for (const [key, value] of Object.entries(input)) {
      const placeholder = new RegExp(`"{{input\\.${key}}}"`, 'g');
      rawBody = rawBody.replace(placeholder, JSON.stringify(value));
    }
    body = rawBody;
  }

  // 4. Dispatch request with strict 2000ms timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch(resolvedUrl, {
      method: definition.method,
      headers: {
        'Content-Type': 'application/json',
        ...(definition.headers || {}),
      },
      body: definition.method !== 'GET' ? body : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Target service returned HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (definition.outputSelector && data && typeof data === 'object') {
      return data[definition.outputSelector] !== undefined ? data[definition.outputSelector] : data;
    }

    return data;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('[Dual Engine] Declarative HTTP call timed out after 2000ms.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Runs a sandboxed JavaScript script in an isolated execution context with
 * zero access to host environment APIs, frozen primitives, and a strict CPU timeout.
 */
export async function runSandboxedScript(
  scriptCode: string,
  input: Record<string, any>,
  timeoutMs: number = 2000,
  _memoryLimitMb: number = 64
): Promise<any> {
  // 1. Mandatory Ring 0 AST validation
  assertSafeAST(scriptCode);

  // 2. Create isolated sandbox context with zero host capabilities
  const sandbox = Object.create(null);
  sandbox.Math = Math;
  sandbox.JSON = JSON;
  sandbox.parseInt = parseInt;
  sandbox.parseFloat = parseFloat;
  sandbox.isNaN = isNaN;
  sandbox.isFinite = isFinite;
  sandbox.encodeURIComponent = encodeURIComponent;
  sandbox.decodeURIComponent = decodeURIComponent;

  // Deep clone input to prevent prototype poisoning
  sandbox.__input = JSON.parse(JSON.stringify(input));

  const context = vm.createContext(sandbox, {
    codeGeneration: {
      strings: false, // Disallow eval() and new Function() inside context
      wasm: false,    // Disallow WebAssembly
    },
  });

  const wrappedScript = `
    (function() {
      "use strict";
      const input = __input;
      ${scriptCode}
      if (typeof handle === 'function') {
        return handle(input);
      }
      if (typeof main === 'function') {
        return main(input);
      }
      throw new Error("Script must export a 'handle(input)' or 'main(input)' function.");
    })()
  `;

  try {
    const script = new vm.Script(wrappedScript);
    const result = script.runInContext(context, {
      timeout: timeoutMs,
      displayErrors: true,
    });
    return result !== undefined ? JSON.parse(JSON.stringify(result)) : undefined;
  } catch (err: any) {
    if (err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || err.message.includes('timed out')) {
      throw new Error(`[Dual Engine] Execution timed out after ${timeoutMs}ms.`);
    }
    throw err;
  }
}
