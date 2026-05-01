const llmService = require('./services/llmService');

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { word } = request.body;

  if (!word) {
    return response.status(400).json({ error: 'Word is required' });
  }

  try {
    const flashcard = await llmService.generateCompletion([
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
        Ensure the response is ONLY valid JSON.`,
      },
      {
        role: 'user',
        content: `Generate a flashcard for the word: "${word}"`,
      },
    ]);

    return response.status(200).json(flashcard);

  } catch (error) {
    console.error('Error generating flashcard:', error.message);
    return response.status(500).json({ 
      error: 'Failed to generate flashcard', 
      details: error.message 
    });
  }
}
