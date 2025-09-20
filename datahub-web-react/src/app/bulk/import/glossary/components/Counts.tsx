import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';

interface CountsProps {
  counts: {
    total: number;
    new: number;
    updated: number;
    existing: number;
  };
}

export const Counts: React.FC<CountsProps> = ({ counts }) => {
  return (
    <Card style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={6}>
          <Statistic title="Total" value={counts.total} />
        </Col>
        <Col span={6}>
          <Statistic title="New" value={counts.new} valueStyle={{ color: '#3f8600' }} />
        </Col>
        <Col span={6}>
          <Statistic title="Updated" value={counts.updated} valueStyle={{ color: '#1890ff' }} />
        </Col>
        <Col span={6}>
          <Statistic title="Existing" value={counts.existing} valueStyle={{ color: '#8c8c8c' }} />
        </Col>
      </Row>
    </Card>
  );
};
