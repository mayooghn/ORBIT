import React from 'react';
import { OrbitChatAssistant } from '../components/assistant/OrbitChatAssistant';

interface AiAssistantPageProps {
  onNavigate?: (path: string) => void;
}

export const AiAssistantPage: React.FC<AiAssistantPageProps> = ({ onNavigate }) => {
  return (
    <div className="w-full pb-4">
      {/* Primary Operational Assistant Interface */}
      <OrbitChatAssistant onNavigate={onNavigate} />
    </div>
  );
};
