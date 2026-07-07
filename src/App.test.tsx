import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import * as api from './services/api';
import * as questionService from './services/questionService';

// Mock components that might be problematic or slow
vi.mock('./components/layout/Header', () => ({ default: () => <div>Header</div> }));
vi.mock('./components/layout/Navigation', () => ({ default: () => <div>Navigation</div> }));
vi.mock('./components/layout/Footer', () => ({ default: () => <div>Footer</div> }));

// Mock API services
vi.mock('./services/api', () => ({
  fetchDefaultQuestions: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
  generateQuestionsForTopicFromServer: vi.fn(),
  fetchCandidates: vi.fn().mockResolvedValue([]),
}));

vi.mock('./services/questionService', () => ({
  getQuestionSetById: vi.fn(),
  getQuestionSets: vi.fn(),
  questionEvents: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
}));

// Mock fileSystemService
vi.mock('./services/fileSystemService', () => ({
  saveJsonFile: vi.fn(),
  DEFAULT_FILENAME: 'default.json',
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchDefaultQuestions).mockResolvedValue([]);
    vi.mocked(api.getCurrentUser).mockReturnValue({ username: 'testuser' });
    vi.mocked(questionService.getQuestionSets).mockReturnValue([]);
  });

  it('renders correctly', async () => {
    render(<App />);
    
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('fetches default questions on mount', async () => {
    const mockCards = [{ 
      id: 1, 
      question: 'Q1', 
      role: 'Developer', 
      topic: 'React', 
      skillLevel: 'Intermediate', 
      answer: 'A1' 
    }];
    vi.mocked(api.fetchDefaultQuestions).mockResolvedValue(mockCards as any);
    
    render(<App />);
    
    await waitFor(() => {
      expect(api.fetchDefaultQuestions).toHaveBeenCalled();
    });
  });
});
