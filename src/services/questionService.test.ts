import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getQuestionSets, 
  getQuestionSetById, 
  addQuestionSet, 
  addQuestionToSet, 
  updateQuestionSetName, 
  deleteQuestionSet,
  questionEvents
} from './questionService';
import * as fileSystemService from './fileSystemService';

// Mock fileSystemService
vi.mock('./fileSystemService', async () => {
  const actual = await vi.importActual('./fileSystemService');
  return {
    ...actual as any,
    saveJsonFile: vi.fn(),
    loadJsonFile: vi.fn(),
    listJsonFiles: vi.fn(),
    deleteJsonFile: vi.fn(),
    generateUniqueFilename: vi.fn((name: string) => `${name.toLowerCase().replace(/ /g, '_')}_mock.json`),
  };
});

describe('questionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('getQuestionSets', () => {
    it('returns sets from files if they exist', () => {
      vi.mocked(fileSystemService.listJsonFiles).mockReturnValue(['set1.json']);
      vi.mocked(fileSystemService.loadJsonFile).mockReturnValue({
        id: '1',
        name: 'Set 1',
        cards: []
      });

      const sets = getQuestionSets();
      
      expect(sets).toHaveLength(1);
      expect(sets[0].id).toBe('1');
      expect(sets[0].filename).toBe('set1.json');
    });

    it('migrates from localStorage if no files exist', () => {
      vi.mocked(fileSystemService.listJsonFiles).mockReturnValue([]);
      const mockSets = [{ id: 'old', name: 'Old Set', cards: [] }];
      localStorage.setItem('flashCardSets', JSON.stringify(mockSets));

      const sets = getQuestionSets();
      
      expect(sets).toHaveLength(1);
      expect(sets[0].id).toBe('old');
      expect(fileSystemService.saveJsonFile).toHaveBeenCalled();
    });

    it('returns empty array if no files and no localStorage', () => {
      vi.mocked(fileSystemService.listJsonFiles).mockReturnValue([]);
      expect(getQuestionSets()).toEqual([]);
    });
  });

  describe('addQuestionSet', () => {
    it('creates and saves a new set', () => {
      vi.mocked(fileSystemService.listJsonFiles).mockReturnValue([]);
      const dispatchSpy = vi.spyOn(questionEvents, 'dispatchEvent');
      
      const newSet = addQuestionSet('New Set', [{ topic: 'T', question: 'Q', answer: 'A' } as any]);
      
      expect(newSet.name).toBe('New Set');
      expect(newSet.cards[0].id).toBe(1);
      expect(fileSystemService.saveJsonFile).toHaveBeenCalledWith(expect.stringContaining('new_set'), expect.any(Object));
      expect(dispatchSpy).toHaveBeenCalled();
    });
  });

  describe('addQuestionToSet', () => {
    it('adds a question to an existing set', () => {
      const mockSet = { id: 's1', name: 'S1', filename: 's1.json', cards: [{ id: 1, question: 'Q1' }] };
      vi.mocked(fileSystemService.listJsonFiles).mockReturnValue(['s1.json']);
      vi.mocked(fileSystemService.loadJsonFile).mockReturnValue(mockSet);

      const updatedSet = addQuestionToSet('s1', { question: 'Q2' } as any);
      
      expect(updatedSet?.cards).toHaveLength(2);
      expect(updatedSet?.cards[1].id).toBe(2);
      expect(fileSystemService.saveJsonFile).toHaveBeenCalledWith('s1.json', expect.any(Object));
    });

    it('returns null if set not found', () => {
      vi.mocked(fileSystemService.listJsonFiles).mockReturnValue([]);
      const result = addQuestionToSet('nonexistent', { question: 'Q' } as any);
      expect(result).toBeNull();
    });
  });

  describe('updateQuestionSetName', () => {
    it('updates set name and saves', () => {
      const mockSet = { id: 's1', name: 'Old', filename: 's1.json', cards: [] };
      vi.mocked(fileSystemService.listJsonFiles).mockReturnValue(['s1.json']);
      vi.mocked(fileSystemService.loadJsonFile).mockReturnValue(mockSet);

      const result = updateQuestionSetName('s1', 'New Name');
      
      expect(result).toBe(true);
      expect(fileSystemService.saveJsonFile).toHaveBeenCalledWith('s1.json', expect.objectContaining({ name: 'New Name' }));
    });
  });

  describe('deleteQuestionSet', () => {
    it('deletes the set file', () => {
      const mockSet = { id: 's1', name: 'S1', filename: 's1.json', cards: [] };
      vi.mocked(fileSystemService.listJsonFiles).mockReturnValue(['s1.json']);
      vi.mocked(fileSystemService.loadJsonFile).mockReturnValue(mockSet);

      const result = deleteQuestionSet('s1');
      
      expect(result).toBe(true);
      expect(fileSystemService.deleteJsonFile).toHaveBeenCalledWith('s1.json');
    });
  });
});
