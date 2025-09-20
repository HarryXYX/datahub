import React from 'react';
import { UploadOutlined } from '@ant-design/icons';
import { 
  DropzoneTableContainer, 
  DropzoneContent, 
  DropzoneIcon, 
  DropzoneText, 
  DropzoneSubtext 
} from '../styledComponents';

interface DropzoneTableProps {
  onFileSelect: (file: File) => void;
}

const DropzoneTable: React.FC<DropzoneTableProps> = ({ onFileSelect }) => {
  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onFileSelect(file);
      }
    };
    input.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.name.endsWith('.csv'));
    
    if (csvFile) {
      onFileSelect(csvFile);
    }
  };

  return (
    <DropzoneTableContainer
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <DropzoneContent>
        <DropzoneIcon>
          <UploadOutlined style={{ fontSize: '24px' }} />
        </DropzoneIcon>
        <DropzoneText>Upload CSV File</DropzoneText>
        <DropzoneSubtext>
          Click to browse or drag and drop your CSV file here
        </DropzoneSubtext>
      </DropzoneContent>
    </DropzoneTableContainer>
  );
};

export default DropzoneTable;
