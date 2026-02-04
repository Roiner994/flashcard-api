const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.post('/api/generate', async (req, res) => {
  const { word } = req.body;

  if (!word) {
    return res.status(400).json({ error: 'Word is required' });
  }

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
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
        ],
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const flashcardData = response.data.choices[0]?.message?.content;

    if (!flashcardData) {
      throw new Error('No content received from Groq API');
    }

    res.json(JSON.parse(flashcardData));
  } catch (error) {
    console.error('Error calling Groq API:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to generate flashcard', 
      details: error.response?.data || error.message 
    });
  }
});

app.post('/api/challenge', async (req, res) => {
  const { word, phrase } = req.body;

  if (!word || !phrase) {
    return res.status(400).json({ error: 'Both "word" and "phrase" are required' });
  }

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
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
        ],
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const resultData = response.data.choices[0]?.message?.content;

    if (!resultData) {
      throw new Error('No content received from Groq API');
    }

    res.json(JSON.parse(resultData));
  } catch (error) {
    console.error('Error calling Groq API for challenge:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to evaluate challenge', 
      details: error.response?.data || error.message 
    });
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
