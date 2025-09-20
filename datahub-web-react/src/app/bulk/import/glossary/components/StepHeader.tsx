import React from 'react';
import { Steps } from 'antd';

interface StepHeaderProps {
  current: number;
  steps: Array<{
    title: string;
    description: string;
  }>;
}

export const StepHeader: React.FC<StepHeaderProps> = ({ current, steps }) => {
  return (
    <Steps
      current={current}
      items={steps.map(step => ({
        title: step.title,
        description: step.description
      }))}
    />
  );
};
