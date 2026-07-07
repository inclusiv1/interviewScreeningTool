import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import InterviewQuestion from '../InterviewQuestion/index';
import { getQuestionSets } from '../../services/questionService';
import { fetchDefaultQuestions } from '../../services/api';
import { InterviewQuestion as InterviewQuestionType } from '../../types';

const SingleCardView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const cardId = parseInt(id || '0', 10);
  const [foundCard, setFoundCard] = useState<InterviewQuestionType | null>(null);
  const [loading, setLoading] = useState(true);

  // Parse candidateId from query string
  const queryParams = new URLSearchParams(location.search);
  const candidateId = queryParams.get('candidateId') || undefined;
  
  useEffect(() => {
    const loadCard = async () => {
      setLoading(true);
      try {
        // First try to find in current loaded sets (might not have candidate notes)
        const allSets = getQuestionSets();
        let card: any = null;
        for (const set of allSets) {
          card = set.cards.find(c => c.id === cardId);
          if (card) break;
        }

        // If we have a candidateId, we MUST fetch from server to get the correct note
        if (candidateId) {
          const cards = await fetchDefaultQuestions(candidateId);
          const serverCard = cards.find(c => c.id === cardId);
          if (serverCard) {
            card = serverCard;
          }
        }

        setFoundCard(card);
      } catch (err) {
        console.error('Failed to load card:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCard();
  }, [cardId, candidateId]);
  
  if (loading) {
    return <div className="text-center-padding">Loading...</div>;
  }

  if (!foundCard) {
    return (
      <div className="text-center-padding">
        <h2>Interview question not found</h2>
        <Link to="/" className="link-accent">Back to Screening</Link>
      </div>
    );
  }
  
  return (
    <div className="container-narrow">
      <InterviewQuestion card={foundCard} widthSetting="full" selectedCandidateId={candidateId} />
      <div className="text-center-mt20">
        <Link to="/" className="link-back">&larr; Back to Screening</Link>
      </div>
    </div>
  );
};

export default SingleCardView;
