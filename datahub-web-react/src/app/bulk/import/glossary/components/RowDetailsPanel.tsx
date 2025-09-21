import React from 'react';
import { Drawer, Typography, Space, Tag, Divider, Alert, Row, Col } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined, PlusOutlined, EditOutlined, ArrowRightOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { colors, typography } from '@src/alchemy-components';
import { FlatRow } from '../lib/flatten';
import { buildPathId, splitParentPath } from '../lib/id';

const { Title, Text } = Typography;

const StyledDrawer = styled(Drawer)`
  .ant-drawer-body {
    padding: 24px;
  }

  .ant-drawer-header {
    padding: 16px 24px;
    border-bottom: 1px solid ${colors.gray[200]};
  }
`;

const SectionContainer = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled(Title)`
  margin: 0 0 12px 0 !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  color: ${colors.gray[900]} !important;
`;

const FieldRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid ${colors.gray[100]};
  
  &:last-child {
    border-bottom: none;
  }
`;

const FieldLabel = styled(Text)`
  font-weight: 500;
  color: ${colors.gray[700]};
  min-width: 120px;
  flex-shrink: 0;
`;

const FieldValue = styled(Text)`
  color: ${colors.gray[600]};
  flex: 1;
  margin-left: 16px;
  word-break: break-word;
`;

const StatusContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`;

const ValidationSection = styled.div`
  background-color: ${colors.gray[50]};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
`;

const DiffSection = styled.div`
  background-color: ${colors.blue[50]};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
`;

const DiffItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
`;

const DiffLabel = styled(Text)`
  font-weight: 500;
  color: ${colors.gray[700]};
`;

const DiffValue = styled(Text)`
  color: ${colors.gray[600]};
  font-family: monospace;
  background-color: ${colors.gray[100]};
  padding: 2px 6px;
  border-radius: 4px;
`;

const ComparisonContainer = styled.div`
  background-color: ${colors.gray[50]};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
`;

const ComparisonHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ComparisonColumn = styled.div`
  flex: 1;
  padding: 0 8px;
`;

const ComparisonField = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid ${colors.gray[200]};
  
  &:last-child {
    border-bottom: none;
  }
`;

const ComparisonLabel = styled(Text)`
  font-weight: 500;
  color: ${colors.gray[700]};
  min-width: 100px;
  flex-shrink: 0;
`;

const ComparisonValue = styled(Text)<{ $isDifferent?: boolean; $isNew?: boolean }>`
  color: ${props => props.$isNew ? '#1890ff' : props.$isDifferent ? '#fa8c16' : colors.gray[600]};
  flex: 1;
  margin-left: 12px;
  word-break: break-word;
  font-family: ${props => props.$isDifferent ? 'monospace' : 'inherit'};
  background-color: ${props => props.$isDifferent ? '#fff7e6' : props.$isNew ? '#e6f7ff' : 'transparent'};
  padding: ${props => props.$isDifferent || props.$isNew ? '4px 8px' : '0'};
  border-radius: 4px;
  border: ${props => props.$isDifferent ? '1px solid #ffd591' : props.$isNew ? '1px solid #91d5ff' : 'none'};
`;

const ArrowIcon = styled(ArrowRightOutlined)`
  color: ${colors.gray[400]};
  margin: 0 8px;
  align-self: center;
`;

const NoChangesMessage = styled.div`
  text-align: center;
  padding: 24px;
  color: ${colors.gray[500]};
  font-style: italic;
`;

interface RowDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  row: FlatRow | null;
  rowIndex: number;
  existingEntities?: { [key: string]: any };
  entityLookup?: { [key: string]: { urn: string; entity: any } };
  isImporting?: boolean;
}

const RowDetailsPanel: React.FC<RowDetailsPanelProps> = ({ isOpen, onClose, row, rowIndex, existingEntities, entityLookup, isImporting = false }) => {
  if (!row) return null;

  // Get validation status - simplified
  const validation = React.useMemo(() => {
    if (!existingEntities || !entityLookup || !row) {
      return null;
    }
    
    try {
      // Build dot-safe fully qualified name from CSV row using ID system
      const csvParentPath = row.parent_nodes ? splitParentPath(row.parent_nodes) : [];
      const csvFullyQualifiedName = buildPathId([...csvParentPath, row.name]);
      
      // Find existing entity by dot-safe fully qualified name
      const existingUrn = Object.keys(existingEntities).find(urn => {
        const entity = existingEntities[urn];
        if (!entity?.properties?.name) return false;
        
        // Build dot-safe fully qualified name from existing entity
        const entityParentNames = (entity?.parentNodes?.nodes || [])
          .map((node: any) => node.properties?.name || '')
          .filter(name => name); // Remove empty names
        
        const entityFullyQualifiedName = buildPathId([...entityParentNames, entity.properties.name]);
        
        return entityFullyQualifiedName === csvFullyQualifiedName;
      });
      
      if (existingUrn) {
        // Check if there are differences
        const existingEntity = existingEntities[existingUrn];
        const hasChanges = existingEntity?.properties?.description !== row.description ||
                          existingEntity?.properties?.termSource !== row.term_source ||
                          existingEntity?.properties?.sourceRef !== row.source_ref ||
                          existingEntity?.properties?.sourceUrl !== row.source_url;
        
        return {
          action: hasChanges ? 'update' : 'skip',
          existingUrn,
          errors: []
        };
      } else {
        return {
          action: 'create',
          existingUrn: null,
          errors: []
        };
      }
    } catch (error) {
      console.error('Error validating row:', error);
      return null;
    }
  }, [existingEntities, entityLookup, row]);

  const getStatusIcon = () => {
    // Use Ant Design theme colors directly
    const statusColors = {
      red: '#ff4d4f',
      blue: '#1890ff', 
      orange: '#fa8c16',
      green: '#52c41a',
      gray: '#8c8c8c'
    };

    if (!row.name) {
      return <CloseCircleOutlined style={{ color: statusColors.red }} />;
    }
    if (validation) {
      switch (validation.action) {
        case 'create':
          return <PlusOutlined style={{ color: statusColors.blue }} />;
        case 'update':
          return <EditOutlined style={{ color: statusColors.orange }} />;
        case 'skip':
          return <CheckCircleOutlined style={{ color: statusColors.green }} />;
        case 'failed':
          return <ExclamationCircleOutlined style={{ color: statusColors.red }} />;
        default:
          return <InfoCircleOutlined style={{ color: statusColors.gray }} />;
      }
    }
    return <CheckCircleOutlined style={{ color: statusColors.green }} />;
  };

  const getStatusText = () => {
    if (!row.name) {
      return 'Invalid - Missing Name';
    }
    if (validation) {
      switch (validation.action) {
        case 'create':
          return 'New Entity';
        case 'update':
          return 'Modified Entity';
        case 'skip':
          return 'No Changes';
        case 'failed':
          return 'Validation Failed';
        default:
          return 'Unknown Status';
      }
    }
    return 'Valid';
  };

  const getStatusColor = () => {
    if (!row.name) {
      return 'error';
    }
    if (validation) {
      switch (validation.action) {
        case 'create':
          return 'blue';
        case 'update':
          return 'orange';
        case 'skip':
          return 'green';
        case 'failed':
          return 'red';
        default:
          return 'default';
      }
    }
    return 'success';
  };

  const renderField = (label: string, value: any, isRequired = false) => {
    const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
    const displayValue = isEmpty ? <Text type="secondary">(empty)</Text> : value;
    
    // Map field labels to existing data keys
    const fieldMapping: { [key: string]: string } = {
      'Entity Type': 'entity_type',
      'Name': 'name',
      'URN': 'urn',
      'Parent Nodes': 'parent_nodes',
      'Description': 'description',
      'Term Source': 'term_source',
      'Source Ref': 'source_ref',
      'Source URL': 'source_url',
      'Owners (Users)': 'ownership',
      'Owners (Groups)': 'ownership',
      'Ownership Types': 'ownership',
      'Related: Contains': 'related_contains',
      'Related: Inherits': 'related_inherits',
      'Domain URN': 'domain_urn',
      'Domain Name': 'domain_name',
      'Domain Description': 'domain_name',
      'Custom Properties': 'custom_properties'
    };
    
    // Get existing value for comparison
    const existingData = getExistingEntityData;
    const fieldKey = fieldMapping[label] || label.toLowerCase().replace(/\s+/g, '_');
    const existingValue = existingData ? existingData[fieldKey] : '';
    const { isDifferent, isNew } = compareValues(existingValue, value, label);
    
    // Helper function to render value with diff highlighting
    const renderValueWithDiff = (oldVal: any, newVal: any, isOldValue: boolean) => {
      const oldStr = String(oldVal || '');
      const newStr = String(newVal || '');
      
      if (!isDifferent && !isNew) {
        // No changes - render normally
        return <span>{oldStr || '(empty)'}</span>;
      }
      
      if (isNew) {
        // New field - highlight the new value
        if (isOldValue) {
          return <span style={{ textDecoration: 'line-through', color: '#999' }}>(empty)</span>;
        } else {
          return <span style={{ backgroundColor: '#f6ffed', color: '#52c41a', padding: '2px 4px', borderRadius: '3px' }}>{newStr || '(empty)'}</span>;
        }
      }
      
      if (isDifferent) {
        // Different values - highlight only the changed parts
        if (isOldValue) {
          return <span style={{ backgroundColor: '#fff2e8', color: '#d46b08', padding: '2px 4px', borderRadius: '3px' }}>{oldStr || '(empty)'}</span>;
        } else {
          return <span style={{ backgroundColor: '#f6ffed', color: '#52c41a', padding: '2px 4px', borderRadius: '3px' }}>{newStr || '(empty)'}</span>;
        }
      }
      
      return <span>{isOldValue ? (oldStr || '(empty)') : (newStr || '(empty)')}</span>;
    };
    
    return (
      <FieldRow>
        <FieldLabel>
          {label}
          {isRequired && <Text type="danger"> *</Text>}
        </FieldLabel>
        <FieldValue style={{ 
          backgroundColor: '#fafafa',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '12px',
          minHeight: '32px',
          color: '#666'
        }}>
          {renderValueWithDiff(existingValue, value, true)}
        </FieldValue>
        <FieldValue style={{ 
          backgroundColor: '#fafafa',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '12px',
          minHeight: '32px',
          color: '#666'
        }}>
          {renderValueWithDiff(existingValue, value, false)}
        </FieldValue>
      </FieldRow>
    );
  };

  const renderDiffField = (label: string, value: any) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }
    
    return (
      <DiffItem>
        <DiffLabel>{label}:</DiffLabel>
        <DiffValue>{value}</DiffValue>
      </DiffItem>
    );
  };

  // Get existing entity and check if there are differences using the existing logic
  const existingEntity = React.useMemo(() => {
    if (!validation?.existingUrn || !existingEntities) {
      return null;
    }
    return existingEntities[validation.existingUrn] || null;
  }, [validation?.existingUrn, existingEntities]);

  const hasChanges = React.useMemo(() => {
    if (!existingEntity || !row || isImporting) {
      return false;
    }
    try {
      // Simple comparison of key fields
      return existingEntity?.properties?.description !== row.description ||
             existingEntity?.properties?.termSource !== row.term_source ||
             existingEntity?.properties?.sourceRef !== row.source_ref ||
             existingEntity?.properties?.sourceUrl !== row.source_url;
    } catch (error) {
      console.error('Error checking differences:', error);
      return false;
    }
  }, [existingEntity, row, isImporting]);

  // Extract data from existing entity for visual comparison
  const getExistingEntityData = React.useMemo(() => {
    if (!existingEntity) {
      return null;
    }
    
    try {
      const props = existingEntity.properties || {};
      
      return {
        entity_type: existingEntity.urn.includes('glossaryTerm:') ? 'glossaryTerm' : 
                     existingEntity.urn.includes('glossaryNode:') ? 'glossaryNode' : 
                     existingEntity.__typename === 'GlossaryTerm' ? 'glossaryTerm' : 'glossaryNode',
        urn: existingEntity.urn || "",
        name: props.name || "",
        description: props.description || "",
        term_source: (props as any).termSource || "",
        source_ref: (props as any).sourceRef || "",
        source_url: (props as any).sourceUrl || "",
        ownership: "", // Simplified for display
        parent_nodes: existingEntity.parentNodes?.nodes
          ?.map(node => node?.properties?.name || '')
          .filter(Boolean)
          .join('.') || "",
        related_contains: "",
        related_inherits: "",
        domain_urn: (existingEntity as any).domain?.domain?.urn || "",
        domain_name: "",
        custom_properties: (props as any).customProperties ? JSON.stringify((props as any).customProperties) : "",
        status: "Draft"
      };
    } catch (error) {
      console.error('Error extracting existing entity data:', error);
      return null;
    }
  }, [existingEntity]);

  // Compare two values and determine if they're different
  const compareValues = (existing: any, imported: any, fieldLabel?: string): { isDifferent: boolean; isNew: boolean } => {
    // Skip URN comparison - URNs are either provided for lookup or generated, not user-editable
    if (fieldLabel === 'URN') {
      return { isDifferent: false, isNew: false };
    }
    
    const existingStr = existing ? String(existing).trim() : '';
    const importedStr = imported ? String(imported).trim() : '';
    
    if (existingStr === '' && importedStr !== '') {
      return { isDifferent: true, isNew: true };
    }
    
    return { 
      isDifferent: existingStr !== importedStr, 
      isNew: false 
    };
  };

  // Render comparison field
  const renderComparisonField = (label: string, existingValue: any, importedValue: any) => {
    const { isDifferent, isNew } = compareValues(existingValue, importedValue, label);
    
    return (
      <ComparisonField>
        <ComparisonLabel>{label}</ComparisonLabel>
        <ComparisonValue $isDifferent={isDifferent} $isNew={isNew}>
          {existingValue || <Text type="secondary">(empty)</Text>}
        </ComparisonValue>
        <ArrowIcon />
        <ComparisonValue $isDifferent={isDifferent} $isNew={isNew}>
          {importedValue || <Text type="secondary">(empty)</Text>}
        </ComparisonValue>
      </ComparisonField>
    );
  };

  return (
    <StyledDrawer
      title={`Row ${rowIndex + 1} Details`}
      placement="right"
      width={600}
      open={isOpen}
      onClose={onClose}
      destroyOnClose
    >
      <StatusContainer>
        {getStatusIcon()}
        <Tag color={getStatusColor()}>{getStatusText()}</Tag>
      </StatusContainer>

      <SectionContainer>
        <SectionTitle level={4}>Basic Information</SectionTitle>
        <FieldRow style={{ fontWeight: 'bold', borderBottom: '1px solid #d9d9d9', paddingBottom: '8px', marginBottom: '8px' }}>
          <FieldLabel>Field</FieldLabel>
          <FieldValue>Old Value</FieldValue>
          <FieldValue>New Value</FieldValue>
        </FieldRow>
        {renderField('Entity Type', row.entity_type, true)}
        {renderField('Name', row.name, true)}
        {renderField('URN', row.urn)}
        {renderField('Parent Nodes', row.parent_nodes)}
      </SectionContainer>

      <SectionContainer>
        <SectionTitle level={4}>Content</SectionTitle>
        <FieldRow style={{ fontWeight: 'bold', borderBottom: '1px solid #d9d9d9', paddingBottom: '8px', marginBottom: '8px' }}>
          <FieldLabel>Field</FieldLabel>
          <FieldValue>Old Value</FieldValue>
          <FieldValue>New Value</FieldValue>
        </FieldRow>
        {renderField('Description', row.description)}
        {renderField('Term Source', row.term_source)}
        {renderField('Source Ref', row.source_ref)}
        {renderField('Source URL', row.source_url)}
      </SectionContainer>

      <SectionContainer>
        <SectionTitle level={4}>Ownership & Relationships</SectionTitle>
        <FieldRow style={{ fontWeight: 'bold', borderBottom: '1px solid #d9d9d9', paddingBottom: '8px', marginBottom: '8px' }}>
          <FieldLabel>Field</FieldLabel>
          <FieldValue>Old Value</FieldValue>
          <FieldValue>New Value</FieldValue>
        </FieldRow>
        {renderField('Ownership', row.ownership)}
        {renderField('Related: Contains', row.related_contains)}
        {renderField('Related: Inherits', row.related_inherits)}
      </SectionContainer>

      <SectionContainer>
        <SectionTitle level={4}>Domain & Properties</SectionTitle>
        <FieldRow style={{ fontWeight: 'bold', borderBottom: '1px solid #d9d9d9', paddingBottom: '8px', marginBottom: '8px' }}>
          <FieldLabel>Field</FieldLabel>
          <FieldValue>Old Value</FieldValue>
          <FieldValue>New Value</FieldValue>
        </FieldRow>
        {renderField('Domain URN', row.domain_urn)}
        {renderField('Domain Name', row.domain_name)}
        {renderField('Custom Properties', row.custom_properties)}
      </SectionContainer>



      <Divider />

      <SectionContainer>
        <SectionTitle level={4}>Validation & Diffs</SectionTitle>
        
        <ValidationSection>
          <Title level={5} style={{ margin: '0 0 12px 0', color: colors.gray[800] }}>
            <InfoCircleOutlined style={{ marginRight: 8 }} />
            Validation Status
          </Title>
          {!row.name && (
            <Alert
              message="Required field missing"
              description="The 'Name' field is required for all glossary terms and nodes."
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}
          {row.name && validation && (
            <Alert
              message={`${getStatusText()}`}
              description={
                validation.action === 'create' ? 'This is a new entity that will be created.' :
                validation.action === 'update' ? 'This existing entity has changes and will be updated.' :
                validation.action === 'skip' ? 'This existing entity has no changes and will be skipped.' :
                validation.action === 'failed' ? `Validation failed: ${validation.errors.join(', ')}` :
                'Validation status unknown.'
              }
              type={
                validation.action === 'create' ? 'info' :
                validation.action === 'update' ? 'warning' :
                validation.action === 'skip' ? 'success' :
                validation.action === 'failed' ? 'error' :
                'info'
              }
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}
          {row.name && !validation && (
            <Alert
              message="Validation passed"
              description="All required fields are present and valid."
              type="success"
              showIcon
            />
          )}
        </ValidationSection>




      </SectionContainer>
    </StyledDrawer>
  );
};

export default RowDetailsPanel;
