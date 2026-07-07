import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InterviewQuestion from './index';
import { InterviewQuestion as InterviewQuestionType } from '../../types';

// Mock the API services
vi.mock('../../services/api', () => ({
  updateQuestionNote: vi.fn(),
  deleteQuestionNote: vi.fn(),
}));

describe('InterviewQuestion Component', () => {
  const mockCard: InterviewQuestionType = {
    id: 1,
    role: 'Frontend Developer',
    topic: 'React',
    skillLevel: 'Senior',
    question: 'What is JSX?',
    answer: 'JSX is a syntax extension for JavaScript.',
    note: 'Important concept'
  };

  it('renders the question correctly', () => {
    render(<InterviewQuestion card={mockCard} />);
    expect(screen.getByText('What is JSX?')).toBeInTheDocument();
    expect(screen.getByText(/Frontend Developer/i)).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('shows the answer when clicking the toggle button', () => {
    render(<InterviewQuestion card={mockCard} />);
    
    // Initially answer should not be visible (depending on CSS, but it's hidden in state)
    // The text might still be in the DOM but hidden, let's check how it's rendered
    // In many flashcard apps, it's conditionally rendered.
    
    const toggleButton = screen.getByText(/Show Answer/i);
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('JSX is a syntax extension for JavaScript.')).toBeInTheDocument();
    expect(screen.getByText(/Hide Answer/i)).toBeInTheDocument();
  });

  it('renders "Card not available" when card is missing', () => {
    // @ts-ignore
    render(<InterviewQuestion card={null} />);
    expect(screen.getByText('Card not available')).toBeInTheDocument();
  });
});
