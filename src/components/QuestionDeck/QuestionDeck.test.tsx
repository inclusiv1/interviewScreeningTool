import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import QuestionDeck from './index';
import * as pdfService from '../../services/pdfService';
import * as api from '../../services/api';

vi.mock('../../services/pdfService', () => ({
  exportCardsToPdf: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  clearSetNotes: vi.fn(),
  updateQuestionSetName: vi.fn(),
}));

// Mock InterviewQuestion component to avoid deep rendering issues
vi.mock('../InterviewQuestion/index', () => ({
  __esModule: true,
  default: ({ card }: any) => <div data-testid="mock-card">{card.question}</div>,
}));

describe('QuestionDeck', () => {
  const mockCards = [
    { id: 1, question: 'Q1', set_id: 's1', set_name: 'Set 1' },
    { id: 2, question: 'Q2', set_id: 's1', set_name: 'Set 1' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "No interview questions available" when cards array is empty', () => {
    render(<QuestionDeck cards={[]} />);
    expect(screen.getByText(/No interview questions available/i)).toBeInTheDocument();
  });

  it('renders the first card initially', () => {
    render(<QuestionDeck cards={mockCards as any} />);
    expect(screen.getByTestId('mock-card')).toHaveTextContent('Q1');
    expect(screen.getByText(/Card 1 of 2/i)).toBeInTheDocument();
  });

  it('navigates to the next and previous cards', () => {
    render(<QuestionDeck cards={mockCards as any} />);
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    expect(screen.getByTestId('mock-card')).toHaveTextContent('Q2');
    expect(screen.getByText(/Card 2 of 2/i)).toBeInTheDocument();
    
    const prevButton = screen.getByText('Previous');
    fireEvent.click(prevButton);
    expect(screen.getByTestId('mock-card')).toHaveTextContent('Q1');
  });

  it('calls exportCardsToPdf when clicking export button', () => {
    render(<QuestionDeck cards={mockCards as any} />);
    fireEvent.click(screen.getByText('Export Deck to PDF'));
    expect(pdfService.exportCardsToPdf).toHaveBeenCalled();
  });

  it('handles name editing', async () => {
    vi.mocked(api.updateQuestionSetName).mockResolvedValue({} as any);
    render(<QuestionDeck cards={mockCards as any} />);
    
    const editButton = screen.getByTitle('Edit deck name');
    fireEvent.click(editButton);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New Deck Name' } });
    
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    expect(api.updateQuestionSetName).toHaveBeenCalledWith('s1', 'New Deck Name');
  });

  it('clears all notes after confirmation', async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    vi.mocked(api.clearSetNotes).mockResolvedValue({} as any);
    
    // Make sure at least one card has a note so the button appears
    const cardsWithNote = [
        { ...mockCards[0], note: 'some note' },
        mockCards[1]
    ];
    
    render(<QuestionDeck cards={cardsWithNote as any} />);
    const clearButton = screen.getByText(/Remove All Notes/i);
    fireEvent.click(clearButton);
    
    expect(window.confirm).toHaveBeenCalled();
    expect(api.clearSetNotes).toHaveBeenCalledWith('s1');
  });
});
