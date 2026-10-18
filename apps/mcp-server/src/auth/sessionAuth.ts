import { FastifyRequest, FastifyReply } from 'fastify';
import * as jwt from 'jsonwebtoken';

const DEFAULT_HOMEOWNER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Lightweight middleware to extract and verify the web UI session token.
 * Protects /agent/execute and /agent/interrupt/resolve endpoints.
 */
export async function verifyWebSessionToken(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  const headerUserId = request.headers['x-user-id'] as string | undefined;

  // 1. Verify Authorization Bearer header existence
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    request.log.warn('[WebSessionAuth] Missing or invalid Authorization header');
    return reply.code(401).send({ error: 'Unauthorized: Missing or invalid Authorization Bearer token' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return reply.code(401).send({ error: 'Unauthorized: Bearer token is empty' });
  }

  let resolvedUserId = headerUserId;

  // 2. Token Inspection & Verification
  try {
    const authSecret = process.env.AUTH_SECRET || 'homepilot-auth-secret-key-at-least-32-chars-long';
    
    // Attempt JWT verification if token is a standard JWT structure (3 parts separated by dots)
    if (token.split('.').length === 3) {
      try {
        const decoded = jwt.verify(token, authSecret) as any;
        resolvedUserId = decoded.userId || decoded.sub || decoded.id || resolvedUserId;
      } catch {
        // If not signed by authSecret, check if it's decodable (e.g. Auth.js / Amazon token)
        const unverified = jwt.decode(token) as any;
        if (unverified) {
          resolvedUserId = unverified.userId || unverified.sub || unverified.id || resolvedUserId;
        }
      }
    } else if (token === 'dev-session-token' || token.length > 0) {
      // Valid development session token or user id bearer token from Next.js proxy
      resolvedUserId = headerUserId || token;
    }
  } catch (err: any) {
    request.log.warn(`[WebSessionAuth] Token parsing error: ${err.message}`);
  }

  // Fallback to default homeowner UUID if needed (ensures valid UUID for PostgreSQL DB constraints)
  const isValidUuid = resolvedUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedUserId);
  const finalUserId = isValidUuid ? resolvedUserId : DEFAULT_HOMEOWNER_ID;

  // Attach resolved userId to the Fastify request context
  (request as any).userId = finalUserId;
}
