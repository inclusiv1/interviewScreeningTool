import { InterviewQuestion } from '../types';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function login(username: string, password: string): Promise<any> {
  const resp = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || 'Login failed');
  }
  const data = await resp.json();
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify({ username: data.username, userId: data.userId }));
  return data;
}

export async function register(username: string, password: string): Promise<any> {
  const resp = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || 'Registration failed');
  }
  const data = await resp.json();
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify({ username: data.username, userId: data.userId }));
  return data;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getCurrentUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export async function fetchDefaultQuestions(candidateId?: string | number): Promise<InterviewQuestion[]> {
  const url = candidateId 
    ? `${API_BASE}/flashcards?candidateId=${candidateId}` 
    : `${API_BASE}/flashcards`;
  const resp = await fetch(url, {
    headers: getAuthHeader()
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch flashcards: ${resp.status} ${resp.statusText}`);
  }
  const data = await resp.json();
  const cards = (data && (data.flashcards || data.cards || data.data)) as any[];
  if (!Array.isArray(cards)) {
    throw new Error('Invalid flashcards response format');
  }
  // Ensure typing
  return cards.map((c, idx) => ({
    id: typeof c.id === 'number' ? c.id : idx + 1,
    role: c.role || 'Candidate',
    topic: c.topic,
    skillLevel: c.skillLevel || c.skill_level || 'Senior',
    question: c.question || c.front,
    answer: c.answer || c.back,
    codingExample: c.codingExample || c.coding_example,
    challenges: c.challenges,
    note: c.note,
    set_id: c.set_id,
    set_name: c.set_name,
  } as InterviewQuestion));
}

export async function fetchAIHealth(): Promise<{
  ok: boolean;
  apiKeyPresent: boolean;
  modelPreferred: string;
  modelResolved: string | null;
  errors: string[];
  suggestions: string[];
}> {
  const url = `${API_BASE}/ai/health`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to fetch AI health: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

// Generate flashcards from the server for a single topic using the AI endpoint
export async function generateQuestionsForTopicFromServer(topic: string): Promise<InterviewQuestion[]> {
  const url = `${API_BASE}/generate-flashcards`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic })
  });
  if (!resp.ok) {
    let errMsg = `Failed to generate flashcards: ${resp.status} ${resp.statusText}`;
    try {
      const errJson = await resp.json();
      if (errJson && errJson.error) errMsg = `${errMsg} - ${errJson.error}`;
    } catch {}
    throw new Error(errMsg);
  }
  const data = await resp.json();
  const raw = (data && (data.flashcards || data.cards || data.data)) as any[];
  if (!Array.isArray(raw)) {
    throw new Error('Invalid response format from AI flashcard generation');
  }
  return raw.map((c, idx) => ({
    id: idx + 1, // temporary; will be reassigned when saved
    role: c.role || 'Candidate',
    topic,
    skillLevel: c.skillLevel || c.skill_level || 'Senior',
    question: c.question || c.front,
    answer: c.answer || c.back,
    codingExample: c.codingExample || c.coding_example,
    challenges: c.challenges
  } as InterviewQuestion));
}

export async function updateQuestionNote(id: number, note: string, candidateId?: string | number): Promise<any> {
  const resp = await fetch(`${API_BASE}/flashcards/${id}/note`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ note, candidateId })
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update note');
  }
  return resp.json();
}

export async function deleteQuestionNote(id: number): Promise<any> {
  const resp = await fetch(`${API_BASE}/flashcards/${id}/note`, {
    method: 'DELETE',
    headers: getAuthHeader()
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete note');
  }
  return resp.json();
}

export async function deleteQuestion(id: number): Promise<any> {
  const resp = await fetch(`${API_BASE}/flashcards/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader()
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete question');
  }
  return resp.json();
}

export async function deleteRole(role: string): Promise<any> {
  const resp = await fetch(`${API_BASE}/roles/${encodeURIComponent(role)}`, {
    method: 'DELETE',
    headers: getAuthHeader()
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete role');
  }
  return resp.json();
}

export async function saveDeck(name: string, cards: any[]): Promise<any> {
  const maxRetries = 3;
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1} to save deck to ${API_BASE}/decks/save`);
      const resp = await fetch(`${API_BASE}/decks/save`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, cards }),
        mode: 'cors'
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Failed to save deck: ${resp.status}`);
      }
      return await resp.json();
    } catch (e) {
      lastError = e;
      console.error(`Save deck attempt ${attempt + 1} failed:`, e);
      if (attempt < maxRetries) {
        // Wait a bit before retrying, with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      break;
    }
  }
  throw lastError;
}

export async function clearSetNotes(setId: string | number): Promise<any> {
  const resp = await fetch(`${API_BASE}/flashcard-sets/${setId}/clear-notes`, {
    method: 'POST',
    headers: getAuthHeader()
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to clear notes');
  }
  return resp.json();
}

export async function updateQuestionSetName(setId: string | number, name: string): Promise<any> {
  const resp = await fetch(`${API_BASE}/flashcard-sets/${setId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ name })
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update set name');
  }
  return resp.json();
}

export async function fetchCandidates(): Promise<any[]> {
  const resp = await fetch(`${API_BASE}/candidates`, {
    headers: getAuthHeader()
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch candidates');
  }
  const data = await resp.json();
  return data.candidates || [];
}

export async function createCandidate(name: string): Promise<any> {
  const resp = await fetch(`${API_BASE}/candidates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ name })
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create candidate');
  }
  return resp.json();
}

export async function deleteCandidate(id: number): Promise<any> {
  const resp = await fetch(`${API_BASE}/candidates/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader()
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete candidate');
  }
  return resp.json();
}
