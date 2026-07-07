import React from 'react';
import { InterviewQuestion } from '../../types';

interface TopicSelectorProps {
  cards: InterviewQuestion[];
  selectedRole: string | null;
  onSelectRole: (role: string | null) => void;
  selectedTopic: string | null;
  onSelectTopic: (topic: string | null) => void;
}

const TopicSelector: React.FC<TopicSelectorProps> = ({ 
  cards, 
  selectedRole,
  onSelectRole,
  selectedTopic, 
  onSelectTopic 
}) => {
  // Get unique roles and topics
  const roleCounts = cards.reduce((acc, card) => {
    const role = card.role || 'Uncategorized';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredForTopics = selectedRole 
    ? cards.filter(c => c.role === selectedRole)
    : cards;

  const topicCounts = filteredForTopics.reduce((acc, card) => {
    const topic = card.topic || 'General';
    acc[topic] = (acc[topic] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const roles = Object.keys(roleCounts).sort();
  const topics = Object.keys(topicCounts).sort();

  return (
    <div className="topic-selector-container">
      <h3 className="topic-selector-title">Filter by Role</h3>
      <div className="topic-buttons-container">
        <button 
          className={`topic-button ${selectedRole === null ? 'selected' : ''}`}
          onClick={() => {
            onSelectRole(null);
            onSelectTopic(null);
          }}
        >
          All Roles
        </button>
        
        {roles.map(role => (
          <button 
            key={role}
            className={`topic-button ${selectedRole === role ? 'selected' : ''}`}
            onClick={() => {
              onSelectRole(role);
              onSelectTopic(null);
            }}
          >
            {role}
            <span className="card-count-indicator" style={selectedRole === role ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } : undefined}>
              {roleCounts[role]}
            </span>
          </button>
        ))}
      </div>

      {selectedRole && (
        <>
          <h3 className="topic-selector-title" style={{ marginTop: '20px' }}>Filter by Skill</h3>
          <div className="topic-buttons-container">
            <button 
              className={`topic-button ${selectedTopic === null ? 'selected' : ''}`}
              onClick={() => onSelectTopic(null)}
            >
              All Skills
            </button>
            
            {topics.map(topic => (
              <button 
                key={topic}
                className={`topic-button ${selectedTopic === topic ? 'selected' : ''}`}
                onClick={() => onSelectTopic(topic)}
              >
                {topic}
                <span className="card-count-indicator" style={selectedTopic === topic ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } : undefined}>
                  {topicCounts[topic]}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TopicSelector;
