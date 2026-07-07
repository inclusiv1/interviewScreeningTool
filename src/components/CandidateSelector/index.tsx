import React, { useState, useEffect } from 'react';
import { fetchCandidates, createCandidate, deleteCandidate } from '../../services/api';

interface Candidate {
  id: number;
  name: string;
}

interface CandidateSelectorProps {
  selectedCandidateId: string | number | undefined;
  onSelectCandidate: (id: string | number | undefined) => void;
}

const CandidateSelector: React.FC<CandidateSelectorProps> = ({ 
  selectedCandidateId, 
  onSelectCandidate 
}) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    try {
      const data = await fetchCandidates();
      setCandidates(data);
    } catch (err: any) {
      console.error('Failed to load candidates:', err);
    }
  };

  const handleCreateCandidate = async () => {
    if (!newName.trim()) return;
    try {
      const result = await createCandidate(newName.trim());
      setCandidates([result, ...candidates]);
      onSelectCandidate(result.id);
      setNewName('');
      setIsAdding(false);
    } catch (err: any) {
      alert(`Failed to create candidate: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteCandidate = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this candidate? All their specific notes will be lost.')) {
      try {
        await deleteCandidate(id);
        setCandidates(candidates.filter(c => c.id !== id));
        if (selectedCandidateId === id) {
          onSelectCandidate(undefined);
        }
      } catch (err: any) {
        alert(`Failed to delete candidate: ${err.message || 'Unknown error'}`);
      }
    }
  };

  return (
    <div className="selector-container">
      <h3 className="selector-title">
        Interviewee 
        <span className="tooltip-icon" title="Select the person you are currently interviewing. Notes will be saved specifically for them.">ⓘ</span>
      </h3>
      <div className="select-wrapper">
        <select 
          className="selector-select" 
          value={selectedCandidateId || ''} 
          onChange={(e) => onSelectCandidate(e.target.value || undefined)}
        >
          <option value="">-- General Notes --</option>
          {candidates.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button 
          className="btn-edit" 
          onClick={() => setIsAdding(true)}
          title="Add new candidate"
        >
          + New
        </button>
        {selectedCandidateId && (
          <button 
            className="btn-danger"
            onClick={(e) => handleDeleteCandidate(e, Number(selectedCandidateId))}
            title="Delete this candidate"
          >
            Delete
          </button>
        )}
      </div>
      {isAdding && (
        <div className="modal-overlay" onClick={() => setIsAdding(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="selector-title">Add New Interviewee</h3>
            <div className="form-group" style={{ marginTop: '15px' }}>
              <input 
                type="text" 
                className="form-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Candidate Name"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCandidate()}
              />
            </div>
            <div className="flex-center-gap" style={{ marginTop: '20px' }}>
              <button className="btn-primary" onClick={handleCreateCandidate}>Add Candidate</button>
              <button className="btn-cancel" onClick={() => setIsAdding(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {selectedCandidateId && (
        <div className="set-info-text" style={{ color: '#00aed9', fontWeight: 'bold' }}>
          Recording notes for: {candidates.find(c => String(c.id) === String(selectedCandidateId))?.name}
        </div>
      )}
    </div>
  );
};

export default CandidateSelector;
