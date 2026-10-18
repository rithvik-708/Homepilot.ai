export interface ConsequenceContract {
  plainTitle: string;
  consequenceSummary: string;
  safetyRules: string[];
  riskClass: number;
  capabilityToken: string;
}

export interface AgentInterrupt {
  interruptId: string;
  runId: string;
  type: 'tool_clearance_required' | 'confirmation_required' | 'input_required';
  toolName: string;
  toolCallId: string;
  contract?: ConsequenceContract;
  payload?: Record<string, any>;
  timestamp: string;
  status: 'pending' | 'resolved' | 'rejected' | 'timeout';
  decidedBy?: string;
}

interface PendingInterruptEntry {
  interrupt: AgentInterrupt;
  resolve: (decision: 'approved' | 'rejected') => void;
  timer: NodeJS.Timeout;
}

export class InterruptManager {
  private static instance: InterruptManager;
  private pending = new Map<string, PendingInterruptEntry>();

  private constructor() {}

  public static getInstance(): InterruptManager {
    if (!InterruptManager.instance) {
      InterruptManager.instance = new InterruptManager();
    }
    return InterruptManager.instance;
  }

  /**
   * Registers a new interrupt requiring human-in-the-loop authorization.
   * Enforces a fail-secure timeout (default: 120s) that resolves to 'rejected' upon expiration.
   */
  public createInterrupt(params: {
    runId: string;
    toolName: string;
    toolCallId: string;
    contract?: ConsequenceContract;
    payload?: Record<string, any>;
    type?: 'tool_clearance_required' | 'confirmation_required' | 'input_required';
    timeoutMs?: number;
  }): { interrupt: AgentInterrupt; promise: Promise<'approved' | 'rejected'> } {
    const interruptId = `int_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timeoutMs = params.timeoutMs || 120000;

    const interrupt: AgentInterrupt = {
      interruptId,
      runId: params.runId,
      type: params.type || 'tool_clearance_required',
      toolName: params.toolName,
      toolCallId: params.toolCallId,
      contract: params.contract,
      payload: params.payload,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    let resolver: (decision: 'approved' | 'rejected') => void;
    const promise = new Promise<'approved' | 'rejected'>((resolve) => {
      resolver = resolve;
    });

    const timer = setTimeout(() => {
      console.warn(`[InterruptManager] Interrupt ${interruptId} timed out after ${timeoutMs}ms. Failing secure to 'rejected'.`);
      interrupt.status = 'timeout';
      this.pending.delete(interruptId);
      resolver('rejected');
    }, timeoutMs);

    // Prevent active timer from holding open test runner process if unref is available
    if (timer.unref) {
      timer.unref();
    }

    this.pending.set(interruptId, {
      interrupt,
      resolve: resolver!,
      timer,
    });

    return { interrupt, promise };
  }

  /**
   * Resolves a pending interrupt with human decision ('approved' | 'rejected') and optional decidedBy userId.
   */
  public resolveInterrupt(interruptId: string, decision: 'approved' | 'rejected', userId?: string): boolean {
    const entry = this.pending.get(interruptId);
    if (!entry) {
      return false;
    }

    clearTimeout(entry.timer);
    entry.interrupt.status = decision === 'approved' ? 'resolved' : 'rejected';
    if (userId) {
      entry.interrupt.decidedBy = userId;
    }
    this.pending.delete(interruptId);
    entry.resolve(decision);
    return true;
  }

  public getInterrupt(interruptId: string): AgentInterrupt | undefined {
    return this.pending.get(interruptId)?.interrupt;
  }

  public getPendingInterrupts(): AgentInterrupt[] {
    return Array.from(this.pending.values()).map((e) => e.interrupt);
  }

  public clear(): void {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.resolve('rejected');
    }
    this.pending.clear();
  }
}

export const interruptManager = InterruptManager.getInstance();

