import React, { useState, useEffect } from 'react';
import { InterviewQuestion as InterviewQuestionType } from '../../types';
import InterviewQuestion, { CardWidth } from '../InterviewQuestion/index';
import { clearSetNotes, updateQuestionSetName } from '../../services/api';
import { exportCardsToPdf } from '../../services/pdfService';

interface QuestionDeckProps {
  cards: InterviewQuestionType[];
  selectedCandidateId?: string | number;
}

const QuestionDeck: React.FC<QuestionDeckProps> = ({ cards, selectedCandidateId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [widthSetting, setWidthSetting] = useState<CardWidth>('standard');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [currentSetName, setCurrentSetName] = useState('');

  // Reset to first card when cards list changes (e.g. when filtering)
  useEffect(() => {
    setCurrentIndex(0);
    if (cards.length > 0) {
      // Try to find set name if available on the card objects
      const firstCard = cards[0] as any;
      if (firstCard.set_name) {
        setCurrentSetName(firstCard.set_name);
      } else {
        // Fallback or fetch from elsewhere if needed
        setCurrentSetName('Interview Question Deck');
      }
    }
  }, [cards]);
  
  const goToNextCard = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  
  const goToPreviousCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleClearAllNotes = async () => {
    if (cards.length === 0) return;
    const firstCard = cards[0] as any;
    const setId = firstCard.set_id;

    if (!setId) {
      alert('Could not identify the card set to clear notes.');
      return;
    }

    if (window.confirm('Are you sure you want to remove ALL interview notes from this deck?')) {
      try {
        await clearSetNotes(setId);
        cards.forEach(c => c.note = undefined);
        alert('All notes cleared.');
      } catch (err) {
        alert('Failed to clear notes.');
      }
    }
  };
  
  if (!cards || cards.length === 0) {
    return (
      <div className="deck-container">
        <div className="empty-state-container" style={{ textAlign: 'center', padding: '60px 40px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🗃️</div>
          <h3 style={{ marginBottom: '10px', color: '#1a2b49' }}>No Questions Found</h3>
          <p style={{ color: '#666', marginBottom: '25px', maxWidth: '400px', margin: '0 auto 25px' }}>
            There are no interview questions available for the selected filters, or the current set is empty.
          </p>
          <div className="flex-center-gap">
            <a href="/generator" className="btn-primary" style={{ textDecoration: 'none' }}>
              Go to Question Generator
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  const safeIndex = Math.min(currentIndex, cards.length - 1);
  
  const handleExportPdf = () => {
    exportCardsToPdf(cards, currentSetName || 'Interview Flash Cards Deck');
  };

  const handleUpdateName = async () => {
    if (!newName.trim() || !cards.length) return;
    
    const firstCard = cards[0] as any;
    const setId = firstCard.set_id;
    
    if (!setId) {
      alert('Could not identify the card set to update.');
      return;
    }

    try {
      await updateQuestionSetName(setId, newName.trim());
      setCurrentSetName(newName.trim());
      setIsEditingName(false);
      // Trigger a refresh of the set selector if possible
      try {
        const { questionEvents } = require('../../services/questionService');
        questionEvents.dispatchEvent(new Event('setsChanged'));
      } catch (e) {}
    } catch (err) {
      alert('Failed to update deck name.');
    }
  };

  return (
    <div className={`deck-container ${widthSetting}`}>
      <div className="deck-header">
        {isEditingName ? (
          <div className="name-edit-container">
            <input 
              type="text" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)}
              className="name-edit-input"
              autoFocus
            />
            <button className="btn-primary-small" onClick={handleUpdateName}>Save</button>
            <button className="btn-secondary-small" onClick={() => setIsEditingName(false)}>Cancel</button>
          </div>
        ) : (
          <div className="name-display-container">
            <h2>{currentSetName}</h2>
            <button 
              className="btn-text-edit" 
              onClick={() => {
                setNewName(currentSetName);
                setIsEditingName(true);
              }}
              title="Edit deck name"
            >
              ✎ Edit Name
            </button>
          </div>
        )}
      </div>

      <div className="controls-container">
        <div className="width-controls">
          <span style={{ fontSize: '14px', alignSelf: 'center', marginRight: '5px', fontWeight: 600, color: '#666' }}>Card Width:</span>
          <button 
            className={`width-button ${widthSetting === 'standard' ? 'active' : ''}`}
            onClick={() => setWidthSetting('standard')}
          >
            Standard
          </button>
          <button 
            className={`width-button ${widthSetting === 'wide' ? 'active' : ''}`}
            onClick={() => setWidthSetting('wide')}
          >
            Wide
          </button>
          <button 
            className={`width-button ${widthSetting === 'full' ? 'active' : ''}`}
            onClick={() => setWidthSetting('full')}
          >
            Page Width
          </button>
        </div>

        <div className="action-buttons">
          <button className="action-button" onClick={handleExportPdf}>
            Export Deck to PDF
          </button>
        </div>
      </div>

      <InterviewQuestion 
        card={cards[safeIndex]} 
        widthSetting={widthSetting} 
        selectedCandidateId={selectedCandidateId}
      />
      <div className="card-counter">
        Card {safeIndex + 1} of {cards.length}
      </div>
      <div className="navigation-buttons" style={{ maxWidth: widthSetting === 'standard' ? '600px' : widthSetting === 'wide' ? '1000px' : '100%' }}>
        <button 
          className="nav-button"
          onClick={goToPreviousCard} 
          disabled={safeIndex === 0}
        >
          Previous
        </button>
        <button 
          className="nav-button"
          onClick={goToNextCard} 
          disabled={safeIndex === cards.length - 1}
        >
          Next
        </button>
      </div>

      {cards.some(c => c.note) && (
        <button className="btn-danger-outline" onClick={handleClearAllNotes}>
          Remove All Notes from this Deck
        </button>
      )}
    </div>
  );
};

export default QuestionDeck;
