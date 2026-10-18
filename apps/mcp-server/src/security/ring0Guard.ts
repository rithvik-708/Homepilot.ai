import dns from 'node:dns/promises';

/**
 * Forbidden identifiers that allow host environment breakout or arbitrary code execution.
 */
const FORBIDDEN_IDENTIFIERS = new Set([
  'eval',
  'Function',
  'process',
  'global',
  'globalThis',
  'window',
  'require',
  'import',
  'child_process',
  'fs',
  'net',
  'dgram',
  'cluster',
  'WebAssembly',
]);

/**
 * Forbidden prototype and object traversal properties that facilitate sandbox escape.
 */
const FORBIDDEN_PROPERTIES = new Set(['__proto__', 'prototype', 'constructor']);

/**
 * Strip comments and string literals so identifier detection does not produce false positives on benign prose.
 */
function sanitizeCodeForLexicalScan(code: string): string {
  // Strip block comments /* ... */ and line comments // ...
  const noComments = code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');

  // Strip string literals "...", '...', and `...`
  return noComments
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

/**
 * Validates untrusted script code against Ring 0 AST and Lexical Safety rules.
 * Throws an Error if any forbidden identifier or prototype traversal is discovered.
 */
export function assertSafeAST(code: string): void {
  if (typeof code !== 'string' || code.trim().length === 0) {
    throw new Error('[Ring 0 AST Violation] Code must be a non-empty string.');
  }

  const cleanCode = sanitizeCodeForLexicalScan(code);

  // 1. Check for Prototype Escape Patterns: .constructor, .__proto__, .prototype or ["constructor"]
  for (const prop of FORBIDDEN_PROPERTIES) {
    const dotPattern = new RegExp(`\\.\\s*${prop}\\b`);
    const bracketPattern = new RegExp(`\\[\\s*['"\`]${prop}['"\`]\\s*\\]`);
    if (dotPattern.test(cleanCode) || bracketPattern.test(cleanCode)) {
      throw new Error(`[Ring 0 AST Violation] Forbidden prototype escape '${prop}' detected.`);
    }
  }

  // 2. Check for Forbidden Identifiers
  // Match word boundaries that are not preceded by a dot (e.g. catch standalone 'process', but allow 'myProcess')
  for (const identifier of FORBIDDEN_IDENTIFIERS) {
    const wordPattern = new RegExp(`(?:^|[^a-zA-Z0-9_$.])${identifier}\\b`);
    if (wordPattern.test(cleanCode)) {
      throw new Error(`[Ring 0 AST Violation] Forbidden identifier '${identifier}' detected.`);
    }
  }
}

/**
 * Helper to check if an IPv4 address is in private, loopback, or cloud IMDS ranges.
 */
function isForbiddenIp(ip: string): { forbidden: boolean; reason?: string } {
  const parts = ip.split('.').map(Number);
  if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    const [b0, b1] = parts;

    // Loopback: 127.0.0.0/8
    if (b0 === 127) {
      return { forbidden: true, reason: 'loopback 127.0.0.0/8' };
    }

    // Link-Local / Cloud Metadata: 169.254.0.0/16
    if (b0 === 169 && b1 === 254) {
      if (ip === '169.254.169.254') {
        return { forbidden: true, reason: 'Cloud IMDS metadata endpoint (169.254.169.254)' };
      }
      return { forbidden: true, reason: 'link-local 169.254.0.0/16' };
    }

    // Private Subnets: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    if (b0 === 10) {
      return { forbidden: true, reason: 'private subnet 10.0.0.0/8' };
    }
    if (b0 === 172 && b1 >= 16 && b1 <= 31) {
      return { forbidden: true, reason: 'private subnet 172.16.0.0/12' };
    }
    if (b0 === 192 && b1 === 168) {
      return { forbidden: true, reason: 'private subnet 192.168.0.0/16' };
    }
  }

  // IPv6 Loopback & Link-local checks
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1' || ip.toLowerCase().startsWith('fe80:') || ip.toLowerCase().startsWith('fc00:')) {
    return { forbidden: true, reason: 'forbidden IPv6 address range' };
  }

  return { forbidden: false };
}

/**
 * Asserts that an outgoing network target is permitted by policy and does not target
 * internal networks, loopback addresses, or Cloud metadata services.
 */
export async function assertSafeEgress(
  targetUrl: string,
  allowedDomains: string[],
  skipDnsResolution: boolean = false
): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch (err: any) {
    throw new Error(`[Ring 0 Egress Violation] Invalid URL '${targetUrl}': ${err.message}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // 1. Verify against explicit allowedDomains whitelist
  const domainMatched = allowedDomains.some((d) => {
    const domainLower = d.toLowerCase();
    return hostname === domainLower || hostname.endsWith(`.${domainLower}`);
  });

  if (!domainMatched) {
    throw new Error(`[Ring 0 Egress Violation] Target '${hostname}' is not in declared allowedDomains: [${allowedDomains.join(', ')}].`);
  }

  // 2. Immediate lexical check for loopback/metadata
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    throw new Error(`[Ring 0 SSRF Violation] Target '${hostname}' is forbidden internal loopback.`);
  }
  if (hostname === '169.254.169.254') {
    throw new Error(`[Ring 0 SSRF Violation] Cloud IMDS metadata IP targeted (169.254.169.254).`);
  }

  // Direct IP address check
  const directIpCheck = isForbiddenIp(hostname);
  if (directIpCheck.forbidden) {
    throw new Error(`[Ring 0 SSRF Violation] Direct IP '${hostname}' violates egress policy: ${directIpCheck.reason}.`);
  }

  // 3. DNS Pre-Resolution Check (Prevents DNS rebinding and internal IP targeting)
  if (!skipDnsResolution) {
    try {
      const addresses = await dns.resolve4(hostname);
      for (const resolvedIp of addresses) {
        const check = isForbiddenIp(resolvedIp);
        if (check.forbidden) {
          throw new Error(
            `[Ring 0 SSRF Violation] Domain '${hostname}' resolved to forbidden IP '${resolvedIp}' (${check.reason}).`
          );
        }
      }
    } catch (dnsErr: any) {
      if (dnsErr.message.includes('Ring 0 SSRF Violation')) {
        throw dnsErr;
      }
      // If DNS resolution fails, reject connection securely
      throw new Error(`[Ring 0 Egress Violation] DNS resolution failed for '${hostname}': ${dnsErr.message}`);
    }
  }
}

/**
 * Deterministic Shell Invariant Validator (Ring 0)
 * Evaluates candidate shell/bash commands and unconditionally rejects corruptive,
 * catastrophic, or exfiltration-oriented shell patterns.
 */
export function assertSafeShellCommand(command: string): void {
  if (typeof command !== 'string' || command.trim().length === 0) {
    throw new Error('[Ring 0 Shell Violation] Command must be a non-empty string.');
  }

  const normalized = command.trim();

  // 1. Catastrophic Filesystem Destruction (rm -rf /, rm -r -f, rm --no-preserve-root)
  const hasRm = /\brm\b/.test(normalized);
  const hasRecursive = /(-[a-zA-Z]*r|--recursive)/i.test(normalized);
  const hasForce = /(-[a-zA-Z]*f|--force)/i.test(normalized);
  const hasTargetRoot = /(\s|^)(\/|~|\/\*)/.test(normalized);
  const hasNoPreserve = /--no-preserve-root/.test(normalized);

  if ((hasRm && hasRecursive && (hasTargetRoot || hasForce)) || (hasRm && hasNoPreserve)) {
    throw new Error('[Ring 0 Shell Violation] Catastrophic filesystem deletion command detected: rm -rf root.');
  }

  // 2. Block Device Destruction (mkfs, dd to raw disk, redirection to /dev/sdX)
  if (/\bmkfs(\.[a-zA-Z0-9]+)?\b/.test(normalized)) {
    throw new Error('[Ring 0 Shell Violation] Filesystem format command detected (mkfs).');
  }
  if (/\bdd\s+.*of=\/dev\/(sd[a-z]|nvme[0-9]n[0-9]|vd[a-z]|zero|null)/.test(normalized)) {
    throw new Error('[Ring 0 Shell Violation] Raw block device overwrite command detected (dd).');
  }
  if (/>\s*\/dev\/(sd[a-z]|nvme[0-9]n[0-9]|vd[a-z])/.test(normalized)) {
    throw new Error('[Ring 0 Shell Violation] Direct block device overwrite detected.');
  }

  // 3. Fork Bombs
  if (/:\(\)\s*\{\s*:\|\s*:\s*&\s*\};:/.test(normalized) || /\.\(\)\s*\{\s*\.\|\s*\.\s*&\s*\};\.|\b(fork\s+bomb)\b/.test(normalized)) {
    throw new Error('[Ring 0 Shell Violation] Denial-of-service fork bomb detected.');
  }

  // 4. Catastrophic Permission / Ownership Erasure
  if (/\bchmod\s+(-R\s+)?(777|000)\s+(\/|~\/|\/\*)/.test(normalized)) {
    throw new Error('[Ring 0 Shell Violation] Catastrophic permission alteration on root directory detected.');
  }
  if (/\bchown\s+-R\s+.*(\/|\/\*)/.test(normalized)) {
    throw new Error('[Ring 0 Shell Violation] Catastrophic ownership takeover on root directory detected.');
  }

  // 5. Reverse Shells & Pipe-to-Shell Remote Exploits
  if (/\/dev\/tcp\/|\/dev\/udp\//.test(normalized)) {
    throw new Error('[Ring 0 Shell Violation] Network socket redirection / reverse shell detected.');
  }
  if (/\b(curl|wget)\b.*\|\s*(ba)?sh\b/.test(normalized)) {
    throw new Error('[Ring 0 Shell Violation] Pipe-to-shell remote code download detected.');
  }
  if (/\b(curl|wget)\b.*(--data|-d\s+@)|(\/etc\/(shadow|passwd|sudoers))/.test(normalized)) {
    throw new Error('[Ring 0 Shell Violation] System credential exfiltration command detected.');
  }
}


