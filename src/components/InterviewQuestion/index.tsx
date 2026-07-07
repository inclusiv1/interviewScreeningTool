import React, { useState, useEffect } from 'react';
import { InterviewQuestion as FlashCardType } from '../../types';
import MarkdownRenderer from '../MarkdownRenderer/index';
import { updateQuestionNote, deleteQuestionNote } from '../../services/api';

export type CardWidth = 'standard' | 'wide' | 'full';

interface InterviewQuestionProps {
  card: FlashCardType;
  widthSetting?: CardWidth;
  selectedCandidateId?: string | number;
}

const InterviewQuestion: React.FC<InterviewQuestionProps> = ({ card, widthSetting = 'standard', selectedCandidateId }) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(card?.note || '');

  useEffect(() => {
    setNoteText(card?.note || '');
    setIsEditingNote(false);
  }, [card]);

  const toggleAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  const handleSaveNote = async () => {
    if (!card) return;
    try {
      await updateQuestionNote(card.id, noteText, selectedCandidateId);
      card.note = noteText; // Update local object
      setIsEditingNote(false);
    } catch (err) {
      alert('Failed to save note');
    }
  };

  const handleDeleteNote = async () => {
    if (!card) return;
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteQuestionNote(card.id);
        card.note = undefined; // Update local object
        setNoteText('');
        setIsEditingNote(false);
      } catch (err) {
        alert('Failed to delete note');
      }
    }
  };

  // Handle case where card is undefined
  if (!card) {
    return (
      <div className={`card-container ${widthSetting}`}>
        <div className="question-section">
          <div className="card-content-inner">
            <h2 className="question-text">Card not available</h2>
          </div>
        </div>
      </div>
    );
  }

  // Helpers to detect and parse conversation-style answers
  const isConversation = (text: string): boolean => {
    if (!text) return false;
    const lower = text.toLowerCase();
    return lower.includes('interviewer:') || lower.includes('candidate:');
  };

  type Turn = { role: 'Interviewer' | 'Candidate'; text: string };

  const parseConversation = (text: string): Turn[] => {
    if (!text) return [];
    let t = text.trim();
    // Strip enclosing quotes or code fences if present
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      t = t.slice(1, -1);
    }
    t = t.replace(/```(?:json)?\n?|```/g, '').trim();

    const lines = t.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const turns: Turn[] = [];
    const re = /^\s*"?(interviewer|candidate)\s*[:\-–]\s*"?/i;
    for (const line of lines) {
      const m = line.match(re);
      if (m) {
        const roleRaw = m[1].toLowerCase();
        const role: Turn['role'] = roleRaw === 'interviewer' ? 'Interviewer' : 'Candidate';
        const textPart = line.replace(re, '').trim().replace(/^"|"$/g, '');
        turns.push({ role, text: textPart });
      }
    }
    return turns;
  };

  const renderAnswer = (answer: string) => {
    if (isConversation(answer)) {
      const turns = parseConversation(answer);
      if (turns.length >= 2) {
        return (
          <div className="dialogue-container">
            {turns.map((turn, idx) => (
              <div key={idx} className={`turn-row ${turn.role.toLowerCase()}`}>
                <span className={`role-badge-pill ${turn.role.toLowerCase()}`}>{turn.role}</span>
                <div className="turn-text-content">{turn.text}</div>
              </div>
            ))}
          </div>
        );
      }
      // Fallback to raw if parsing failed
    }
    return <MarkdownRenderer content={answer} />;
  };

  return (
    <div className={`card-container ${widthSetting}`}>
      <div className="question-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="topic-badge-absolute">{card.topic}</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a2b49', backgroundColor: '#e2e8f0', padding: '4px 8px', borderRadius: '4px' }}>
            {card.role} • {card.skillLevel}
          </div>
        </div>
        <div className="card-content-inner">
          <h2 className="question-text">{card.question}</h2>
          <button className="btn-primary" onClick={toggleAnswer} style={{ padding: '10px 20px', fontSize: '16px', marginTop: '20px' }}>
            {showAnswer ? 'Hide Answer' : 'Show Answer'}
          </button>
        </div>
      </div>
      <div className={`answer-section ${showAnswer ? 'open' : ''}`}>
        <div className="answer-container-inner">
          {renderAnswer(card.answer)}

          {card.codingExample && (
            <div className="coding-example-section">
              <h4 className="section-title-small">
                <span role="img" aria-label="code">💻</span> Coding Example
              </h4>
              <MarkdownRenderer content={card.codingExample} />
            </div>
          )}

          {card.challenges && (
            <div className="challenges-section">
              <h4 className="section-title-small">
                <span role="img" aria-label="warning">⚠️</span> Challenges & Pitfalls
              </h4>
              <MarkdownRenderer content={card.challenges} />
            </div>
          )}
          
          <div className="note-section">
            <div className="note-header">
              <h4 className="note-title">
                {selectedCandidateId ? 'Candidate Notes' : 'Interview Notes'}
              </h4>
              {!isEditingNote && (
                <div className="note-actions">
                  <button className="btn-note-action" onClick={() => setIsEditingNote(true)}>
                    {card.note ? 'Edit Note' : 'Add Note'}
                  </button>
                  {card.note && (
                    <button className="btn-note-action" style={{ color: '#e74c3c' }} onClick={handleDeleteNote}>
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>

            {isEditingNote ? (
              <div>
                <textarea 
                  className="note-textarea"
                  value={noteText} 
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add your thoughts or extra info for this interview question..."
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn-primary" onClick={handleSaveNote} style={{ marginTop: 0, padding: '5px 15px', fontSize: '14px' }}>
                    Save Note
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      setIsEditingNote(false);
                      setNoteText(card.note || '');
                    }} 
                    style={{ marginTop: 0, padding: '5px 15px', fontSize: '14px', backgroundColor: '#999' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              card.note && (
                <div className="note-content-box">
                  <MarkdownRenderer content={card.note} />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewQuestion;
