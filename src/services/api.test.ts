import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchDefaultQuestions, login } from './api';

// Mock fetch globally
global.fetch = vi.fn();

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('fetchDefaultQuestions', () => {
    it('fetches questions and maps them correctly', async () => {
      const mockResponse = {
        flashcards: [
          {
            id: 1,
            role: 'Dev',
            topic: 'JS',
            question: 'What is NaN?',
            answer: 'Not a Number',
          }
        ]
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const questions = await fetchDefaultQuestions();

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/flashcards'), expect.anything());
      expect(questions).toHaveLength(1);
      expect(questions[0].question).toBe('What is NaN?');
      expect(questions[0].role).toBe('Dev');
    });

    it('throws error on non-ok response', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(fetchDefaultQuestions()).rejects.toThrow('Failed to fetch flashcards');
    });
  });

  describe(' login', () => {
    it('stores token and user on successful login', async () => {
      const mockLoginResponse = {
        token: 'fake-token',
        username: 'testuser',
        userId: 123
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLoginResponse,
      });

      const result = await login('testuser', 'password');

      expect(result).toEqual(mockLoginResponse);
      expect(localStorage.getItem('token')).toBe('fake-token');
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual({
        username: 'testuser',
        userId: 123
      });
    });
  });
});
