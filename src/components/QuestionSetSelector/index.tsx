import React, { useState, useEffect } from 'react';
import { QuestionSet, getQuestionSets, deleteQuestionSet, updateQuestionSetName, questionEvents } from '../../services/questionService';

interface QuestionSetSelectorProps {
  selectedSetId: string;
  onSelectSet: (setId: string) => void;
  showActions?: boolean;
}

const QuestionSetSelector: React.FC<QuestionSetSelectorProps> = ({ 
  selectedSetId, 
  onSelectSet,
  showActions = true
}) => {
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [selectedSet, setSelectedSet] = useState<QuestionSet | undefined>();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  
  // Load question sets
  useEffect(() => {
    const sets = getQuestionSets();
    setQuestionSets(sets);
    
    // If no set is selected, select the default one
    if (!selectedSetId && sets.length > 0) {
      onSelectSet(sets[0].id);
    }
    
    // Find the selected set
    const selected = sets.find(set => set.id === selectedSetId);
    setSelectedSet(selected);
    if (selected) {
      setEditName(selected.name);
    }
  }, [selectedSetId, onSelectSet]);

  // Subscribe to global set change events so the selector refreshes without page reload
  useEffect(() => {
    const refresh = () => {
      const sets = getQuestionSets();
      setQuestionSets(sets);
      const selected = sets.find(s => s.id === selectedSetId);
      setSelectedSet(selected);
    };

    // Some environments may not support EventTarget in SSR; guard addEventListener
    const anyEvents: any = questionEvents as any;
    if (anyEvents && typeof anyEvents.addEventListener === 'function') {
      anyEvents.addEventListener('setsChanged', refresh);
      anyEvents.addEventListener('setUpdated', refresh);
    }

    return () => {
      if (anyEvents && typeof anyEvents.removeEventListener === 'function') {
        anyEvents.removeEventListener('setsChanged', refresh);
        anyEvents.removeEventListener('setUpdated', refresh);
      }
    };
  }, [selectedSetId]);
  
  // Handle set selection change
  const handleSetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const setId = e.target.value;
    onSelectSet(setId);
    setIsEditing(false);
  };

  const handleUpdateName = () => {
    if (!selectedSetId || !editName.trim()) return;
    
    const success = updateQuestionSetName(selectedSetId, editName.trim());
    if (success) {
      setIsEditing(false);
    } else {
      alert('Failed to update set name.');
    }
  };
  
  // Handle set deletion
  const handleDeleteSet = () => {
    if (!selectedSetId) return;
    
    if (window.confirm('Are you sure you want to delete this question set?')) {
      const success = deleteQuestionSet(selectedSetId);
      
      if (success) {
        // Refresh the list of sets
        const updatedSets = getQuestionSets();
        setQuestionSets(updatedSets);
        
        // Select the default set
        if (updatedSets.length > 0) {
          onSelectSet(updatedSets[0].id);
        }
      }
    }
  };
  
  return (
    <div className="selector-container">
      <h3 className="selector-title">
        Question Set 
        <span className="tooltip-icon" title="A Question Set is a collection of interview questions (e.g., for a specific role or time period). You can switch between sets here.">ⓘ</span>
      </h3>
      <div className="select-wrapper">
        {isEditing ? (
          <div className="edit-name-wrapper">
            <input 
              type="text" 
              className="selector-edit-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
            />
            <button className="btn-save" onClick={handleUpdateName}>Save</button>
            <button className="btn-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        ) : (
          <>
            <select className="selector-select" value={selectedSetId} onChange={handleSetChange}>
              {questionSets.map(set => (
                <option key={set.id} value={set.id}>
                  {set.name}
                </option>
              ))}
            </select>
            {showActions && (
              <>
                <button 
                  className="btn-edit" 
                  onClick={() => {
                    const selected = questionSets.find(s => s.id === selectedSetId);
                    if (selected) setEditName(selected.name);
                    setIsEditing(true);
                  }}
                  title="Edit set name"
                >
                  Edit
                </button>
                <button 
                  className="btn-danger"
                  onClick={handleDeleteSet} 
                  disabled={!selectedSetId}
                  title="Delete this set"
                >
                  Delete
                </button>
              </>
            )}
          </>
        )}
      </div>
      {selectedSet && !isEditing && (
        <div className="set-info-text">
          {selectedSet.cards.length} questions in this set
        </div>
      )}
    </div>
  );
};

export default QuestionSetSelector;
