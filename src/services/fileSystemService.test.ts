import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  initializeDefaultFlashCardSet, 
  generateUniqueFilename, 
  saveJsonFile, 
  loadJsonFile, 
  listJsonFiles, 
  deleteJsonFile,
  DEFAULT_FILENAME
} from './fileSystemService';

describe('fileSystemService', () => {
  const STORAGE_KEY_PREFIX = 'flashcard_set_';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('initializeDefaultFlashCardSet', () => {
    it('initializes default set if it does not exist', () => {
      const defaultCards = [{ topic: 'React', question: 'What is JSX?', answer: 'JavaScript XML' }];
      initializeDefaultFlashCardSet(defaultCards);
      
      const storageKey = STORAGE_KEY_PREFIX + DEFAULT_FILENAME;
      const storedData = localStorage.getItem(storageKey);
      
      expect(storedData).not.toBeNull();
      const parsedData = JSON.parse(storedData!);
      expect(parsedData.id).toBe('default');
      expect(parsedData.cards).toHaveLength(1);
      expect(parsedData.cards[0].question).toBe('What is JSX?');
    });

    it('does not overwrite existing default set', () => {
      const storageKey = STORAGE_KEY_PREFIX + DEFAULT_FILENAME;
      localStorage.setItem(storageKey, JSON.stringify({ id: 'existing' }));
      
      initializeDefaultFlashCardSet([{ topic: 'New', question: 'New?', answer: 'Yes' }]);
      
      const storedData = localStorage.getItem(storageKey);
      expect(JSON.parse(storedData!).id).toBe('existing');
    });
  });

  describe('generateUniqueFilename', () => {
    it('sanitizes set name and adds timestamp', () => {
      const filename = generateUniqueFilename('My Set! @2023');
      expect(filename).toMatch(/^my_set___2023_\d+\.json$/);
    });
  });

  describe('saveJsonFile and loadJsonFile', () => {
    it('saves and loads data correctly', () => {
      const filename = 'test.json';
      const data = { foo: 'bar' };
      
      saveJsonFile(filename, data);
      const loadedData = loadJsonFile(filename);
      
      expect(loadedData).toEqual(data);
      expect(localStorage.getItem(STORAGE_KEY_PREFIX + filename)).toBe(JSON.stringify(data));
    });

    it('returns null if file does not exist', () => {
      expect(loadJsonFile('nonexistent.json')).toBeNull();
    });
  });

  describe('listJsonFiles', () => {
    it('lists all files with correct prefix', () => {
      saveJsonFile('file1.json', { id: 1 });
      saveJsonFile('file2.json', { id: 2 });
      localStorage.setItem('other_key', 'some data');
      
      const files = listJsonFiles();
      
      expect(files).toHaveLength(2);
      expect(files).toContain('file1.json');
      expect(files).toContain('file2.json');
      expect(files).not.toContain('other_key');
    });
  });

  describe('deleteJsonFile', () => {
    it('deletes existing file', () => {
      const filename = 'delete_me.json';
      saveJsonFile(filename, { id: 1 });
      
      const result = deleteJsonFile(filename);
      
      expect(result).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY_PREFIX + filename)).toBeNull();
    });

    it('returns false if file does not exist', () => {
      const result = deleteJsonFile('nonexistent.json');
      expect(result).toBe(false);
    });
  });
});
