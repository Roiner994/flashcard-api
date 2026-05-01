const express = require('express');
const cors = require('cors');
require('dotenv').config();
const llmService = require('./services/llmService');
const { supabase } = require('./lib/supabase');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const checkSupabase = (req, res, next) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase service is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env' });
  }
  next();
};

// ── Auth Metadata Cache ──────────────────────────────────────────────
// Instead of calling auth.admin.getUserById() for every user on every request,
// we fetch all users once and refresh the cache periodically.
const AUTH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let authMetadataCache = new Map(); // userId -> { full_name, avatar_url }
let cacheReady = false;

async function refreshAuthCache() {
  if (!supabase) return;
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      console.error('Failed to refresh auth cache:', error.message);
      return;
    }
    const newCache = new Map();
    for (const user of users) {
      const meta = user.user_metadata || {};
      newCache.set(user.id, {
        full_name: meta.full_name || meta.name || null,
        avatar_url: meta.avatar_url || meta.picture || null,
      });
    }
    authMetadataCache = newCache;
    cacheReady = true;
    console.log(`Auth cache refreshed: ${newCache.size} users`);
  } catch (err) {
    console.error('Auth cache refresh error:', err.message);
  }
}

function getAuthMeta(userId) {
  return authMetadataCache.get(userId) || { full_name: null, avatar_url: null };
}

// Middleware: ensure cache is warm before serving community endpoints
const ensureCacheReady = async (req, res, next) => {
  if (!cacheReady) {
    await refreshAuthCache();
  }
  next();
};

// Refresh cache on startup and every 5 minutes
refreshAuthCache();
setInterval(refreshAuthCache, AUTH_CACHE_TTL_MS);

app.post('/api/generate', async (req, res) => {
  const { word } = req.body;

  if (!word) {
    return res.status(400).json({ error: 'Word is required' });
  }

  try {
    const flashcardData = await llmService.generateCompletion([
      {
        role: 'system',
        content: `You are a helpful language learning assistant. 
        Generate a valid JSON object for a language learning flashcard for the given word.
        The JSON must strictly follow this schema:
        {
          "word": "item (string)",
          "definition": "string (in English)",
          "spanish_meaning": "string",
          "phonetic": "string (IPA)",
          "examples": ["string", "string", "string"],
          "audio_text": "string (simple text to be read by a TTS engine)"
        }
        Ensure the response is ONLY valid JSON.`
      },
      {
        role: 'user',
        content: `Generate a flashcard for the word: "${word}"`
      }
    ]);

    res.json(flashcardData);
  } catch (error) {
    console.error('Error in /api/generate:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate flashcard', 
      details: error.message 
    });
  }
});

app.post('/api/challenge', async (req, res) => {
  const { word, phrase } = req.body;

  if (!word || !phrase) {
    return res.status(400).json({ error: 'Both "word" and "phrase" are required' });
  }

  try {
    const resultData = await llmService.generateCompletion([
      {
        role: 'system',
        content: `You are a strict but helpful language tutor. 
        Evaluate the user's sentence based on their usage of the specific target word.
        
        Return a valid JSON object with the following fields:
        - "score": integer (1-10), indicating how well the word was used.
        - "feedback": string, a brief explanation of the score and if the word was used correctly.
        - "improved_phrase": string, a better or corrected version of the sentence. If the original is perfect, improve it stylistically or simple return the original.

        Ensure the response is ONLY valid JSON.`
      },
      {
        role: 'user',
        content: `Target word: "${word}"
        User phrase: "${phrase}"`
      }
    ]);

    res.json(resultData);
  } catch (error) {
    console.error('Error in /api/challenge:', error.message);
    res.status(500).json({ 
      error: 'Failed to evaluate challenge', 
      details: error.message 
    });
  }
});

app.get('/api/community/explore', checkSupabase, ensureCacheReady, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: decks, error } = await supabase
      .from('decks')
      .select('*, profiles:user_id(username, avatar_url)')
      .eq('is_public', true)
      .order('likes_count', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Enrich with full_name from cached auth metadata (O(1) per user)
    const enriched = decks.map(deck => {
      const authMeta = getAuthMeta(deck.user_id);
      return {
        ...deck,
        profiles: {
          ...deck.profiles,
          full_name: authMeta.full_name || deck.profiles?.username || null,
          avatar_url: deck.profiles?.avatar_url || authMeta.avatar_url || null,
        }
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('Error in /api/community/explore:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/community/people', checkSupabase, ensureCacheReady, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: people, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, current_streak')
      .order('current_streak', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Enrich with full_name from cached auth metadata (O(1) per user)
    const enriched = people.map(person => {
      const authMeta = getAuthMeta(person.id);
      return {
        ...person,
        full_name: authMeta.full_name || null,
        avatar_url: person.avatar_url || authMeta.avatar_url || null,
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('Error in /api/community/people:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/community/like', checkSupabase, async (req, res) => {
  const { deck_id, user_id } = req.body;
  if (!deck_id || !user_id) return res.status(400).json({ error: 'deck_id and user_id required' });

  try {
    const { data, error } = await supabase.rpc('toggle_deck_like', {
      p_deck_id: deck_id,
      p_user_id: user_id
    });
    if (error) throw error;
    res.json({ liked: data });
  } catch (error) {
    console.error('Error in /api/community/like:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/community/fork', checkSupabase, async (req, res) => {
  const { deck_id, user_id } = req.body;
  if (!deck_id || !user_id) return res.status(400).json({ error: 'deck_id and user_id required' });

  try {
    const { data: originalDeck, error: deckError } = await supabase
      .from('decks')
      .select('*')
      .eq('id', deck_id)
      .single();
    if (deckError) throw deckError;

    const { data: newDeck, error: newDeckError } = await supabase
      .from('decks')
      .insert({
        title: originalDeck.title,
        user_id: user_id,
        is_public: false,
        likes_count: 0,
        downloads_count: 0,
        tags: originalDeck.tags
      })
      .select()
      .single();
    if (newDeckError) throw newDeckError;

    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deck_id);
    if (cardsError) throw cardsError;

    if (cards && cards.length > 0) {
      const newCards = cards.map(c => ({
        deck_id: newDeck.id,
        front_word: c.front_word,
        definition: c.definition,
        spanish_meaning: c.spanish_meaning,
        phonetic: c.phonetic,
        examples: c.examples,
        example_sentence: c.example_sentence,
        status: 'new',
        interval: 0,
        ease_factor: 2.5
      }));
      const { error: insertCardsError } = await supabase
        .from('cards')
        .insert(newCards);
      if (insertCardsError) throw insertCardsError;
    }

    await supabase.rpc('increment_downloads', { p_deck_id: deck_id });

    res.json({ new_deck_id: newDeck.id });
  } catch (error) {
    console.error('Error in /api/community/fork:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Export the Express app
module.exports = app;

// Listen if run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
