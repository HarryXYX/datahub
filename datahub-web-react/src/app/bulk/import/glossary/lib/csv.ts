import Papa from 'papaparse';

// New CSV structure that properly handles nested ownership
export const CSV_HEADERS = [
  'entity_type',
  'urn',
  'name',
  'description',
  'term_source',
  'source_ref',
  'source_url',
  'ownership',
  'parent_nodes',
  'related_contains',
  'related_inherits',
  'domain_urn',
  'domain_name',
  'custom_properties'
];

export interface FlatCsvRow {
  entity_type: string;
  urn: string;
  name: string;
  description: string;
  term_source: string;
  source_ref: string;
  source_url: string;
  ownership: string; // Combined ownership field
  parent_nodes: string;
  related_contains: string;
  related_inherits: string;
  domain_urn: string;
  domain_name: string;
  custom_properties: string;
}

// Helper function to parse ownership string into structured format
export function parseOwnership(ownershipStr: string): Array<{ owner: string; type: string; ownerType: string }> {
  if (!ownershipStr || !ownershipStr.trim()) return [];
  
  return ownershipStr.split(',').map(item => {
    const trimmed = item.trim();
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':').map(s => s.trim());
      if (parts.length >= 3) {
        // New format: owner:type:ownerType
        const [owner, type, ownerType] = parts;
        return { owner, type, ownerType };
      } else if (parts.length === 2) {
        // Legacy format: owner:type (assume CORP_USER)
        const [owner, type] = parts;
        return { owner, type, ownerType: 'CORP_USER' };
      }
    }
    // Fallback: treat as owner with default type
    return { owner: trimmed, type: 'DATAOWNER', ownerType: 'CORP_USER' };
  });
}

// Helper function to format ownership for CSV export
export function formatOwnership(owners: Array<{ owner: string; type: string; ownerType: string }>): string {
  if (!owners || owners.length === 0) return '';
  
  // Join without extra spaces to ensure consistent formatting
  return owners.map(owner => `${owner.owner}:${owner.type}:${owner.ownerType}`).join(',');
}



export function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const result = Papa.parse(text, {
    header: false,
    skipEmptyLines: true,
    transform: (value) => value.trim()
  });

  if (result.errors.length > 0) {
    console.warn('CSV parsing warnings:', result.errors);
  }

  const rows = result.data as string[][];
  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  return { headers, rows: dataRows };
}

export function stringifyCsv(data: FlatCsvRow[]): string {
  if (data.length === 0) {
    return CSV_HEADERS.join(',') + '\n';
  }

  const csvRows = data.map(row => 
    CSV_HEADERS.map(header => {
      const value = row[header as keyof FlatCsvRow] || '';
      // Escape commas and quotes in the value
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );

  return [CSV_HEADERS.join(','), ...csvRows].join('\n');
}

// Utility functions still needed by flatten.ts
export function splitCommaList(cell?: string): string[] {
  if (!cell) return [];
  return cell
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinCommaList(items: string[]): string {
  return items.filter(Boolean).join(", ");
}

export function parsePairs(cell?: string): Array<{ key: string; value: string }> {
  if (!cell) return [];
  return cell
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf("=");
      if (idx === -1) return { key: pair, value: "" };
      const key = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      return { key, value };
    });
}

export function stringifyPairs(pairs: Array<{ key: string; value: string }>): string {
  return pairs
    .filter((p) => p.key)
    .map((p) => `${p.key}=${p.value ?? ""}`)
    .join("; ");
}

export function parseReferencesCell(cell?: string): { termSource?: string; sourceRef?: string; sourceUrl?: string } {
  if (!cell) return {};
  const chunks = cell.split("||").map((s) => s.trim()).filter(Boolean);
  const out: { termSource?: string; sourceRef?: string; sourceUrl?: string } = {};
  for (const c of chunks) {
    const idx = c.indexOf("=");
    if (idx === -1) continue;
    const k = c.slice(0, idx).trim();
    const v = c.slice(idx + 1).trim();
    if (k === "termSource") out.termSource = v;
    else if (k === "sourceRef") out.sourceRef = v;
    else if (k === "sourceUrl") out.sourceUrl = v;
  }
  return out;
}

export function stringifyReferencesCell(refs: { termSource?: string; sourceRef?: string; sourceUrl?: string }): string {
  const parts: string[] = [];
  if (refs.termSource) parts.push(`termSource=${refs.termSource}`);
  if (refs.sourceRef) parts.push(`sourceRef=${refs.sourceRef}`);
  if (refs.sourceUrl) parts.push(`sourceUrl=${refs.sourceUrl}`);
  return parts.join(" || ");
}

export type Status = "Draft" | "Approved" | "Rejected";

export function normalizeStatus(input?: string): Status {
  const s = (input || "").trim().toLowerCase();
  if (s === "approved") return "Approved";
  if (s === "rejected") return "Rejected";
  return "Draft";
}