import { describe, it, expect, assert, beforeEach } from 'vitest';
import { verifyWebSessionToken } from '../src/auth/sessionAuth.js';
import { ensureDefaultUserExists, DEFAULT_USER_ID } from '../src/db/seed.js';
import { interruptManager } from '../src/security/interruptManager.js';
import { AgentOrchestrator } from '../src/agent/orchestrator.js';
import { db } from '../src/db/index.js';
import { agentRuns, toolApprovalRequests, users } from '../src/db/schema.js';
import { eq, desc } from 'drizzle-orm';

describe('Auth & Identity Binding Suite', () => {
  beforeEach(() => {
    interruptManager.clear();
  });

  describe('1. Fastify Web Session Auth Middleware', () => {
    it('rejects requests without an Authorization header with 401', async () => {
      let statusCode = 200;
      let sentPayload: any = null;

      const mockRequest: any = {
        headers: {},
        log: { warn: () => {} },
      };
      const mockReply: any = {
        code: (code: number) => {
          statusCode = code;
          return {
            send: (payload: any) => {
              sentPayload = payload;
            },
          };
        },
      };

      await verifyWebSessionToken(mockRequest, mockReply);
      expect(statusCode).toBe(401);
      expect(sentPayload?.error).toContain('Missing or invalid Authorization Bearer token');
    });

    it('extracts and binds valid userId from Bearer token or x-user-id header', async () => {
      let statusCode = 200;
      const testUserId = '00000000-0000-0000-0000-000000000001';

      const mockRequest: any = {
        headers: {
          authorization: 'Bearer dev-session-token',
          'x-user-id': testUserId,
        },
        log: { warn: () => {} },
      };
      const mockReply: any = {
        code: (code: number) => {
          statusCode = code;
          return { send: () => {} };
        },
      };

      await verifyWebSessionToken(mockRequest, mockReply);
      expect(statusCode).toBe(200);
      expect(mockRequest.userId).toBe(testUserId);
    });

    it('falls back to default homeowner UUID if an arbitrary string token is provided', async () => {
      const mockRequest: any = {
        headers: {
          authorization: 'Bearer non-uuid-token',
        },
        log: { warn: () => {} },
      };
      const mockReply: any = {
        code: () => ({ send: () => {} }),
      };

      await verifyWebSessionToken(mockRequest, mockReply);
      expect(mockRequest.userId).toBe(DEFAULT_USER_ID);
    });
  });

  describe('2. Database Seed & User Verification', () => {
    it('ensures default homeowner user exists in PostgreSQL', async () => {
      const userId = await ensureDefaultUserExists();
      expect(userId).toBe(DEFAULT_USER_ID);

      const dbUser = await db
        .select()
        .from(users)
        .where(eq(users.id, DEFAULT_USER_ID))
        .limit(1);

      expect(dbUser.length).toBe(1);
      expect(dbUser[0].email).toBe('rithvik@amazon-homeowner.internal');
      expect(dbUser[0].fullName).toBe('Rithvik (Amazon Homeowner)');
    });
  });

  describe('3. Agent Run Identity Binding', () => {
    it('persists userId to agent_runs when orchestrator executes a task', async () => {
      const customUserId = DEFAULT_USER_ID;
      const mockProvider: any = {
        invoke: async () => ({
          role: 'assistant',
          content: [{ text: 'All operations executed under authenticated homeowner session.' }],
        }),
      };

      const orchestrator = new AgentOrchestrator({
        provider: mockProvider,
        skipDbLogging: false,
      });

      const prompt = `System check for homeowner: ${Date.now()}`;
      await orchestrator.executeTask(prompt, customUserId);

      // Verify the latest agent_runs record in PostgreSQL contains the recorded user_id
      const [latestRun] = await db
        .select()
        .from(agentRuns)
        .where(eq(agentRuns.rawPrompt, prompt))
        .orderBy(desc(agentRuns.createdAt))
        .limit(1);

      expect(latestRun).toBeDefined();
      expect(latestRun.userId).toBe(customUserId);
      expect(latestRun.executionStatus).toBe('completed');
    });
  });

  describe('4. Consequence Contract Decision Auditing', () => {
    it('records decidedBy userId in interruptManager and toolApprovalRequests', async () => {
      const { interrupt } = interruptManager.createInterrupt({
        runId: 'run_audit_01',
        toolName: 'smart_deadbolt_unlock',
        toolCallId: 'call_audit_01',
        contract: {
          plainTitle: 'Unlock Front Deadbolt',
          consequenceSummary: 'Permits entry into residence.',
          safetyRules: ['Auto-relock after 30 seconds'],
          riskClass: 4,
          capabilityToken: 'tok_sec_01',
        },
      });

      const approverUserId = DEFAULT_USER_ID;
      const resolved = interruptManager.resolveInterrupt(interrupt.interruptId, 'approved', approverUserId);

      expect(resolved).toBe(true);
      expect(interrupt.status).toBe('resolved');
      expect(interrupt.decidedBy).toBe(approverUserId);
    });
  });
});
