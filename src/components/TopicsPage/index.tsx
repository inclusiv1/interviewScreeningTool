import React from 'react';
import { InterviewQuestion } from '../../types';
import { useNavigate } from 'react-router-dom';
import { deleteRole } from '../../services/api';

interface TopicsPageProps {
  cards: InterviewQuestion[];
  isAdmin?: boolean;
  onRefresh?: () => void;
}

const TopicsPage: React.FC<TopicsPageProps> = ({ cards, isAdmin, onRefresh }) => {
  const navigate = useNavigate();

  const handleDeleteRole = async (e: React.MouseEvent, role: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete the entire role "${role}" and all its questions?`)) {
      try {
        await deleteRole(role);
        if (onRefresh) onRefresh();
      } catch (err) {
        alert('Failed to delete role: ' + (err as Error).message);
      }
    }
  };
  
  // Group by role
  const roleGroups = cards.reduce((acc, card) => {
    const role = card.role || 'Uncategorized';
    if (!acc[role]) {
      acc[role] = {
        skills: {} as Record<string, { count: number; level: string }>,
        total: 0
      };
    }
    acc[role].total += 1;
    const skill = card.topic || 'General';
    if (!acc[role].skills[skill]) {
      acc[role].skills[skill] = { count: 0, level: card.skillLevel || 'N/A' };
    }
    acc[role].skills[skill].count += 1;
    return acc;
  }, {} as Record<string, { total: number; skills: Record<string, { count: number; level: string }> }>);

  const sortedRoles = Object.keys(roleGroups).sort();
  
  const handleRoleClick = (role: string) => {
    navigate('/', { state: { selectedRole: role } });
  };

  const handleSkillClick = (role: string, skill: string) => {
    navigate('/', { state: { selectedRole: role, selectedTopic: skill } });
  };

  return (
    <div className="page-container">
      <h1 className="title-center">Interview Roles & Skills</h1>
      
      <div className="info-box" style={{ marginBottom: '30px', textAlign: 'center' }}>
        Questions are categorized by <strong>Role</strong> (e.g., Frontend Engineer) and specific <strong>Skills</strong> (e.g., React, CSS).
        Click on a role or skill to filter the questions on the screening page.
      </div>

      <div className="flex-column-gap30">
        <div className="topic-card" onClick={() => navigate('/', { state: { selectedRole: '' } })} style={{ maxWidth: '300px' }}>
          <h3 className="topic-name">All Roles</h3>
          <div className="card-count-badge">{cards.length} Questions</div>
        </div>
        
        {sortedRoles.map(role => (
          <div key={role} className="role-container">
            <div className="role-header" onClick={() => handleRoleClick(role)}>
              <div className="role-header-left">
                <h3 className="topic-name" style={{ margin: 0, color: '#1a2b49' }}>{role}</h3>
                {isAdmin && (
                  <button 
                    onClick={(e) => handleDeleteRole(e, role)}
                    className="btn-danger-small"
                  >
                    Delete Role
                  </button>
                )}
              </div>
              <div className="card-count-badge">{roleGroups[role].total} Questions</div>
            </div>
            
            <div className="topics-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
              {Object.keys(roleGroups[role].skills).sort().map(skill => (
                <div 
                  key={skill} 
                  className="topic-card skill-card-content"
                  onClick={() => handleSkillClick(role, skill)}
                >
                  <div className="skill-name">{skill}</div>
                  <div className="skill-level">
                    Level: {roleGroups[role].skills[skill].level}
                  </div>
                  <div className="skill-count">
                    {roleGroups[role].skills[skill].count} Questions
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopicsPage;
