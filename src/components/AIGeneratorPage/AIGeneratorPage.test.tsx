import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AIGeneratorPage from './index';
import * as questionService from '../../services/questionService';
import * as api from '../../services/api';

vi.mock('../AIQuestionGenerator/index', () => ({
  default: ({ onQuestionsGenerated }: any) => (
    <button onClick={() => onQuestionsGenerated([{ question: 'New Q' }], 'New Set')}>
      Mock Generate
    </button>
  ),
}));

vi.mock('../../services/questionService', () => ({
  getQuestionSets: vi.fn().mockReturnValue([]),
  addQuestionSet: vi.fn(),
  addQuestionToSet: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  saveDeck: vi.fn(),
}));

describe('AIGeneratorPage', () => {
  const mockOnQuestionsGenerated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a new question set when generated', async () => {
    render(<AIGeneratorPage onQuestionsGenerated={mockOnQuestionsGenerated} user={null} />);
    
    fireEvent.click(screen.getByText('Mock Generate'));
    
    expect(questionService.addQuestionSet).toHaveBeenCalledWith('New Set', expect.any(Array));
    expect(mockOnQuestionsGenerated).toHaveBeenCalled();
  });

  it('saves to server if user is logged in', async () => {
    const mockUser = { username: 'test' };
    render(<AIGeneratorPage onQuestionsGenerated={mockOnQuestionsGenerated} user={mockUser} />);
    
    fireEvent.click(screen.getByText('Mock Generate'));
    
    expect(api.saveDeck).toHaveBeenCalledWith('New Set', expect.any(Array));
  });
});
