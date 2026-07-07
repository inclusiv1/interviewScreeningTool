import { InterviewQuestion } from '../types';
import { 
  generateUniqueFilename, 
  saveJsonFile, 
  loadJsonFile, 
  listJsonFiles, 
  deleteJsonFile,
  DEFAULT_FILENAME,
  initializeDefaultFlashCardSet
} from './fileSystemService';

// Lightweight in-app event bus so UI can react to set changes without a page refresh
export const questionEvents = typeof window !== 'undefined' ? new EventTarget() : ({} as EventTarget);

// Define a type for a flash card set
export interface QuestionSet {
  id: string;
  name: string;
  filename: string; // Store the filename for each set
  cards: InterviewQuestion[];
}

// Initialize with the default flash cards
const DEFAULT_SET_ID = 'default';
const DEFAULT_SET_NAME = 'Default Flash Cards';

// Note: Default flash cards are now fetched from the server at runtime.
// We no longer initialize from a bundled JSON to ensure the app uses server-provided data.

// For backward compatibility, also check localStorage
const STORAGE_KEY = 'flashCardSets';

// Get all flash card sets
export function getQuestionSets(): QuestionSet[] {
  try {
    // Get list of all JSON files in the sets directory
    const jsonFiles = listJsonFiles();
    
    // If no files exist, create the default set
    if (jsonFiles.length === 0) {
      // Check if we have sets in localStorage for backward compatibility
      const storedSets = localStorage.getItem(STORAGE_KEY);
      if (storedSets) {
        // Migrate sets from localStorage to files
        const sets = JSON.parse(storedSets);
        sets.forEach((set: QuestionSet) => {
          if (!set.filename) {
            set.filename = set.id === DEFAULT_SET_ID 
              ? DEFAULT_FILENAME 
              : generateUniqueFilename(set.name);
          }
          saveJsonFile(set.filename, set);
        });
        return sets;
      }
      
      // Do not auto-create a default set from bundled JSON anymore.
      // The app will fetch default flash cards from the server on startup.
      return [];
    }
    
    // Load all sets from files
    const sets: QuestionSet[] = [];
    for (const filename of jsonFiles) {
      const set = loadJsonFile(filename);
      if (set) {
        // Ensure the filename is stored in the set
        set.filename = filename;
        sets.push(set);
      }
    }
    
    return sets;
  } catch (error) {
    console.error('Error loading flash card sets:', error);
    return [];
  }
}

// Get a specific flash card set by ID
export function getQuestionSetById(id: string): QuestionSet | undefined {
  const sets = getQuestionSets();
  return sets.find(set => set.id === id);
}

// Add a new flash card set
export function addQuestionSet(name: string, cards: InterviewQuestion[]): QuestionSet {
  try {
    const sets = getQuestionSets();
    
    // Generate a unique ID
    const id = `set_${Date.now()}`;
    
    // Generate a unique filename
    const filename = generateUniqueFilename(name);
    
    // Create the new set
    const newSet: QuestionSet = {
      id,
      name,
      filename,
      cards: cards.map((card, index) => ({
        ...card,
        id: index + 1 // Reassign IDs to ensure they're sequential
      }))
    };
    
    // Save to file
    saveJsonFile(filename, newSet);
    
    // Add to the list of sets
    sets.push(newSet);
    
    // For backward compatibility, also update localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
    } catch (e) {
      console.warn('Could not update localStorage, continuing with file-based storage');
    }
    // Notify listeners that sets have changed
    try {
      questionEvents.dispatchEvent(new Event('setsChanged'));
    } catch {}
    
    return newSet;
  } catch (error) {
    console.error('Error adding flash card set:', error);
    throw new Error('Failed to add flash card set');
  }
}

// Add a single interview question to an existing set
export function addQuestionToSet(setId: string, card: Omit<InterviewQuestion, 'id'>): QuestionSet | null {
  try {
    const sets = getQuestionSets();
    const target = sets.find(s => s.id === setId);
    if (!target) return null;

    // Append card and reassign IDs sequentially
    const updatedCards: InterviewQuestion[] = [...target.cards, { ...card, id: target.cards.length + 1 } as InterviewQuestion];

    const updatedSet: QuestionSet = { ...target, cards: updatedCards };

    // Persist using filename
    if (updatedSet.filename) {
      saveJsonFile(updatedSet.filename, updatedSet);
    }

    // Update localStorage list for backward compatibility
    const updatedSets = sets.map(s => (s.id === setId ? updatedSet : s));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSets));
    } catch (e) {
      console.warn('Could not update localStorage, continuing with file-based storage');
    }

    // Notify listeners that a set was updated
    try {
      questionEvents.dispatchEvent(new CustomEvent('setUpdated', { detail: { setId } } as any));
      questionEvents.dispatchEvent(new Event('setsChanged'));
    } catch {}

    return updatedSet;
  } catch (error) {
    console.error('Error adding flash card to set:', error);
    return null;
  }
}

// Update a flash card set name
export function updateQuestionSetName(id: string, newName: string): boolean {
  try {
    const sets = getQuestionSets();
    const setToUpdate = sets.find(set => set.id === id);
    
    if (!setToUpdate) {
      return false;
    }
    
    const updatedSet: QuestionSet = { ...setToUpdate, name: newName };
    
    // Save to file
    if (updatedSet.filename) {
      saveJsonFile(updatedSet.filename, updatedSet);
    }
    
    // Update localStorage for backward compatibility
    const updatedSets = sets.map(set => (set.id === id ? updatedSet : set));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSets));
    } catch (e) {
      console.warn('Could not update localStorage, continuing with file-based storage');
    }
    
    // Notify listeners that sets have changed
    try {
      questionEvents.dispatchEvent(new Event('setsChanged'));
    } catch {}
    
    return true;
  } catch (error) {
    console.error('Error updating flash card set name:', error);
    return false;
  }
}

// Delete a flash card set
export function deleteQuestionSet(id: string): boolean {
  try {
    const sets = getQuestionSets();
    const setToDelete = sets.find(set => set.id === id);
    
    if (!setToDelete) {
      return false;
    }
    
    // Delete the file
    if (setToDelete.filename) {
      deleteJsonFile(setToDelete.filename);
    }
    
    // Update the sets list
    const updatedSets = sets.filter(set => set.id !== id);
    
    // For backward compatibility, also update localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSets));
    } catch (e) {
      console.warn('Could not update localStorage, continuing with file-based storage');
    }
    // Notify listeners that sets have changed
    try {
      questionEvents.dispatchEvent(new Event('setsChanged'));
    } catch {}
    
    return true;
  } catch (error) {
    console.error('Error deleting flash card set:', error);
    return false;
  }
}
