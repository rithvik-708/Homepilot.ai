import { MCP_TOOLS } from '../../schemas/tools.js';
import { runDeclarativeHttp, runSandboxedScript } from './dualEngineRunner.js';

export interface DynamicToolRecord {
  id?: string;
  name: string;
  description: string;
  inputSchema: any;
  runtime: 'declarative_http' | 'isolated_vm';
  codeDefinition: any;
  allowedDomains: string[];
  riskClass: number;
  status: 'draft' | 'testing' | 'pending_approval' | 'active' | 'deprecated';
  version?: number;
  capabilityToken?: string;
}

export class DynamicToolRegistry {
  private cache = new Map<string, DynamicToolRecord>();
  private initialized = false;

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
  }

  public getActiveTools(): any[] {
    const dynamicList = Array.from(this.cache.values())
      .filter((t) => t.status === 'active')
      .map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      }));

    return [...MCP_TOOLS, ...dynamicList];
  }

  public hasTool(name: string): boolean {
    return this.cache.has(name);
  }

  public getTool(name: string): DynamicToolRecord | undefined {
    return this.cache.get(name);
  }

  public register(record: DynamicToolRecord): void {
    this.cache.set(record.name, record);
  }

  public unregister(name: string): boolean {
    return this.cache.delete(name);
  }

  public async execute(name: string, input: any): Promise<any> {
    const tool = this.cache.get(name);
    if (!tool) {
      throw new Error(`Dynamic tool '${name}' not found.`);
    }

    if (tool.status !== 'active') {
      throw new Error(`Dynamic tool '${name}' is not active (current status: '${tool.status}').`);
    }

    if (tool.runtime === 'declarative_http') {
      return await runDeclarativeHttp(tool.codeDefinition, input, tool.allowedDomains);
    } else if (tool.runtime === 'isolated_vm') {
      return await runSandboxedScript(tool.codeDefinition.script, input);
    }

    throw new Error(`Unsupported runtime '${tool.runtime}' for tool '${name}'.`);
  }
}

export const dynamicRegistry = new DynamicToolRegistry();

