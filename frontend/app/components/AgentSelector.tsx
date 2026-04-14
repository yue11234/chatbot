import React from 'react';
import { Select } from 'antd';

interface AgentSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const AgentSelector: React.FC<AgentSelectorProps> = ({ value, onChange }) => {
  return (
    <Select
      value={value}
      className="ml-2 mr-5 w-36"
      onChange={onChange}
      options={[{ value: "paper-assistant", label: "论文知识库问答" }, { value: "multi-agent-supervisor", label: "多智能体" }]}
    />
  );
};

export default AgentSelector;