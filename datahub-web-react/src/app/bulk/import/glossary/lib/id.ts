/**
 * ID/path normalization utilities for Glossary Terms (DataHub).
 *
 * Rules:
 * - Periods (.) are separators BETWEEN components; remove them from raw names.
 * - For each component (node/term):
 *    • spaces -> hyphens
 *    • remove special chars (keep A–Z a–z 0–9 -)
 *    • preserve case
 *    • collapse multiple hyphens; trim leading/trailing hyphens
 * - Join cleaned components with '.' to form the path-based ID.
 * - Do NOT generate GUIDs; if no URN is provided, DataHub GraphQL will assign one.
 * - Existing URNs/IDs are immutable and must not be rewritten.
 */

export type RawPathInput =
  | string[]                // already split components
  | string;                 // UI path like "Finance > Customer" or "Finance/Customer"

/** Remove periods from the raw string (since '.' is a path separator) */
function stripPeriods(s: string): string {
  return s.replaceAll('.', '');
}

/** Collapse multiple hyphens and trim leading/trailing hyphens */
function normalizeHyphens(s: string): string {
  return s.replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/** Clean a single component per rules; preserves case */
export function cleanComponent(raw: string): string {
  if (!raw) return '';
  // 1) strip periods
  let s = stripPeriods(String(raw));

  // 2) spaces -> hyphens
  s = s.replace(/\s+/g, '-');

  // 3) remove special characters (allow A-Z a-z 0-9 -)
  s = s.replace(/[^A-Za-z0-9-]/g, '');

  // 4) normalize hyphens
  s = normalizeHyphens(s);

  return s;
}

/**
 * Split a UI parent path string into components.
 * Accepts delimiters like '>', '/', '|' or '→'. You can add more as needed.
 * Trims whitespace around components and drops empties.
 */
export function splitParentPath(input: RawPathInput): string[] {
  if (Array.isArray(input)) return input.filter(Boolean);
  if (!input) return [];
  const s = String(input).trim();
  if (!s) return [];
  // common delimiters users might paste from UI
  return s
    .split(/\s*(?:>|\/|→|\|)\s*/g)
    .map((c) => c.trim())
    .filter(Boolean);
}

/**
 * Build a canonical path-based ID from raw components.
 * - Cleans each component independently.
 * - Drops empty components after cleaning.
 * - Joins with '.' (case preserved).
 */
export function buildPathId(components: RawPathInput): string {
  const parts = Array.isArray(components) ? components : splitParentPath(components);
  const cleaned = parts.map(cleanComponent).filter(Boolean);
  return cleaned.join('.');
}

/**
 * Convenience: Build a candidate ID from Parent path + Name.
 * - parentPath: e.g., "Finance > Customer" OR ["Finance", "Customer"]
 * - name: term name (raw)
 */
export function buildCandidateId(parentPath: RawPathInput, name: string): string {
  const parent = Array.isArray(parentPath) ? parentPath : splitParentPath(parentPath);
  const full = [...parent, name ?? ''];
  return buildPathId(full);
}

/**
 * Compare a provided ID (path-like) with a freshly built candidate from components.
 * Returns true if they match exactly.
 * NOTE: This is ONLY for path-based IDs. If you have a URN, prefer URN equality instead.
 */
export function idEqualsCandidate(providedId: string, parentPath: RawPathInput, name: string): boolean {
  if (!providedId) return false;
  const candidate = buildCandidateId(parentPath, name);
  return providedId === candidate;
}

/**
 * Heuristic: is the string a URN (very loose check for DataHub-style URNs)?
 * If true, you should NOT re-compute/overwrite — use existing URN for writes.
 */
export function looksLikeUrn(s?: string): boolean {
  if (!s) return false;
  return /^urn:li:[a-zA-Z0-9]+:/.test(s);
}

/** Tiny helpers you may find handy in the preview grid */

export function isEmptyString(v: unknown): boolean {
  return typeof v === 'string' ? v.trim().length === 0 : v == null;
}

/** Safe join for CSV display (skips empties) */
export function joinCsv(values: Array<string | undefined | null>, sep = ', '): string {
  return values.filter((v) => !!(v && String(v).trim())).join(sep);
}

/** Example usage:
 *
 * const parent = "Finance > Customer";
 * const name = "Physical Address";
 * const id = buildCandidateId(parent, name);
 * // "Finance.Customer.Physical-Address"
 *
 * idEqualsCandidate("Finance.Customer.Physical-Address", parent, name)  // true
 * looksLikeUrn("urn:li:glossaryTerm:abc123")                            // true
 */