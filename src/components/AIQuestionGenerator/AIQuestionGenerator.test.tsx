import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AIQuestionGenerator from './index';
import * as aiService from '../../services/aiService';
import * as questionService from '../../services/questionService';

vi.mock('../../services/aiService', () => ({
  generateInterviewQuestions: vi.fn(),
  setApiKey: vi.fn(),
  initializeMCP: vi.fn(),
  addPromptListener: vi.fn(),
  removePromptListener: vi.fn(),
  handleTokenizeJob: vi.fn(),
}));

vi.mock('../../services/questionService', () => ({
  getQuestionSets: vi.fn().mockReturnValue([]),
  deleteQuestionSet: vi.fn(),
}));

describe('AIQuestionGenerator', () => {
  const mockOnQuestionsGenerated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<AIQuestionGenerator onQuestionsGenerated={mockOnQuestionsGenerated} />);
    expect(screen.getByLabelText(/Role \/ Position/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Required Skills/i)).toBeInTheDocument();
  });

  it('calls generateInterviewQuestions on form submission', async () => {
    vi.mocked(aiService.generateInterviewQuestions).mockResolvedValue([{ 
      id: 1, 
      question: 'Q', 
      answer: 'A',
      role: 'Frontend',
      topic: 'React',
      skillLevel: 'Intermediate'
    }] as any);
    
    render(<AIQuestionGenerator onQuestionsGenerated={mockOnQuestionsGenerated} />);
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Role \/ Position/i), { target: { value: 'Frontend' } });
    fireEvent.change(screen.getByLabelText(/Required Skills/i), { target: { value: 'React' } });
    fireEvent.change(screen.getByLabelText(/Interview Question Set Name/i), { target: { value: 'Test Set' } });
    
    // Ensure "General Screening" tab is active (it should be by default, but let's be sure)
    const tabs = screen.getAllByText(/General Screening/i);
    fireEvent.click(tabs[0]);
    
    // Set an API key to avoid validation error
    fireEvent.change(screen.getByPlaceholderText(/Enter your Google Gemini API key/i), { target: { value: 'test-key' } });
    
    // Switch to Gemini mode (not using MCP) for simpler test
    const mcpToggle = screen.queryByLabelText(/Use MCP Server/i);
    if (mcpToggle) {
      fireEvent.click(mcpToggle);
    }
    
    const generateButton = screen.getByRole('button', { name: /Generate Interview Questions/i });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(aiService.generateInterviewQuestions).toHaveBeenCalled();
    }, { timeout: 3000 });
    
    expect(mockOnQuestionsGenerated).toHaveBeenCalled();
  });

  it('handles error during generation', async () => {
    vi.mocked(aiService.generateInterviewQuestions).mockRejectedValue(new Error('AI Failed'));
    
    render(<AIQuestionGenerator onQuestionsGenerated={mockOnQuestionsGenerated} />);
    
    fireEvent.change(screen.getByLabelText(/Role \/ Position/i), { target: { value: 'Frontend' } });
    fireEvent.change(screen.getByLabelText(/Required Skills/i), { target: { value: 'React' } });
    fireEvent.change(screen.getByLabelText(/Interview Question Set Name/i), { target: { value: 'Test Set' } });
    
    // Set an API key to avoid validation error
    fireEvent.change(screen.getByPlaceholderText(/Enter your Google Gemini API key/i), { target: { value: 'test-key' } });
    
    const tabs2 = screen.getAllByText(/General Screening/i);
    fireEvent.click(tabs2[0]);
    
    const mcpToggle2 = screen.queryByLabelText(/Use MCP Server/i);
    if (mcpToggle2) {
      fireEvent.click(mcpToggle2);
    }
    
    fireEvent.click(screen.getByRole('button', { name: /Generate Interview Questions/i }));
    
    // Use a function for matcher to avoid issues with broken up text
    await waitFor(() => {
      const errorElements = screen.getAllByText((content, element) => {
        return element?.textContent?.includes('AI Failed') ?? false;
      });
      expect(errorElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});
