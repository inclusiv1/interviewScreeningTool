import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SingleCardView from './index';
import * as questionService from '../../services/questionService';

vi.mock('../../services/questionService', () => ({
  getQuestionSets: vi.fn(),
}));

vi.mock('../InterviewQuestion/index', () => ({
  default: ({ card }: any) => <div data-testid="interview-question">{card.question}</div>,
}));

describe('SingleCardView', () => {
  it('renders correctly when card is found', () => {
    const mockCard = { 
      id: 1, 
      question: 'Found Q',
      role: 'Developer',
      topic: 'React',
      skillLevel: 'Intermediate',
      answer: 'A1'
    };
    vi.mocked(questionService.getQuestionSets).mockReturnValue([
      { id: 's1', name: 'S1', cards: [mockCard] as any, filename: 's1.json' }
    ]);

    render(
      <MemoryRouter initialEntries={['/cards/1']}>
        <Routes>
          <Route path="/cards/:id" element={<SingleCardView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('interview-question')).toHaveTextContent('Found Q');
  });

  it('renders not found message when card is missing', () => {
    vi.mocked(questionService.getQuestionSets).mockReturnValue([]);

    render(
      <MemoryRouter initialEntries={['/cards/99']}>
        <Routes>
          <Route path="/cards/:id" element={<SingleCardView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Interview question not found/i)).toBeInTheDocument();
  });
});
