import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import QuestionSetSelector from './index';
import * as questionService from '../../services/questionService';

vi.mock('../../services/questionService', () => ({
  getQuestionSets: vi.fn(),
  deleteQuestionSet: vi.fn(),
  updateQuestionSetName: vi.fn(),
  questionEvents: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
}));

describe('QuestionSetSelector', () => {
  const mockSets = [
    { id: '1', name: 'Set 1', cards: [] },
    { id: '2', name: 'Set 2', cards: [] },
  ];

  const mockOnSelectSet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(questionService.getQuestionSets).mockReturnValue(mockSets as any);
  });

  it('renders correctly and shows question sets', () => {
    render(<QuestionSetSelector selectedSetId="1" onSelectSet={mockOnSelectSet} />);
    
    expect(screen.getByText('Set 1')).toBeInTheDocument();
    expect(screen.getByText('Set 2')).toBeInTheDocument();
  });

  it('calls onSelectSet when selection changes', () => {
    render(<QuestionSetSelector selectedSetId="1" onSelectSet={mockOnSelectSet} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '2' } });
    
    expect(mockOnSelectSet).toHaveBeenCalledWith('2');
  });

  it('handles name editing', () => {
    vi.mocked(questionService.updateQuestionSetName).mockReturnValue(true);
    render(<QuestionSetSelector selectedSetId="1" onSelectSet={mockOnSelectSet} />);
    
    fireEvent.click(screen.getByText('Edit'));
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New Name' } });
    
    fireEvent.click(screen.getByText('Save'));
    
    expect(questionService.updateQuestionSetName).toHaveBeenCalledWith('1', 'New Name');
  });

  it('handles set deletion', () => {
    window.confirm = vi.fn().mockReturnValue(true);
    vi.mocked(questionService.deleteQuestionSet).mockReturnValue(true);
    
    render(<QuestionSetSelector selectedSetId="2" onSelectSet={mockOnSelectSet} />);
    
    fireEvent.click(screen.getByText('Delete'));
    
    expect(window.confirm).toHaveBeenCalled();
    expect(questionService.deleteQuestionSet).toHaveBeenCalledWith('2');
  });
});
