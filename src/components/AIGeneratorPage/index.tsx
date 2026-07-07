import React from 'react';
import AIQuestionGenerator from '../AIQuestionGenerator/index';
import { InterviewQuestion } from '../../types';
import { addQuestionSet, getQuestionSets, addQuestionToSet } from '../../services/questionService';
import { saveDeck } from '../../services/api';

interface AIGeneratorPageProps {
  onQuestionsGenerated: () => void;
  user: any;
}

const AIGeneratorPage: React.FC<AIGeneratorPageProps> = ({ onQuestionsGenerated, user }) => {
  const handleQuestionsGenerated = async (questions: InterviewQuestion[], setName: string) => {
    // Check if a question set with the same name already exists
    const existingSets = getQuestionSets();
    const existingSet = existingSets.find(s => s.name === setName);

    if (existingSet) {
      // Append new questions to the existing set
      for (const question of questions) {
        addQuestionToSet(existingSet.id, {
          role: question.role,
          topic: question.topic,
          skillLevel: question.skillLevel,
          question: question.question,
          answer: question.answer,
          codingExample: question.codingExample,
          challenges: question.challenges
        });
      }
    } else {
      // Add the generated questions as a new set locally
      addQuestionSet(setName, questions);
    }
    
    // Also save to server if logged in
    if (user) {
      try {
        // If it's an existing set, we need to send ALL cards to /decks/save because it overwrites
        const cardsToSave = existingSet 
          ? getQuestionSets().find(s => s.id === existingSet.id)?.cards || questions
          : questions;
        
        await saveDeck(setName, cardsToSave);
      } catch (e) {
        console.error('Failed to save questions to server:', e);
        alert('Failed to save questions to library: ' + (e as Error).message);
      }
    }
    
    // Notify the parent component that new questions have been generated
    onQuestionsGenerated();
  };
  
  return (
    <div className="page-container">
      <h2 className="selector-title" style={{ textAlign: 'center', marginBottom: '20px' }}>Interview Question Generator</h2>
      <AIQuestionGenerator onQuestionsGenerated={handleQuestionsGenerated} />
    </div>
  );
};

export default AIGeneratorPage;
