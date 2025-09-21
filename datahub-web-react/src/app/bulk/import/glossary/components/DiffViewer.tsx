import React, { useState, useEffect } from 'react';
import { Modal, Table, Tag, Typography, Space, Divider, Spin } from 'antd';
import { EditOutlined, MinusCircleOutlined, PlusCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { flattenExistingEntityForComparison } from '../lib/flatten';
import { type FlatCsvRow } from '../lib/csv';

const { Text, Title } = Typography;

interface DiffViewerProps {
  existingEntity: any;
  importedRow: FlatCsvRow;
  isVisible: boolean;
  onClose: () => void;
}

interface FieldDiff {
  field: string;
  existing: string;
  imported: string;
  hasChanged: boolean;
  isTermSpecific?: boolean;
  isLoading?: boolean;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  existingEntity,
  importedRow,
  isVisible,
  onClose
}) => {
  // No need to fetch relationships separately - they're now included in the enhanced query
  const [relationshipData, setRelationshipData] = useState<any>(null);

  // Extract relationship data from the existing entity (which now includes relationships)
  useEffect(() => {
    if (existingEntity && isVisible) {
      setRelationshipData(existingEntity);
    }
  }, [existingEntity, isVisible]);

  // Reset relationship data when modal closes
  useEffect(() => {
    if (!isVisible) {
      setRelationshipData(null);
    }
  }, [isVisible]);

  if (!isVisible || !existingEntity) {
    return null;
  }

  // Convert existing entity to CSV format using the same logic as export
  const existingAsCsv = flattenExistingEntityForComparison(existingEntity);
  
  // Helper function to normalize strings for comparison
  const normalizeString = (str: string | null | undefined): string => {
    if (str === null || str === undefined) return '';
    // Remove extra spaces around commas and normalize whitespace
    return str.trim().replace(/\s*,\s*/g, ',');
  };

  // Helper function to format relationships for display
  const formatRelationships = (relationships: any[]): string => {
    if (!relationships || relationships.length === 0) return '';
    return relationships
      .map((rel: any) => {
        // Build hierarchical path from parentNodes + entity name
        // The hierarchicalName field often returns URN instead of actual path
        if (rel.entity?.parentNodes?.nodes && rel.entity?.properties?.name) {
          const parentPath = rel.entity.parentNodes.nodes
            .map((n: any) => n?.properties?.name)
            .filter(Boolean)
            .join('.');
          return parentPath ? `${parentPath}.${rel.entity.properties.name}` : rel.entity.properties.name;
        }
        // Fallback to just the entity name if no parent nodes
        return rel.entity?.properties?.name || 'Unknown';
      })
      .filter(Boolean)
      .join(',');
  };

  // Helper function to get existing relationships
  const getExistingRelationships = (type: string, direction: 'OUTGOING'): string => {
    if (!relationshipData) return '';
    
    let relationships: any[] = [];
    switch (type) {
      case 'HasA':
        if (direction === 'OUTGOING') {
          relationships = relationshipData.contains?.relationships || [];
        }
        break;
      case 'IsA':
        if (direction === 'OUTGOING') {
          relationships = relationshipData.inherits?.relationships || [];
        }
        break;
      default:
        return '';
    }
    
    const result = formatRelationships(relationships);
    
    // Debug logging for relationship comparison
    if (relationships.length > 0) {
      console.log(`🔍 Relationship lookup for ${type} (${direction}):`);
      relationships.forEach((rel, index) => {
        console.log(`  ${index + 1}. URN: ${rel.entity?.urn}`);
        console.log(`     Properties Name: ${rel.entity?.properties?.name || 'N/A'}`);
        if (rel.entity?.parentNodes?.nodes) {
          const parentPath = rel.entity.parentNodes.nodes
            .map((n: any) => n?.properties?.name)
            .filter(Boolean)
            .join('.');
          console.log(`     Parent Path: ${parentPath || 'none'}`);
          console.log(`     Full Hierarchical Path: ${parentPath ? `${parentPath}.${rel.entity.properties.name}` : rel.entity.properties.name}`);
        } else {
          console.log(`     Full Hierarchical Path: ${rel.entity.properties.name || 'N/A'}`);
        }
      });
      console.log(`  Final formatted result: "${result}"`);
    }
    
    return result;
  };

  // Generate field comparisons dynamically based on CSV structure
  const fieldDiffs: FieldDiff[] = [
    {
      field: 'Name',
      existing: normalizeString(existingAsCsv.name),
      imported: normalizeString(importedRow.name),
      hasChanged: normalizeString(existingAsCsv.name) !== normalizeString(importedRow.name)
    },
    {
      field: 'Description',
      existing: normalizeString(existingAsCsv.description),
      imported: normalizeString(importedRow.description),
      hasChanged: importedRow.description && importedRow.description.trim() ? 
        normalizeString(existingAsCsv.description) !== normalizeString(importedRow.description) : false
    },
    {
      field: 'Parent Nodes',
      existing: normalizeString(existingAsCsv.parent_nodes),
      imported: normalizeString(importedRow.parent_nodes),
      hasChanged: normalizeString(existingAsCsv.parent_nodes) !== normalizeString(importedRow.parent_nodes)
    },
    {
      field: 'Ownership',
      existing: normalizeString(existingAsCsv.ownership),
      imported: normalizeString(importedRow.ownership),
      hasChanged: importedRow.ownership && importedRow.ownership.trim() ? 
        normalizeString(existingAsCsv.ownership) !== normalizeString(importedRow.ownership) : false
    }
  ];

  // Add term-specific fields if this is a glossary term
  if (importedRow.entity_type === 'glossaryTerm') {
    fieldDiffs.push(
      {
        field: 'Term Source',
        existing: normalizeString(existingAsCsv.term_source),
        imported: normalizeString(importedRow.term_source),
        hasChanged: importedRow.term_source && importedRow.term_source.trim() ? 
          normalizeString(existingAsCsv.term_source) !== normalizeString(importedRow.term_source) : false,
        isTermSpecific: true
      },
      {
        field: 'Source Reference',
        existing: normalizeString(existingAsCsv.source_ref),
        imported: normalizeString(importedRow.source_ref),
        hasChanged: importedRow.source_ref && importedRow.source_ref.trim() ? 
          normalizeString(existingAsCsv.source_ref) !== normalizeString(importedRow.source_ref) : false,
        isTermSpecific: true
      },
      {
        field: 'Source URL',
        existing: normalizeString(existingAsCsv.source_url),
        imported: normalizeString(importedRow.source_url),
        hasChanged: importedRow.source_url && importedRow.source_url.trim() ? 
          normalizeString(existingAsCsv.source_url) !== normalizeString(importedRow.source_url) : false,
        isTermSpecific: true
      }
    );
  }

  // Add custom properties comparison
  if (importedRow.custom_properties && importedRow.custom_properties.trim() && importedRow.custom_properties !== "{}") {
    fieldDiffs.push({
      field: 'Custom Properties',
      existing: normalizeString(existingAsCsv.custom_properties),
      imported: normalizeString(importedRow.custom_properties),
      hasChanged: normalizeString(existingAsCsv.custom_properties) !== normalizeString(importedRow.custom_properties)
    });
  }

  // Add domain comparison
  if (importedRow.domain_urn && importedRow.domain_urn.trim()) {
    fieldDiffs.push({
      field: 'Domain',
      existing: normalizeString(existingAsCsv.domain_urn),
      imported: normalizeString(importedRow.domain_urn),
      hasChanged: normalizeString(existingAsCsv.domain_urn) !== normalizeString(importedRow.domain_urn)
    });
  }

  // Add relationship fields if CSV contains them
  if (importedRow.related_contains && importedRow.related_contains.trim()) {
    const existingRelationships = getExistingRelationships('HasA', 'OUTGOING');
    const hasChanged = existingRelationships ? normalizeString(existingRelationships) !== normalizeString(importedRow.related_contains) : true;
    
    if (hasChanged) {
      console.log(`🔍 Relationship change detected for ${importedRow.name}:`);
      console.log(`  EXISTING: "${existingRelationships}"`);
      console.log(`  IMPORTED: "${importedRow.related_contains}"`);
    }
    
    fieldDiffs.push({
      field: 'Related Contains (HasA)',
      existing: existingRelationships || (relationshipData ? '(no existing relationships)' : '(no data)'),
      imported: normalizeString(importedRow.related_contains),
      hasChanged: hasChanged,
      isTermSpecific: true,
      isLoading: !relationshipData
    });
  }

  if (importedRow.related_inherits && importedRow.related_inherits.trim()) {
    const existingRelationships = getExistingRelationships('IsA', 'OUTGOING');
    const hasChanged = existingRelationships ? normalizeString(existingRelationships) !== normalizeString(importedRow.related_inherits) : true;
    
    if (hasChanged) {
      console.log(`🔍 Relationship change detected for ${importedRow.name}:`);
      console.log(`  EXISTING: "${existingRelationships}"`);
      console.log(`  IMPORTED: "${importedRow.related_inherits}"`);
    }
    
    fieldDiffs.push({
      field: 'Related Inherits (IsA)',
      existing: existingRelationships || (relationshipData ? '(no existing relationships)' : '(no data)'),
      imported: normalizeString(importedRow.related_inherits),
      hasChanged: hasChanged,
      isTermSpecific: true,
      isLoading: !relationshipData
    });
  }

  // Note: Related terms are now fetched and compared when the diff view opens
  // This provides accurate relationship comparison for better user experience
  // Performance optimization: Only fetch relationships when CSV contains relationship data

  const existingOwners = existingEntity.ownership?.owners || [];
  const existingUsers = existingOwners
    .filter((o: any) => o.owner.__typename === 'CorpUser')
    .map((o: any) => o.owner.username)
    .filter(Boolean)
    .join(', ');

  const existingGroups = existingOwners
    .filter((o: any) => o.owner.__typename === 'CorpGroup')
    .map((o: any) => o.owner.name)
    .filter(Boolean)
    .join(', ');

  const changedFields = fieldDiffs.filter(f => f.hasChanged);
  const unchangedFields = fieldDiffs.filter(f => !f.hasChanged);

  return (
    <Modal
      title={
        <Space>
          <EditOutlined />
          <span>Field Comparison for "{importedRow.name}"</span>
          <Tag color={changedFields.length > 0 ? 'orange' : 'green'}>
            {changedFields.length > 0 ? `${changedFields.length} changes` : 'No changes'}
          </Tag>
        </Space>
      }
      open={isVisible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      {relationshipData ? (
        <>
          {changedFields.length > 0 ? (
            <>
              <Title level={5} style={{ color: '#fa8c16', marginBottom: 16 }}>
                <EditOutlined /> Fields that will be updated:
              </Title>
              {changedFields.map((field, index) => (
                <div key={index} style={{ marginBottom: 16 }}>
                  <Space style={{ marginBottom: 8 }}>
                    <Text strong>{field.field}</Text>
                    <Tag color="orange">Will Update</Tag>
                    {field.isTermSpecific && (
                      <Tag color="blue">Term Only</Tag>
                    )}
                    {field.isLoading && (
                      <Tag color="processing">Loading...</Tag>
                    )}
                  </Space>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Current Value:</Text>
                      <div style={{ 
                        padding: '8px', 
                        backgroundColor: '#f5f5f5', 
                        borderRadius: '4px',
                        border: '1px solid #d9d9d9'
                      }}>
                        <Text delete style={{ color: '#ff4d4f' }}>
                          {field.existing || '(empty)'}
                        </Text>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>New Value:</Text>
                      <div style={{ 
                        padding: '8px', 
                        backgroundColor: '#f6ffed', 
                        borderRadius: '4px',
                        border: '1px solid #b7eb8f'
                      }}>
                        <Text style={{ color: '#52c41a' }}>
                          {field.imported || '(empty)'}
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <InfoCircleOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: 16 }} />
              <Title level={4} style={{ color: '#52c41a' }}>No Changes Detected</Title>
              <Text type="secondary">All fields match the existing entity. This row will be skipped during import.</Text>
            </div>
          )}

          {unchangedFields.length > 0 && (
            <>
              <Divider />
              <Title level={5} style={{ color: '#52c41a', marginBottom: 16 }}>
                <PlusCircleOutlined /> Fields that will remain unchanged:
              </Title>
              {unchangedFields.map((field, index) => (
                <div key={index} style={{ marginBottom: 12 }}>
                  <Space>
                    <Text strong>{field.field}</Text>
                    {field.isTermSpecific && (
                      <Tag color="blue">Term Only</Tag>
                    )}
                    <Tag color="green">No Change</Tag>
                    {field.isLoading && (
                      <Tag color="processing">Loading...</Tag>
                    )}
                  </Space>
                  <div style={{ 
                    padding: '8px', 
                    backgroundColor: '#f6ffed', 
                    borderRadius: '4px',
                    border: '1px solid #b7eb8f',
                    marginTop: 4
                  }}>
                    <Text type="secondary">{field.existing || '(empty)'}</Text>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 8 }}>Loading relationship data...</div>
        </div>
      )}

      {/* Ownership breakdown for reference */}
      {(existingUsers || existingGroups) && (
        <>
          <Divider />
          <Title level={5}>Current Ownership Breakdown</Title>
          {existingUsers && (
            <div style={{ marginBottom: 8 }}>
              <Text strong>Users: </Text>
              <Text>{existingUsers}</Text>
            </div>
          )}
          {existingGroups && (
            <div>
              <Text strong>Groups: </Text>
              <Text>{existingGroups}</Text>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};
