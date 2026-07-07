import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import QuestionDeck from './components/QuestionDeck/index';
import TopicSelector from './components/TopicSelector/index';
import TopicsPage from './components/TopicsPage/index';
import QuestionSetSelector from './components/QuestionSetSelector/index';
import CandidateSelector from './components/CandidateSelector/index';
import AIGeneratorPage from './components/AIGeneratorPage/index';
import AuthModal from './components/AuthModal/index';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import Footer from './components/layout/Footer';
import SingleCardView from './components/SingleCardView/index';
import { getQuestionSetById, getQuestionSets } from './services/questionService';
import { fetchDefaultQuestions, generateQuestionsForTopicFromServer, getCurrentUser, logout } from './services/api';
import { saveJsonFile, DEFAULT_FILENAME } from './services/fileSystemService';

const AppContent: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedSetId, setSelectedSetId] = useState<string>('default');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | number | undefined>();
  const [currentCards, setCurrentCards] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [user, setUser] = useState<any>(getCurrentUser());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const location = useLocation();

  const isAdmin = user?.isAdmin || false;

  const refreshCards = async () => {
    try {
      let cards = await fetchDefaultQuestions(selectedCandidateId);
      if (!Array.isArray(cards)) {
        cards = [];
      }
      
      // If we are currently using a specific set (not just the "default" view from server),
      // we should filter the cards by that set_id if the server returned set info.
      // Note: server's fetchDefaultQuestions currently returns ALL cards for user.
      const set = getQuestionSetById(selectedSetId);
      if (set && selectedSetId !== 'default') {
        // If the set has its own cards and we just wanted to refresh notes, 
        // we should keep the set's cards but merge notes from the fetched cards.
        const refreshedCards = set.cards.map(setCard => {
          const match = cards.find(c => c.id === setCard.id);
          return match ? { ...setCard, note: match.note } : setCard;
        });
        setCurrentCards(refreshedCards);
      } else {
        setCurrentCards(cards);
      }
    } catch (e) {
      console.error('Failed to refresh cards:', e);
    }
  };
  
  useEffect(() => {
    const ensureDefault = async () => {
      try {
        const cards = await fetchDefaultQuestions(selectedCandidateId);
        const cardsArray = Array.isArray(cards) ? cards : [];

        const defaultSet = {
          id: 'default',
          name: 'Interview Questions',
          filename: DEFAULT_FILENAME,
          cards: cardsArray,
        };
        saveJsonFile(DEFAULT_FILENAME, defaultSet);
        setSelectedSetId('default');
        setCurrentCards(cardsArray);
      } catch (e) {
        console.error('Failed to fetch default flashcards from server:', e);
        // Fallback to local sets if server fails
        const sets = getQuestionSets();
        if (sets.length > 0) {
          setSelectedSetId(sets[0].id);
          setCurrentCards(sets[0].cards);
        } else {
          const defaultSet = {
            id: 'default',
            name: 'Interview Questions',
            filename: DEFAULT_FILENAME,
            cards: [],
          };
          saveJsonFile(DEFAULT_FILENAME, defaultSet);
          setSelectedSetId('default');
          setCurrentCards([]);
        }
      }
    };
    // fire and forget
    void ensureDefault();
  }, [user]);

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  // Load the selected interview question set
  useEffect(() => {
    const set = getQuestionSetById(selectedSetId);
    if (set) {
      // Reset role and topic when set changes, as they might not be valid for the new set
      setSelectedRole(null);
      setSelectedTopic(null);
      
      // If we have a candidate, we should probably fetch the cards again to get their notes
      // even if the set ID didn't change, but here we are in the set ID effect.
      if (selectedCandidateId) {
        refreshCards();
      } else {
        setCurrentCards(set.cards);
      }
    } else {
      // If set not found, load the first available set
      const sets = getQuestionSets();
      if (sets.length > 0) {
        setSelectedSetId(sets[0].id);
        setCurrentCards(sets[0].cards);
      }
    }
  }, [selectedSetId]);
  
  // Refresh cards when candidate changes
  useEffect(() => {
    refreshCards();
  }, [selectedCandidateId]);

  // Check if a role or topic was selected from the TopicsPage
  useEffect(() => {
    if (location.state) {
      if (location.state.selectedRole !== undefined) {
        const roleFromNavigation = location.state.selectedRole === '' 
          ? null 
          : location.state.selectedRole;
        setSelectedRole(roleFromNavigation);
      }
      
      if (location.state.selectedTopic !== undefined) {
        const topicFromNavigation = location.state.selectedTopic === '' 
          ? null 
          : location.state.selectedTopic;
        setSelectedTopic(topicFromNavigation);
      }
      
      // Clear the location state to avoid reapplying on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  
  // Filter cards based on selected role and topic
  const filteredCards = currentCards.filter((card: any) => {
    const roleMatch = !selectedRole || card.role === selectedRole;
    const topicMatch = !selectedTopic || card.topic === selectedTopic;
    return roleMatch && topicMatch;
  });
  
  // Handle when new interview questions are generated
  const handleQuestionsGenerated = () => {
    // Refresh the current cards from the selected set
    const set = getQuestionSetById(selectedSetId);
    if (set) {
      setCurrentCards(set.cards);
    }
  };

  // Generate AI questions for the currently selected topic and append to current set
  const handleGenerateForTopic = async () => {
    if (!selectedTopic) {
      alert('Please select a topic first.');
      return;
    }
    setIsGenerating(true);
    try {
      const newCards = await generateQuestionsForTopicFromServer(selectedTopic);
      if (!newCards || newCards.length === 0) {
        alert('The AI did not return any questions.');
        return;
      }
      // Append to current set persistently
      const set = getQuestionSetById(selectedSetId);
      if (!set) {
        alert('No question set selected.');
        return;
      }
      // Use service to add one by one so IDs are reassigned sequentially
      for (const c of newCards) {
        const { addQuestionToSet } = await import('./services/questionService');
        addQuestionToSet(set.id, { 
          role: c.role, 
          topic: c.topic, 
          skillLevel: c.skillLevel, 
          question: c.question, 
          answer: c.answer,
          codingExample: c.codingExample,
          challenges: c.challenges
        });
      }
      // Refresh
      handleQuestionsGenerated();
    } catch (e: any) {
      console.error('Failed to generate AI questions for topic:', e);
      alert(e?.message || 'Failed to generate AI questions. Check the server and API key.');
    } finally {
      setIsGenerating(false);
    }
  };
    
  if (!user) {
    return (
      <div className="app-container">
        <Header />
        <main className="main-content">
          <AuthModal 
            onClose={() => {}} 
            onLoginSuccess={handleLoginSuccess} 
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header />
      <Navigation user={user} handleLogout={handleLogout} setShowAuthModal={setShowAuthModal} />

      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onLoginSuccess={handleLoginSuccess} 
        />
      )}
      
      <main className="main-content">
        {location.pathname !== '/generator' && (
          <div className="flex-center-gap" style={{ alignItems: 'flex-start', marginBottom: '20px' }}>
            <QuestionSetSelector 
              key={`${selectedSetId}-${currentCards.length}`}
              selectedSetId={selectedSetId}
              onSelectSet={setSelectedSetId}
              showActions={location.pathname === '/'}
            />
          </div>
        )}
        
        <Routes>
          <Route path="/" element={
            <>
                  <div className="flex-center-gap" style={{ flexDirection: 'column', alignItems: 'center' }}>
                    <CandidateSelector 
                      selectedCandidateId={selectedCandidateId}
                      onSelectCandidate={setSelectedCandidateId}
                    />
                    <div className="text-muted-small" style={{ marginTop: '-10px', marginBottom: '20px', maxWidth: '500px', textAlign: 'center' }}>
                      <strong>To assign an interviewee:</strong> Select an existing name from the dropdown or click <strong>+ New</strong> to add a candidate. Notes you take during the interview will be saved specifically for that person.
                    </div>
                  </div>
                  <TopicSelector 
                    cards={currentCards} 
                    selectedRole={selectedRole}
                    onSelectRole={setSelectedRole}
                    selectedTopic={selectedTopic} 
                    onSelectTopic={setSelectedTopic} 
                  />
                  <div className="flex-center-gap">
                    <button 
                      onClick={handleGenerateForTopic} 
                      disabled={!selectedTopic || isGenerating}
                      className="btn-primary"
                      style={{ cursor: (!selectedTopic || isGenerating) ? 'not-allowed' : 'pointer' }}
                    >
                      {isGenerating ? 'Generating…' : `Generate Interview Questions${selectedTopic ? ` for "${selectedTopic}"` : ''}`}
                    </button>
                    {!selectedTopic && (
                      <span className="text-muted-small">Select a skill to enable generation</span>
                    )}
                  </div>
              <QuestionDeck cards={filteredCards} selectedCandidateId={selectedCandidateId} />
            </>
          } />
          <Route path="/cards/:id" element={<SingleCardView />} />
          <Route path="/topics" element={<TopicsPage cards={currentCards} isAdmin={isAdmin} onRefresh={refreshCards} />} />
          <Route path="/generator" element={<AIGeneratorPage onQuestionsGenerated={handleQuestionsGenerated} user={user} />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
