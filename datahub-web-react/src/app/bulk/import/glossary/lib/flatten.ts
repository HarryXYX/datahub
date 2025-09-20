/**
 * Flattening helpers between GraphQL GlossaryTerm shape and flat CSV rows.
 * Uses the CSV schema defined in csv.ts for Phase E.
 */

import {
  CSV_HEADERS,
  type FlatCsvRow,
  joinCommaList,
  splitCommaList,
  parsePairs,
  stringifyPairs,
  parseReferencesCell,
  stringifyReferencesCell,
  normalizeStatus,
  type Status,
} from "./csv";
import { buildPathId, splitParentPath } from "./id";
import { parseOwnership, formatOwnership } from './csv';

// GraphQL types (simplified)
type GqlGlossaryTerm = any;
type GqlGlossaryNode = any;

/** Our flat row model used by the grid and CSV. */
export type FlatRow = {
  entity_type: string;         // "glossaryTerm" or "glossaryNode"
  urn: string;                 // URN of the glossary entity
  name: string;                // name of the entity
  description: string;         // description
  term_source: string;         // term source (only for terms)
  source_ref: string;          // source reference (only for terms)
  source_url: string;          // source URL (only for terms)
  ownership: string;           // ownership (comma list)
  parent_nodes: string;        // parent nodes (comma list)
  related_contains: string;    // outgoing HasA relationships
  related_inherits: string;    // outgoing IsA relationships
  domain_urn: string;          // domain URN
  domain_name: string;         // domain name
  custom_properties: string;   // custom properties (JSON string)
  status: string;              // status (Draft/Approved/Rejected)
};

/** Convert GraphQL GlossaryTerm → FlatRow */
export function flattenGlossaryTerm(term: GqlGlossaryTerm): FlatRow {
  const props = term.properties || {};
  const parentNodes = (term.parentNodes?.nodes || [])
    .map((node: any) => node.urn)
    .join(', ');
  
  const relatedTerms = (term.relatedTerms?.terms || [])
    .map((term: any) => term.urn)
    .join(', ');

  const ownership = formatOwnership(term.ownership || {});
  
  const domain = term.domain || {};
  const domainUrn = domain.urn || '';
  const domainName = domain.properties?.name || '';

  const customProps = props.customProperties || {};
  const customPropsJson = Object.keys(customProps).length > 0 
    ? JSON.stringify(customProps) 
    : '';

  const row: FlatRow = {
    entity_type: 'glossaryTerm',
    urn: term.urn || '',
    name: props.name || '',
    description: props.description || '',
    term_source: props.termSource || '',
    source_ref: props.sourceRef || '',
    source_url: props.sourceUrl || '',
    ownership,
    parent_nodes: parentNodes,
    related_contains: relatedTerms,
    related_inherits: '', // Terms don't have IsA relationships
    domain_urn: domainUrn,
    domain_name: domainName,
    custom_properties: customPropsJson,
    status: props.status || 'Draft',
  };

  return row;
}

/** Convert GraphQL GlossaryNode → FlatRow */
export function flattenGlossaryNode(node: GqlGlossaryNode): FlatRow {
  const props = node.properties || {};
  
  const parentNodes = (node.parentNodes?.nodes || [])
    .map((node: any) => node.urn)
    .join(', ');

  const ownership = formatOwnership(node.ownership || {});
  
  const domain = node.domain || {};
  const domainUrn = domain.urn || '';
  const domainName = domain.properties?.name || '';

  const customProps = props.customProperties || {};
  const customPropsJson = Object.keys(customProps).length > 0 
    ? JSON.stringify(customProps) 
    : '';

  const row: FlatRow = {
    entity_type: 'glossaryNode',
    urn: node.urn || '',
    name: props.name || '',
    description: props.description || '',
    term_source: '', // Nodes don't have term source
    source_ref: '',  // Nodes don't have source ref
    source_url: '',  // Nodes don't have source URL
    ownership,
    parent_nodes: parentNodes,
    related_contains: '', // Nodes don't have related terms
    related_inherits: '', // Nodes don't have IsA relationships
    domain_urn: domainUrn,
    domain_name: domainName,
    custom_properties: customPropsJson,
    status: props.status || 'Draft',
  };

  return row;
}

/** Create an empty FlatRow for the grid "Add Row" */
export function makeEmptyFlatRow(): FlatRow {
  return {
    entity_type: 'glossaryTerm',
    urn: '',
    name: '',
    description: '',
    term_source: '',
    source_ref: '',
    source_url: '',
    ownership: '',
    parent_nodes: '',
    related_contains: '',
    related_inherits: '',
    domain_urn: '',
    domain_name: '',
    custom_properties: '',
    status: 'Draft',
  };
}

/** Create a CSV row object (string values only) from a FlatRow-like structure */
export function toCsvRow(r: FlatRow): FlatCsvRow {
  return {
    entity_type: r.entity_type,
    urn: r.urn,
    name: r.name,
    description: r.description,
    term_source: r.term_source,
    source_ref: r.source_ref,
    source_url: r.source_url,
    ownership: r.ownership,
    parent_nodes: r.parent_nodes,
    related_contains: r.related_contains,
    related_inherits: r.related_inherits,
    domain_urn: r.domain_urn,
    domain_name: r.domain_name,
    custom_properties: r.custom_properties,
    // Note: status is not included in CSV export as it's internal only
  };
}

/** Convert array of GlossaryTerm entities to CSV rows */
export function flattenTermsToCsvRows(terms: GqlGlossaryTerm[]): FlatCsvRow[] {
  return terms.map(flattenGlossaryTerm).map(toCsvRow);
}

/** Convert array of GlossaryNode entities to CSV rows */
export function flattenNodesToCsvRows(nodes: GqlGlossaryNode[]): FlatCsvRow[] {
  return nodes.map(flattenGlossaryNode).map(toCsvRow);
}

/** Convert mixed entities (terms + nodes) to CSV rows */
export function flattenMixedEntitiesToCsvRows(
  terms: GqlGlossaryTerm[], 
  nodes: GqlGlossaryNode[]
): FlatCsvRow[] {
  return [
    ...flattenTermsToCsvRows(terms),
    ...flattenNodesToCsvRows(nodes)
  ];
}