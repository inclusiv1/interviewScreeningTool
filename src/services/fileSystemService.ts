// This service provides a browser-compatible way to handle flash card sets
// Since we can't use the file system directly in the browser, we'll use localStorage

// Storage key prefix for flash card sets
const STORAGE_KEY_PREFIX = 'flashcard_set_';

// Default filename for the default flash card set
export const DEFAULT_FILENAME = 'default_flashcards.json';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

/**
 * Initialize the default flash card set if it doesn't exist
 * This should be called when the app starts
 */
export function initializeDefaultFlashCardSet(defaultCards: any[]): void {
  if (!isBrowser) return;
  
  // Check if the default set exists
  const storageKey = STORAGE_KEY_PREFIX + DEFAULT_FILENAME;
  if (localStorage.getItem(storageKey) === null) {
    // Create the default set
    const defaultSet = {
      id: 'default',
      name: 'Default Flash Cards',
      filename: DEFAULT_FILENAME,
      cards: defaultCards.map((card, index) => ({
        id: index + 1,
        topic: card.topic,
        question: card.front || card.question,
        answer: card.back || card.answer
      }))
    };
    
    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify(defaultSet));
  }
}

/**
 * Generate a unique filename for a flash card set
 * @param setName The name of the flash card set
 * @returns A unique filename based on the set name and current timestamp
 */
export function generateUniqueFilename(setName: string): string {
  // Replace spaces and special characters with underscores
  const sanitizedName = setName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  
  // Add timestamp to ensure uniqueness
  const timestamp = Date.now();
  
  return `${sanitizedName}_${timestamp}.json`;
}

/**
 * Save data to storage
 * @param filename The name of the file/key to save
 * @param data The data to save
 * @returns The key used to store the data
 */
export function saveJsonFile(filename: string, data: any): string {
  try {
    if (isBrowser) {
      // In browser, use localStorage
      const storageKey = STORAGE_KEY_PREFIX + filename;
      localStorage.setItem(storageKey, JSON.stringify(data));
      return storageKey;
    } else {
      // This would be the Node.js implementation if needed
      console.warn('File system operations not supported in this environment');
      return filename;
    }
  } catch (error) {
    console.error('Error saving data:', error);
    throw new Error('Failed to save data');
  }
}

/**
 * Load data from storage
 * @param filename The name of the file/key to load
 * @returns The data, or null if it doesn't exist
 */
export function loadJsonFile(filename: string): any {
  try {
    if (isBrowser) {
      // In browser, use localStorage
      const storageKey = STORAGE_KEY_PREFIX + filename;
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : null;
    } else {
      // This would be the Node.js implementation if needed
      console.warn('File system operations not supported in this environment');
      return null;
    }
  } catch (error) {
    console.error('Error loading data:', error);
    return null;
  }
}

/**
 * Get a list of all stored flash card sets
 * @returns An array of filenames
 */
export function listJsonFiles(): string[] {
  try {
    if (isBrowser) {
      // In browser, scan localStorage for keys with our prefix
      const files = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
          // Extract the filename part (without the prefix)
          files.push(key.substring(STORAGE_KEY_PREFIX.length));
        }
      }
      return files;
    } else {
      // This would be the Node.js implementation if needed
      console.warn('File system operations not supported in this environment');
      return [];
    }
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
}

/**
 * Delete data from storage
 * @param filename The name of the file/key to delete
 * @returns true if the data was deleted, false otherwise
 */
export function deleteJsonFile(filename: string): boolean {
  try {
    if (isBrowser) {
      // In browser, use localStorage
      const storageKey = STORAGE_KEY_PREFIX + filename;
      if (localStorage.getItem(storageKey) === null) {
        return false;
      }
      
      localStorage.removeItem(storageKey);
      return true;
    } else {
      // This would be the Node.js implementation if needed
      console.warn('File system operations not supported in this environment');
      return false;
    }
  } catch (error) {
    console.error('Error deleting data:', error);
    return false;
  }
}
