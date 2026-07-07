require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors'); // Enable CORS for local dev across ports
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initDb, getDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001; // Use a different port than the React app (3000)
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Optional Authentication Middleware (doesn't fail if no token)
const optionalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return next();
    req.user = user;
    next();
  });
};

// Resolve API key for server-side use
const SERVER_GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || '').trim();
if (!SERVER_GEMINI_KEY) {
  console.warn('Warning: No GEMINI_API_KEY found in environment. Set GEMINI_API_KEY in your .env for the server.');
}
if (!process.env.GEMINI_API_KEY && process.env.REACT_APP_GEMINI_API_KEY) {
  console.warn('Notice: Using REACT_APP_GEMINI_API_KEY for server because GEMINI_API_KEY is not set. For reliability, set GEMINI_API_KEY on the server environment.');
}

// Allow overriding model via environment
// Default model identifier updated as requested: gemini-2.5-pro
const SERVER_GEMINI_MODEL = (process.env.GEMINI_MODEL || process.env.REACT_APP_GEMINI_MODEL || 'gemini-2.5-pro').trim();

// Initialize the Gemini AI client
let genAI = null;
let model = null;
if (SERVER_GEMINI_KEY) {
  try {
    genAI = new GoogleGenerativeAI(SERVER_GEMINI_KEY);
    // Use correct model id without "models/" prefix, defaulting to a currently supported alias
    try {
      model = genAI.getGenerativeModel({ model: SERVER_GEMINI_MODEL });
    } catch (inner) {
      // Fallbacks for availability differences (try 2.x then 1.5 variants)
      const fallbacks = ['gemini-2.5-flash', 'gemini-1.5-pro-latest', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-1.5-flash'];
      for (const m of fallbacks) {
        try {
          model = genAI.getGenerativeModel({ model: m });
          console.warn(`Gemini: fell back to model ${m}`);
          break;
        } catch (_) {}
      }
      if (!model) throw inner;
    }
    } catch (e) {
      console.error('Failed to initialize GoogleGenerativeAI:', e);
    }
}

const authenticateAdmin = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

// Auth Routes
app.post('/register', async (req, res) => {
  res.status(403).json({ error: 'Registration is disabled' });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const trimmedUsername = username ? username.trim() : '';
  const trimmedPassword = password ? password.trim() : '';

  if (!trimmedUsername || !trimmedPassword) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE username = ?', [trimmedUsername]);
    if (!user || !(await bcrypt.compare(trimmedPassword, user.password))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username, isAdmin: Boolean(user.is_admin) }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, userId: user.id, username: user.username, isAdmin: Boolean(user.is_admin) });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Serve flashcards from the database
app.get('/flashcards', optionalAuthenticateToken, async (req, res) => {
  const { candidateId } = req.query;
  try {
    const db = getDb();
    let cards;
    if (req.user) {
      // Get user-specific cards (from all sets they own)
      const query = candidateId ? `
        SELECT 
          f.id, 
          f.set_id, 
          f.role, 
          f.topic, 
          f.skill_level as skillLevel, 
          f.question, 
          f.answer, 
          f.coding_example as codingExample, 
          f.challenges, 
          COALESCE(cn.note, f.note) as note,
          fs.name as set_name
        FROM flashcards f
        JOIN flashcard_sets fs ON f.set_id = fs.id
        LEFT JOIN candidate_notes cn ON f.id = cn.flashcard_id AND cn.candidate_id = ?
        WHERE f.set_id IN (SELECT id FROM flashcard_sets WHERE user_id = ?)
      ` : `
        SELECT 
          f.id, 
          f.set_id, 
          f.role, 
          f.topic, 
          f.skill_level as skillLevel, 
          f.question, 
          f.answer, 
          f.coding_example as codingExample, 
          f.challenges, 
          f.note,
          fs.name as set_name
        FROM flashcards f
        JOIN flashcard_sets fs ON f.set_id = fs.id
        WHERE f.set_id IN (SELECT id FROM flashcard_sets WHERE user_id = ?)
      `;
      const params = candidateId ? [candidateId, req.user.userId] : [req.user.userId];
      cards = await db.all(query, params);
    }

    // If no user or no cards found for user, fall back to default cards from DB
    if (!cards || cards.length === 0) {
      const defaultSet = await db.get('SELECT * FROM flashcard_sets WHERE user_id IS NULL AND name = "Default"');
      if (defaultSet) {
        const query = candidateId ? `
          SELECT 
            f.id, 
            f.set_id, 
            f.role, 
            f.topic, 
            f.skill_level as skillLevel, 
            f.question, 
            f.answer, 
            f.coding_example as codingExample, 
            f.challenges, 
            COALESCE(cn.note, f.note) as note,
            fs.name as set_name
          FROM flashcards f
          JOIN flashcard_sets fs ON f.set_id = fs.id
          LEFT JOIN candidate_notes cn ON f.id = cn.flashcard_id AND cn.candidate_id = ?
          WHERE f.set_id = ?
        ` : `
          SELECT 
            f.id, 
            f.set_id, 
            f.role, 
            f.topic, 
            f.skill_level as skillLevel, 
            f.question, 
            f.answer, 
            f.coding_example as codingExample, 
            f.challenges, 
            f.note,
            fs.name as set_name
          FROM flashcards f
          JOIN flashcard_sets fs ON f.set_id = fs.id
          WHERE f.set_id = ?
        `;
        const params = candidateId ? [candidateId, defaultSet.id] : [defaultSet.id];
        cards = await db.all(query, params);
      } else {
        // No default set in DB, return empty array
        cards = [];
      }
    }

    res.json({ flashcards: cards });
  } catch (e) {
    console.error('Failed to load flashcards:', e);
    res.status(500).json({ error: 'Failed to load flashcards' });
  }
});

// Add a new flashcard (optional auth)
app.post('/flashcards', optionalAuthenticateToken, async (req, res) => {
  const { role, topic, skillLevel, question, answer, codingExample, challenges, setName = 'Default' } = req.body;
  if (!topic || !question || !answer) {
    return res.status(400).json({ error: 'Topic, question, and answer are required' });
  }

  try {
    const db = getDb();
    const userId = req.user ? req.user.userId : null;

    // Find or create set for user (or default if no user)
    let set;
    if (userId) {
      set = await db.get('SELECT * FROM flashcard_sets WHERE user_id = ? AND name = ?', [userId, setName]);
    } else {
      set = await db.get('SELECT * FROM flashcard_sets WHERE user_id IS NULL AND name = ?', [setName]);
    }

    if (!set) {
      const result = await db.run('INSERT INTO flashcard_sets (user_id, name) VALUES (?, ?)', [userId, setName]);
      set = { id: result.lastID };
    }

    const result = await db.run(
      'INSERT INTO flashcards (set_id, role, topic, skill_level, question, answer, coding_example, challenges, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [set.id, role || 'General', topic, skillLevel || 'Advanced', question, answer, codingExample || null, challenges || null, req.body.note || null]
    );

    res.json({ id: result.lastID, role: role || 'General', topic, skillLevel: skillLevel || 'Advanced', question, answer, codingExample, challenges, note: req.body.note || null, set_id: set.id });
  } catch (e) {
    console.error('Failed to add flashcard:', e);
    res.status(500).json({ error: 'Failed to add flashcard' });
  }
});

// Delete a flashcard note (just sets it to null)
app.delete('/flashcards/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDb();
    // Admin can delete any, user can delete theirs
    const card = await db.get('SELECT * FROM flashcards WHERE id = ?', [id]);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    if (!req.user.isAdmin) {
      const set = await db.get('SELECT * FROM flashcard_sets WHERE id = ?', [card.set_id]);
      if (set && set.user_id !== req.user.userId) {
        return res.status(403).json({ error: 'Not authorized to delete this card' });
      }
    }

    await db.run('DELETE FROM flashcards WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (e) {
    console.error('Failed to delete flashcard:', e);
    res.status(500).json({ error: 'Failed to delete flashcard' });
  }
});

// Delete an entire role and its questions (Admin only)
app.delete('/roles/:role', authenticateAdmin, async (req, res) => {
  const { role } = req.params;
  try {
    const db = getDb();
    await db.run('DELETE FROM flashcards WHERE role = ?', [role]);
    res.json({ success: true, role });
  } catch (e) {
    console.error('Failed to delete role:', e);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// Save/Patch a deck
app.post('/decks/save', authenticateToken, async (req, res) => {
  const { name, cards } = req.body;
  if (!name || !Array.isArray(cards)) {
    return res.status(400).json({ error: 'Name and cards array are required' });
  }

  try {
    const db = getDb();
    const userId = req.user.userId;

    // Check if set with same name exists for this user
    let set = await db.get('SELECT * FROM flashcard_sets WHERE user_id = ? AND name = ?', [userId, name]);

    if (set) {
      // Patch: Update existing set by replacing its cards
      await db.run('DELETE FROM flashcards WHERE set_id = ?', [set.id]);
      await db.run('DELETE FROM skills WHERE role_id IN (SELECT id FROM roles WHERE set_id = ?)', [set.id]);
      await db.run('DELETE FROM roles WHERE set_id = ?', [set.id]);
    } else {
      // Create new set
      const result = await db.run('INSERT INTO flashcard_sets (user_id, name) VALUES (?, ?)', [userId, name]);
      set = { id: result.lastID };
    }

    // Track roles and skills to avoid duplicates and get IDs
    const rolesMap = new Map(); // name -> id
    const skillsMap = new Map(); // roleName:skillName -> id

    // Insert new cards
    for (const card of cards) {
      const roleName = card.role || 'General';
      const skillName = card.topic || 'General';

      // Ensure role exists
      if (!rolesMap.has(roleName)) {
        const roleResult = await db.run('INSERT INTO roles (set_id, name) VALUES (?, ?)', [set.id, roleName]);
        rolesMap.set(roleName, roleResult.lastID);
      }
      const roleId = rolesMap.get(roleName);

      // Ensure skill exists for this role
      const skillKey = `${roleName}:${skillName}`;
      if (!skillsMap.has(skillKey)) {
        const skillResult = await db.run('INSERT INTO skills (role_id, name) VALUES (?, ?)', [roleId, skillName]);
        skillsMap.set(skillKey, skillResult.lastID);
      }
      const skillId = skillsMap.get(skillKey);

      await db.run(
        'INSERT INTO flashcards (set_id, role_id, skill_id, role, topic, skill_level, question, answer, coding_example, challenges, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [set.id, roleId, skillId, roleName, skillName, card.skillLevel || card.skill_level || 'Advanced', card.question, card.answer, card.codingExample || card.coding_example || card.coding_Example || null, card.challenges || null, card.note || null]
      );
    }

    res.json({ success: true, setId: set.id, name });
  } catch (e) {
    console.error('Failed to save deck:', e);
    res.status(500).json({ error: 'Failed to save deck' });
  }
});

// Delete a flashcard note (just sets it to null)
app.delete('/flashcards/:id/note', optionalAuthenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const db = getDb();
    await db.run('UPDATE flashcards SET note = NULL WHERE id = ?', [id]);
    res.json({ success: true, id });
  } catch (e) {
    console.error('Failed to delete note:', e);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Update a flashcard note
app.patch('/flashcards/:id/note', optionalAuthenticateToken, async (req, res) => {
  const { id } = req.params;
  const { note, candidateId } = req.body;

  try {
    const db = getDb();
    
    if (candidateId) {
      // Save note for specific candidate
      await db.run(`
        INSERT INTO candidate_notes (candidate_id, flashcard_id, note)
        VALUES (?, ?, ?)
        ON CONFLICT(candidate_id, flashcard_id) DO UPDATE SET
          note = excluded.note,
          updated_at = CURRENT_TIMESTAMP
      `, [candidateId, id, note]);
    } else {
      // General note on the flashcard
      await db.run('UPDATE flashcards SET note = ? WHERE id = ?', [note, id]);
    }
    
    res.json({ success: true, id, note, candidateId });
  } catch (e) {
    console.error('Failed to update note:', e);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Remove all notes from a flashcard set
app.post('/flashcard-sets/:id/clear-notes', optionalAuthenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const db = getDb();
    await db.run('UPDATE flashcards SET note = NULL WHERE set_id = ?', [id]);
    res.json({ success: true, setId: id });
  } catch (e) {
    console.error('Failed to clear notes:', e);
    res.status(500).json({ error: 'Failed to clear notes' });
  }
});

// Candidate Routes
app.get('/candidates', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const candidates = await db.all('SELECT * FROM candidates WHERE user_id = ? ORDER BY created_at DESC', [req.user.userId]);
    res.json({ candidates });
  } catch (e) {
    console.error('Failed to fetch candidates:', e);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

app.post('/candidates', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

  try {
    const db = getDb();
    const result = await db.run('INSERT INTO candidates (user_id, name) VALUES (?, ?)', [req.user.userId, name.trim()]);
    res.json({ id: result.lastID, name: name.trim(), user_id: req.user.userId });
  } catch (e) {
    console.error('Failed to create candidate:', e);
    res.status(500).json({ error: 'Failed to create candidate' });
  }
});

app.delete('/candidates/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const db = getDb();
    // Verify ownership
    const candidate = await db.get('SELECT * FROM candidates WHERE id = ? AND user_id = ?', [id, req.user.userId]);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    await db.run('DELETE FROM candidates WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (e) {
    console.error('Failed to delete candidate:', e);
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});

// Update a flashcard set name
app.patch('/flashcard-sets/:id', optionalAuthenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const db = getDb();
    await db.run('UPDATE flashcard_sets SET name = ? WHERE id = ?', [name.trim(), id]);
    res.json({ success: true, id, name: name.trim() });
  } catch (e) {
    console.error('Failed to update set name:', e);
    res.status(500).json({ error: 'Failed to update set name' });
  }
});

// Health check endpoint for AI integration
// Returns details about API key availability, model resolution, and ability to generate simple content
app.get('/ai/health', async (req, res) => {
  const result = {
    ok: false,
    apiKeyPresent: Boolean(SERVER_GEMINI_KEY),
    modelPreferred: SERVER_GEMINI_MODEL,
    modelResolved: null,
    errors: [],
    suggestions: []
  };

  if (!SERVER_GEMINI_KEY) {
    result.errors.push('GEMINI_API_KEY is not set on the server.');
    result.suggestions.push('Add GEMINI_API_KEY to your .env and restart the server.');
    if (process.env.REACT_APP_GEMINI_API_KEY) {
      result.suggestions.push('You have REACT_APP_GEMINI_API_KEY set, but the server uses GEMINI_API_KEY. Copy the same key into GEMINI_API_KEY for server-side calls.');
    }
    return res.status(200).json(result);
  }

  try {
    // Ensure client exists
    if (!genAI) {
      genAI = new GoogleGenerativeAI(SERVER_GEMINI_KEY);
    }
    // Try to resolve a model (preferred + fallbacks)
    let resolved = null;
    try {
      resolved = genAI.getGenerativeModel({ model: SERVER_GEMINI_MODEL });
      result.modelResolved = SERVER_GEMINI_MODEL;
    } catch (e) {
      const fallbacks = ['gemini-2.5-flash', 'gemini-1.5-pro-latest', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-1.5-flash'];
      for (const m of fallbacks) {
        try {
          resolved = genAI.getGenerativeModel({ model: m });
          result.modelResolved = m;
          break;
        } catch (_) {}
      }
      if (!resolved) throw e;
    }

    // Attempt a very small generation to validate auth/quota
    try {
      const test = await resolved.generateContent('health-check');
      // If we get here, calls work
      const text = (await test.response).text();
      result.ok = true;
      if (text && text.length > 0) {
        // no-op, just confirming response
      }
      return res.status(200).json(result);
    } catch (apiErr) {
      const msg = (apiErr && apiErr.message) ? apiErr.message : String(apiErr);
      result.errors.push(msg);
      const lower = msg.toLowerCase();
      if (lower.includes('permission') || lower.includes('unauthorized') || lower.includes('401') || lower.includes('403') || lower.includes('api key')) {
        result.suggestions.push('Verify GEMINI_API_KEY is correct and has access to the selected model.');
        result.suggestions.push('Confirm the key was created in Google AI Studio (https://ai.google.dev) and not restricted in a way that blocks server calls.');
      } else if (lower.includes('quota') || lower.includes('rate limit')) {
        result.suggestions.push('You may have exceeded your quota. Check usage/quota in Google AI Studio.');
      } else if (lower.includes('model') && lower.includes('not found')) {
        result.suggestions.push('The preferred model may be unavailable for your key/region. Set GEMINI_MODEL to a supported value (e.g., gemini-2.5-pro, gemini-2.5-flash, gemini-1.5-pro-latest, or gemini-1.5-flash-latest).');
      }
      // Additional guidance for common Gemini Studio key pitfalls
      if (lower.includes('referrer') || lower.includes('referer') || lower.includes('http referrer') || lower.includes('ip address') || lower.includes('application restrictions')) {
        result.suggestions.push('Remove HTTP referrer or IP application restrictions on your AI Studio API key while testing server-side calls, or add your server origin to the allowed list.');
      }
      if (lower.includes('disabled') || lower.includes('not enabled')) {
        result.suggestions.push('Ensure Generative Language API access is enabled for your account and key in AI Studio.');
      }
      if (lower.includes('location') || lower.includes('region') || lower.includes('country') || lower.includes('not available')) {
        result.suggestions.push('The service/model may not be available in your region. Try a different model or check regional availability for your account.');
      }
      return res.status(200).json(result);
    }
  } catch (err) {
    const msg = (err && err.message) ? err.message : String(err);
    result.errors.push(msg);
    result.suggestions.push('Ensure GEMINI_API_KEY is valid and reachable from the server environment.');
    return res.status(200).json(result);
  }
});

app.post('/generate-flashcards', async (req, res) => {
  const { topic } = req.body || {};

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  if (!SERVER_GEMINI_KEY) {
    return res.status(500).json({ error: 'Server is not configured with GEMINI_API_KEY' });
  }

  if (!model) {
    // Attempt lazy init if it failed earlier
    try {
      genAI = new GoogleGenerativeAI(SERVER_GEMINI_KEY);
      try {
        model = genAI.getGenerativeModel({ model: SERVER_GEMINI_MODEL });
      } catch (inner) {
        const fallbacks = ['gemini-2.5-flash', 'gemini-1.5-pro-latest', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-1.5-flash'];
        for (const m of fallbacks) {
          try {
            model = genAI.getGenerativeModel({ model: m });
            console.warn(`Gemini: fell back to model ${m}`);
            break;
          } catch (_) {}
        }
        if (!model) throw inner;
      }
    } catch (e) {
      console.error('Lazy init failed:', e);
      return res.status(500).json({ error: 'Failed to initialize Gemini client on server' });
    }
  }

  const prompt = `Create a set of 5 flashcards on the topic of "${topic}". Each flashcard should be a JSON object with two fields: "front" and "back". The response should be a JSON array of these objects.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean up the response and parse the JSON
    const jsonString = text.replace(/```json\n|```/g, '').trim();
    const flashcards = JSON.parse(jsonString);

    if (!Array.isArray(flashcards)) {
      return res.status(500).json({ error: 'AI did not return a JSON array' });
    }

    res.json({ flashcards });
  } catch (error) {
    console.error('Error generating flashcards:', error);

    const message = (error && error.message) ? error.message : 'Failed to generate flashcards';
    // Map common auth/quota errors to clearer responses
    const lower = message.toLowerCase();
    if (lower.includes('permission') || lower.includes('403') || lower.includes('unauthorized') || lower.includes('401') || lower.includes('api key')) {
      return res.status(502).json({ 
        error: 'Gemini API authentication error. Verify GEMINI_API_KEY, quota, and model availability.',
        action: 'Call GET /ai/health for a detailed status and suggestions.'
      });
    }
    if (lower.includes('quota') || lower.includes('rate limit')) {
      return res.status(429).json({ 
        error: 'Gemini API quota or rate limit exceeded. Try again later or increase quota.',
        action: 'Use GET /ai/health to confirm status.'
      });
    }
    if (lower.includes('model') && lower.includes('not found')) {
      return res.status(502).json({ 
        error: 'Requested model unavailable for your key/region. Set GEMINI_MODEL to a supported model.',
        action: 'Use GET /ai/health to see which model was resolved.'
      });
    }

    res.status(500).json({ error: 'Failed to generate flashcards. Please verify your Google Gemini API key, quota, and model availability.', action: 'Use GET /ai/health for diagnostics.' });
  }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

async function migrateData() {
  const db = getDb();
  const username = 'interviewer';
  const password = 'Meth0dInterv1ew!';
  
  try {
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.run('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)', [username, hashedPassword, 1]);
      console.log(`Default user "${username}" created.`);
    } else {
      // Update password and ensure admin in case it changed in requirements or was manual
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.run('UPDATE users SET password = ?, is_admin = 1 WHERE username = ?', [hashedPassword, username]);
      console.log(`Default user "${username}" updated.`);
    }
  } catch (e) {
    console.error('Error seeding default user:', e);
  }
}

// Start the server
initDb().then(async () => {
  await migrateData();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
