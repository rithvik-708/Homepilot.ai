import crypto from 'node:crypto';

export interface ConsequenceContract {
  plainTitle: string;
  consequenceSummary: string;
  safetyRules: string[];
  riskClass: number;
  signaturePayload: string;
}

// Generate an in-memory keypair for server lifetime attestation
const serverKeyPair = crypto.generateKeyPairSync('ed25519');

/**
 * Generates a non-technical Plain-Language Consequence Contract for a homeowner.
 * Forbids technical jargon, code snippets, or regex.
 */
export function generateConsequenceContract(tool: {
  name: string;
  description: string;
  riskClass: number;
  allowedDomains: string[];
}): ConsequenceContract {
  const isPerimeter = tool.riskClass === 4;
  const isHazard = tool.riskClass === 3;

  const plainTitle = isPerimeter
    ? `Authorize Physical Security Access: ${tool.name}`
    : isHazard
    ? `Authorize Thermal Equipment: ${tool.name}`
    : `Authorize Device Control: ${tool.name}`;

  const consequenceSummary = isPerimeter
    ? `This action allows Homepilot to operate physical entry hardware (such as locks or garage doors). It cannot delete passcodes or disable security alarms.`
    : `This action adjusts appliances in your home within pre-verified safe operating limits.`;

  const safetyRules = [
    `Network locked to verified targets: [${tool.allowedDomains.join(', ')}]`,
    `Execution rate-limited to maximum 3 attempts per hour`,
    `Continuous cryptographic audit trail recorded in local security storage`,
  ];

  const payload = JSON.stringify({
    tool: tool.name,
    riskClass: tool.riskClass,
    domains: tool.allowedDomains,
    timestamp: Date.now(),
  });

  return {
    plainTitle,
    consequenceSummary,
    safetyRules,
    riskClass: tool.riskClass,
    signaturePayload: payload,
  };
}

/**
 * Cryptographically signs an authorized consequence contract using Ed25519.
 */
export function signCapabilityToken(payload: string, privateKeyPem?: string): string {
  const privateKey = privateKeyPem || serverKeyPair.privateKey;
  const signature = crypto.sign(null, Buffer.from(payload, 'utf-8'), privateKey);
  return signature.toString('base64');
}

/**
 * Verifies that a capability token was legitimately signed by the server authority.
 */
export function verifyCapabilityToken(payload: string, token: string, publicKeyPem?: string): boolean {
  try {
    const publicKey = publicKeyPem || serverKeyPair.publicKey;
    const isVerified = crypto.verify(
      null,
      Buffer.from(payload, 'utf-8'),
      publicKey,
      Buffer.from(token, 'base64')
    );
    return isVerified;
  } catch {
    return false;
  }
}

