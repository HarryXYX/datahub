import React, { useState, useCallback, useMemo } from 'react';
import { Button, Space, Input, Pagination, Select, Typography, Alert, Tag } from 'antd';
import { Table } from '@components';
import type { InputRef } from 'antd';
import { FlatRow } from '../lib/flatten';
import { buildPathId, splitParentPath } from '../lib/id';
import styled from 'styled-components';
import { colors, typography } from '@src/alchemy-components';
import RowDetailsPanel from './RowDetailsPanel';
import { PlusOutlined, EditOutlined, CheckCircleOutlined, ExclamationCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { ImportResult } from './ResultsGrid';

const { TextArea: AntTextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

// Styled components matching structured properties design
const GridTableContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  max-height: calc(100vh - 200px); /* Fixed height to fit screen */
  
  .ant-table {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .ant-table-thead > tr > th {
    background-color: ${colors.gray[50]};
    border-bottom: 1px solid ${colors.gray[200]};
    font-weight: 600;
    color: ${colors.gray[700]};
    font-size: 14px;
    padding: 16px 12px;
  }
  
  .ant-table-tbody > tr > td {
    padding: 12px;
    border-bottom: 1px solid ${colors.gray[100]};
    font-size: 14px;
    color: ${colors.gray[600]};
  }
  
  .ant-table-tbody > tr:hover > td {
    background-color: ${colors.gray[50]};
  }
  
  .ant-table-tbody > tr:nth-child(even) > td {
    background-color: ${colors.gray[25]};
  }
`;

const ScrollableTableWrapper = styled.div`
  flex: 1;
  overflow: auto;
  min-height: 0;
`;

const TableHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px 0;
  border-bottom: 1px solid ${colors.gray[200]};
`;

const TableTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${colors.gray[900]};
  font-family: ${typography.fonts.body};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const StyledButton = styled(Button)`
  border-radius: 6px;
  font-weight: 500;
  font-size: 14px;
  
  &.ant-btn-primary {
    background-color: ${colors.violet[600]};
    border-color: ${colors.violet[600]};
    
    &:hover {
      background-color: ${colors.violet[700]};
      border-color: ${colors.violet[700]};
    }
  }
`;

const StyledInput = styled(Input)`
  border-radius: 6px;
  border: 1px solid ${colors.gray[300]};
  
  &:hover, &:focus {
    border-color: ${colors.violet[400]};
    box-shadow: 0 0 0 2px ${colors.violet[100]};
  }
`;

const StyledTextArea = styled(AntTextArea)`
  border-radius: 6px;
  border: 1px solid ${colors.gray[300]};
  
  &:hover, &:focus {
    border-color: ${colors.violet[400]};
    box-shadow: 0 0 0 2px ${colors.violet[100]};
  }
`;

const StyledSelect = styled(Select)`
  .ant-select-selector {
    border-radius: 6px !important;
    border: 1px solid ${colors.gray[300]} !important;
    
    &:hover, &:focus {
      border-color: ${colors.violet[400]} !important;
      box-shadow: 0 0 0 2px ${colors.violet[100]} !important;
    }
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding: 16px 0;
  border-top: 1px solid ${colors.gray[200]};
  gap: 16px;
`;

const PageInfo = styled.div`
  color: ${colors.gray[500]};
  font-size: 14px;
`;

const StyledPagination = styled(Pagination)`
  .ant-pagination-item {
    border-radius: 6px;
    border: 1px solid ${colors.gray[300]};
    
    &:hover {
      border-color: ${colors.violet[400]};
    }
    
    &.ant-pagination-item-active {
      background-color: ${colors.violet[600]};
      border-color: ${colors.violet[600]};
    }
  }
  
  .ant-pagination-prev, .ant-pagination-next {
    border-radius: 6px;
    border: 1px solid ${colors.gray[300]};
    
    &:hover {
      border-color: ${colors.violet[400]};
    }
  }
`;

interface GridProps {
  data: FlatRow[];
  onChange: (newData: FlatRow[]) => void;
  existingEntities?: { [key: string]: any };
  entityLookup?: { [key: string]: { urn: string; entity: any } };
  isReadOnly?: boolean;
  importResults?: ImportResult[];
  isImporting?: boolean;
}



export const Grid: React.FC<GridProps> = ({ data, onChange, existingEntities, entityLookup, isReadOnly = false, importResults = [], isImporting = false }) => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRow, setSelectedRow] = useState<FlatRow | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(-1);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Function to get status for a row using dot-safe fully qualified name matching
  const getRowStatus = useCallback((row: FlatRow) => {
    if (!existingEntities || !entityLookup) {
      return { action: 'unknown', icon: null, color: 'default', text: 'Unknown' };
    }

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
      
      if (hasChanges) {
        return { action: 'update', icon: <EditOutlined />, color: 'orange', text: 'Modified' };
      } else {
        return { action: 'skip', icon: <CheckCircleOutlined />, color: 'green', text: 'No Change' };
      }
    } else {
      return { action: 'create', icon: <PlusOutlined />, color: 'blue', text: 'New' };
    }
  }, [existingEntities, entityLookup]);

  const getImportStatus = useCallback((row: FlatRow) => {
    if (!isReadOnly || importResults.length === 0) {
      return null;
    }
    
    // Find the import result for this row
    const result = importResults.find(r => 
      r.row.name === row.name && 
      r.row.entity_type === row.entity_type &&
      r.row.parent_nodes === row.parent_nodes
    );
    
    if (!result) {
      return { status: 'pending', text: 'Pending', color: 'default', icon: <ClockCircleOutlined /> };
    }
    
    switch (result.status) {
      case 'success':
        const action = result.details?.action;
        if (action === 'created') {
          return { status: 'success', text: 'Created', color: 'green', icon: <CheckCircleOutlined /> };
        } else if (action === 'updated') {
          return { status: 'success', text: 'Updated', color: 'blue', icon: <CheckCircleOutlined /> };
        } else if (action === 'skip' || action === 'skipped') {
          return { status: 'success', text: 'Skipped', color: 'default', icon: <CheckCircleOutlined /> };
        } else {
          return { status: 'success', text: 'Success', color: 'green', icon: <CheckCircleOutlined /> };
        }
      case 'error':
        return { status: 'error', text: 'Failed', color: 'red', icon: <ExclamationCircleOutlined /> };
      case 'pending':
        return { status: 'pending', text: 'Pending', color: 'default', icon: <ClockCircleOutlined /> };
      default:
        return { status: 'pending', text: 'Pending', color: 'default', icon: <ClockCircleOutlined /> };
    }
  }, [isReadOnly, importResults]);

  // Filter data based on status
  const filteredData = useMemo(() => {
    if (statusFilter === 'all') return data;
    return data.filter(row => {
      const status = getRowStatus(row);
      return status.action === statusFilter;
    });
  }, [data, statusFilter, getRowStatus]);

  // Calculate pagination values for filtered data
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredData.length);
  const currentPageData = filteredData.slice(startIndex, endIndex);



  const addRow = useCallback(() => {
    const newRow: FlatRow = {
      entity_type: 'glossaryTerm',
      urn: '',
      name: '',
      
      parent_nodes: '',
      related_contains: '',
      related_inherits: '',
      description: '',
      term_source: '',
      source_ref: '',
      source_url: '',
      ownership: '',
      domain_urn: '',
      domain_name: '',
      custom_properties: '',
      status: 'Draft'
    };
    const newData = [...data, newRow];
    onChange(newData);
    
    // Navigate to the last page to show the new row
    const newTotalPages = Math.ceil(newData.length / pageSize);
    setCurrentPage(newTotalPages);
  }, [data, onChange, pageSize]);

  const deleteSelectedRows = useCallback(() => {
    const newData = data.filter((_, index) => !selectedRows.has(`row-${index}`));
    onChange(newData);
    setSelectedRows(new Set());
    
    // Adjust current page if we're now beyond the total pages
    const newTotalPages = Math.ceil(newData.length / pageSize);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
  }, [data, onChange, selectedRows, currentPage, pageSize]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleRowClick = useCallback((record: FlatRow, index: number) => {
    setSelectedRow(record);
    setSelectedRowIndex(startIndex + index);
    setIsDetailsPanelOpen(true);
  }, [startIndex]);

  const handleCloseDetailsPanel = useCallback(() => {
    setIsDetailsPanelOpen(false);
    setSelectedRow(null);
    setSelectedRowIndex(-1);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  // Convert TanStack columns to Ant Design columns
  const antdColumns = useMemo(() => [
    {
      title: 'Entity Type',
      dataIndex: 'entity_type',
      key: 'entity_type',
      width: 120,
      render: (value: string, record: FlatRow, index: number) => (
        <StyledSelect
          value={value}
          onChange={(newValue: unknown) => {
            const newData = [...data];
            newData[index].entity_type = newValue as string;
            onChange(newData);
          }}
          style={{ width: '100%' }}
        >
          <Option value="glossaryTerm">Term</Option>
          <Option value="glossaryNode">Node</Option>
        </StyledSelect>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (value: string, record: FlatRow, index: number) => (
        <StyledInput
          value={value}
          onChange={(e) => {
            const newData = [...data];
            newData[index].name = e.target.value;
            onChange(newData);
          }}
          placeholder="Enter name"
        />
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 250,
      render: (value: string, record: FlatRow, index: number) => (
        <StyledTextArea
          value={value}
          onChange={(e) => {
            const newData = [...data];
            newData[index].description = e.target.value;
            onChange(newData);
          }}
          placeholder="Enter description"
          rows={2}
        />
      ),
    },
    {
      title: 'Parent Nodes',
      dataIndex: 'parent_nodes',
      key: 'parent_nodes',
      width: 200,
      render: (value: string, record: FlatRow, index: number) => (
        <StyledInput
          value={value}
          onChange={(e) => {
            const newData = [...data];
            newData[index].parent_nodes = e.target.value;
            onChange(newData);
          }}
          placeholder="parent1.parent2"
        />
      ),
    },
    {
      title: 'Domain',
      dataIndex: 'domain_name',
      key: 'domain_name',
      width: 150,
      render: (value: string, record: FlatRow, index: number) => (
        <StyledInput
          value={value}
          onChange={(e) => {
            const newData = [...data];
            newData[index].domain_name = e.target.value;
            onChange(newData);
          }}
          placeholder="Enter domain"
        />
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: string, record: FlatRow, index: number) => (
        <StyledSelect
          value={value}
          onChange={(newValue: unknown) => {
            const newData = [...data];
            newData[index].status = newValue as string;
            onChange(newData);
          }}
          style={{ width: '100%' }}
        >
          <Option value="Draft">Draft</Option>
          <Option value="Active">Active</Option>
          <Option value="Deprecated">Deprecated</Option>
        </StyledSelect>
      ),
    },
  ], [data, onChange]);







  // Convert to @components Table format
  const tableColumns = useMemo(() => [
    {
      title: 'Entity Type',
      key: 'entity_type',
      width: '120px',
      render: (record: FlatRow) => (
        isReadOnly ? (
          <Text>{record.entity_type === 'glossaryTerm' ? 'Term' : 'Node'}</Text>
        ) : (
          <StyledSelect
            value={record.entity_type}
            onChange={(newValue: unknown) => {
              const index = data.findIndex(row => row.urn === record.urn);
              if (index !== -1) {
                const updatedData = [...data];
                updatedData[index].entity_type = newValue as string;
                onChange(updatedData);
              }
            }}
            style={{ width: '100%' }}
          >
            <Option value="glossaryTerm">Term</Option>
            <Option value="glossaryNode">Node</Option>
          </StyledSelect>
        )
      ),
    },
    {
      title: 'URN (Optional)',
      key: 'urn',
      width: '200px',
      render: (record: FlatRow) => (
        isReadOnly ? (
          <Text code style={{ fontSize: '12px' }}>{record.urn || '(empty)'}</Text>
        ) : (
          <StyledInput
            value={record.urn}
            onChange={e => {
              const index = data.findIndex(row => row.urn === record.urn);
              if (index !== -1) {
                const updatedData = [...data];
                updatedData[index].urn = e.target.value;
                onChange(updatedData);
              }
            }}
            placeholder="urn:li:glossaryTerm:..."
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
          />
        )
      ),
    },
    {
      title: 'Name',
      key: 'name',
      width: '150px',
      render: (record: FlatRow) => (
        isReadOnly ? (
          <Text>{record.name || '(empty)'}</Text>
        ) : (
          <StyledInput
            value={record.name}
            onChange={e => {
              const index = data.findIndex(row => row.urn === record.urn);
              if (index !== -1) {
                const updatedData = [...data];
                updatedData[index].name = e.target.value;
                onChange(updatedData);
              }
            }}
            placeholder="Term name"
          />
        )
      ),
    },
    {
      title: 'Parent Nodes',
      key: 'parent_nodes',
      width: '150px',
      render: (record: FlatRow) => (
        isReadOnly ? (
          <Text>{record.parent_nodes || '(empty)'}</Text>
        ) : (
          <StyledInput
            value={record.parent_nodes}
            onChange={e => {
              const index = data.findIndex(row => row.urn === record.urn);
              if (index !== -1) {
                const updatedData = [...data];
                updatedData[index].parent_nodes = e.target.value;
                onChange(updatedData);
              }
            }}
            placeholder="Parent node names"
          />
        )
      ),
    },
    {
      title: 'Description',
      key: 'description',
      width: '200px',
      render: (record: FlatRow) => (
        isReadOnly ? (
          <Text>{record.description || '(empty)'}</Text>
        ) : (
          <StyledTextArea
            value={record.description}
            onChange={e => {
              const index = data.findIndex(row => row.urn === record.urn);
              if (index !== -1) {
                const updatedData = [...data];
                updatedData[index].description = e.target.value;
                onChange(updatedData);
              }
            }}
            placeholder="Description"
            rows={2}
          />
        )
      ),
    },
    {
      title: isReadOnly ? 'Import Status' : 'Status',
      key: 'status',
      width: '120px',
      render: (record: FlatRow, index: number) => {
        if (isReadOnly) {
          const importStatus = getImportStatus(record);
          if (importStatus) {
            return (
              <Tag color={importStatus.color} icon={importStatus.icon}>
                {importStatus.text}
              </Tag>
            );
          }
        }
        
        const status = getRowStatus(record);
        return (
          <Tag color={status.color} icon={status.icon}>
            {status.text}
          </Tag>
        );
      },
    },
    {
      title: 'Details',
      key: 'details',
      width: '80px',
      render: (record: FlatRow, index: number) => (
        <Button
          type="link"
          size="small"
          onClick={() => handleRowClick(record, index)}
          style={{ padding: '4px 8px' }}
        >
          View
        </Button>
      ),
    },
  ], [data, onChange, handleRowClick, getRowStatus, getImportStatus, isReadOnly]);

  return (
    <GridTableContainer>
      {/* Status Filter */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Text strong>Filter by Status:</Text>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 150 }}
          size="small"
        >
          <Option value="all">All ({data.length})</Option>
          <Option value="create">New ({data.filter(row => getRowStatus(row).action === 'create').length})</Option>
          <Option value="update">Modified ({data.filter(row => getRowStatus(row).action === 'update').length})</Option>
          <Option value="skip">No Change ({data.filter(row => getRowStatus(row).action === 'skip').length})</Option>
          <Option value="failed">Error ({data.filter(row => getRowStatus(row).action === 'failed').length})</Option>
        </Select>
      </div>
      
      <ScrollableTableWrapper>
        <Table
          columns={tableColumns}
          data={currentPageData}
          isLoading={false}
          isScrollable
          data-testid="glossary-terms-table"
        />
      </ScrollableTableWrapper>
      
      <PaginationContainer>
        <PageInfo>
          Showing {startIndex + 1}-{endIndex} of {filteredData.length} rows
          {statusFilter !== 'all' && ` (filtered from ${data.length} total)`}
        </PageInfo>
        <ActionButtons>
          {!isReadOnly && (
            <StyledButton type="primary" onClick={addRow}>
            Add Row
            </StyledButton>
          )}
          {!isReadOnly && selectedRows.size > 0 && (
            <StyledButton danger onClick={deleteSelectedRows}>
              Delete Selected ({selectedRows.size})
            </StyledButton>
          )}
        </ActionButtons>
        <StyledPagination
            current={currentPage}
          total={filteredData.length}
            pageSize={pageSize}
            onChange={handlePageChange}
            showSizeChanger={false}
            showQuickJumper
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
          />
      </PaginationContainer>

      <RowDetailsPanel
        isOpen={isDetailsPanelOpen}
        onClose={handleCloseDetailsPanel}
        row={selectedRow}
        rowIndex={selectedRowIndex}
        existingEntities={existingEntities}
        entityLookup={entityLookup}
        isImporting={isImporting}
      />
    </GridTableContainer>
  );
};