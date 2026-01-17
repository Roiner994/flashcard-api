import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { word } = request.body;

  if (!word) {
    return response.status(400).json({ error: 'Word is required' });
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
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
            "context_tip": "string (a short tip to remember the word)"
          }
          Ensure the response is ONLY valid JSON.`,
        },
        {
          role: 'user',
          content: `Generate a flashcard for the word: "${word}"`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
    });

    const content = chatCompletion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from AI');
    }

    const flashcard = JSON.parse(content);
    return response.status(200).json(flashcard);

  } catch (error) {
    console.error('Error generating flashcard:', error);
    return response.status(500).json({ error: 'Failed to generate flashcard', details: error.message });
  }
}
