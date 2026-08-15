// A lightweight, heuristic pattern scanner - NOT a real antivirus or
// malware scanner, and it doesn't block anything. It flags a short
// list of high-signal patterns (private key blocks, likely hardcoded
// cloud credentials, a couple of classic obfuscated-payload shapes) so
// a user gets a heads-up before committing something like a leaked
// secret. Every hit is "worth a second look", not a verdict - both
// false positives and false negatives are expected.

const PATTERNS = [
  { name: "private key block", re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "AWS access key ID", re: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    name: "likely hardcoded secret",
    re: /(secret|api[_-]?key|password|token)\s*[:=]\s*["'][A-Za-z0-9/+_=-]{20,}["']/i,
  },
  { name: "obfuscated eval of decoded content", re: /eval\s*\(\s*(atob|Buffer\.from)\s*\(/ },
];

/** Returns a short warning string for the first pattern that matches, or null. */
export function scanForRiskyPatterns(text) {
  if (!text || text.length > 2_000_000) return null; // skip huge files - not worth scanning
  for (const { name, re } of PATTERNS) {
    if (re.test(text)) return `looks like it may contain a ${name} - double check before pushing`;
  }
  return null;
}
