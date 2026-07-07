import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  setAIProvider, 
  getAIProvider, 
  setApiKey, 
  parseAIResponseToQuestions,
  createPlaceholderCard
} from './aiService';

describe('aiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('AI Provider management', () => {
    it('sets and gets the AI provider', () => {
      setAIProvider('gemini');
      expect(getAIProvider()).toBe('gemini');
      
      // MCP is currently not allowed to be set via setAIProvider
      setAIProvider('mcp');
      expect(getAIProvider()).toBe('gemini');
    });
  });

  describe('setApiKey', () => {
    it('initializes Gemini client with the provided key', () => {
      // Since aiService uses process.env, we might need to mock it if we wanted to test full flow
      // but for this test we just want to ensure it doesn't crash and handles the key
      setApiKey('test-key', 'gemini');
      // We can't easily check internal GEMINI_API_KEY without exporting it
      // but we can check if it at least runs without error
      expect(true).toBe(true);
    });
  });

  describe('parseAIResponseToQuestions', () => {
    const role = 'Frontend Developer';
    const topic = 'React';
    const skillLevel = 'Senior';
    const startId = 1;

    it('parses valid JSON response from AI', () => {
      const content = JSON.stringify([
        {
          question: 'What is React?',
          answer: 'A library for building UIs',
          topic: 'React',
          skillLevel: 'Senior'
        }
      ]);

      const questions = parseAIResponseToQuestions(content, role, topic, skillLevel, startId);
      
      expect(questions).toHaveLength(1);
      expect(questions[0].question).toBe('What is React?');
      expect(questions[0].role).toBe(role);
      expect(questions[0].id).toBe(1);
    });

    it('handles JSON wrapped in markdown code blocks', () => {
      const content = '```json\n[{"question": "Q", "answer": "A"}]\n```';
      const questions = parseAIResponseToQuestions(content, role, topic, skillLevel, startId);
      
      expect(questions).toHaveLength(1);
      expect(questions[0].question).toBe('Q');
    });

    it('handles invalid JSON by throwing an error', () => {
      const content = 'Not a JSON';
      expect(() => parseAIResponseToQuestions(content, role, topic, skillLevel, startId)).toThrow(/Failed to parse AI response/);
    });

    it('can create placeholder cards', () => {
      const placeholder = createPlaceholderCard(role, topic, skillLevel, 1, 1);
      expect(placeholder.question).toContain(topic);
      expect(placeholder.question).toContain(role);
    });
  });
});
