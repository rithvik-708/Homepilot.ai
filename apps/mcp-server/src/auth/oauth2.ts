import { FastifyRequest, FastifyReply } from 'fastify';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Setup JWKS client to fetch Amazon's public keys for token verification
const client = jwksClient({
  jwksUri: 'https://api.amazon.com/auth/o2/certs'
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, function(err, key) {
    if (err || !key) return callback(err || new Error("Signing key not found"));
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export async function verifyAlexaOAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify the JWT asynchronously using Amazon's JWKS
    await new Promise((resolve, reject) => {
      jwt.verify(token, getKey, {
        algorithms: ['RS256'],
        issuer: 'https://alexa.amazon.com'
      }, (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    });
    
    // Token is valid; request proceeds to MCP handler
  } catch (error) {
    request.log.warn(`[OAuth2.1] Token verification failed: ${error}`);
    return reply.code(403).send({ error: "Forbidden: Invalid PKCE Token Signature" });
  }
}
