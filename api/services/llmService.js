const axios = require('axios');

class LLMService {
  constructor() {
    // Configure available providers. Order determines priority.
    this.providers = [
      {
        id: 'groq',
        name: 'Groq',
        apiKey: process.env.GROQ_API_KEY,
        type: 'openai',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile',
      },
      {
        id: 'openrouter',
        name: 'OpenRouter',
        apiKey: process.env.OPENROUTER_API_KEY,
        type: 'openai',
        url: 'https://openrouter.ai/api/v1/chat/completions',
        model: 'meta-llama/llama-3.3-70b-instruct',
      },
      {
        id: 'together',
        name: 'Together AI',
        apiKey: process.env.TOGETHER_API_KEY,
        type: 'openai',
        url: 'https://api.together.xyz/v1/chat/completions',
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      },
      {
        id: 'gemini',
        name: 'Google Gemini',
        apiKey: process.env.GEMINI_API_KEY,
        type: 'gemini',
        url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        model: 'gemini-1.5-flash',
      }
    ].filter(p => p.apiKey && !p.apiKey.includes('your_')); // Only use configured providers
  }

  /**
   * Main entry point with failover logic
   */
  async generateCompletion(messages, options = { jsonMode: true }) {
    let lastError = null;

    for (const provider of this.providers) {
      try {
        console.log(`Trying LLM Provider: ${provider.name}...`);
        const result = await this.executeProvider(provider, messages, options);
        console.log(`Success with ${provider.name}`);
        return result;
      } catch (error) {
        console.error(`Provider ${provider.name} failed:`, error.message);
        lastError = error;
        
        // Specifically check for rate limits (429), quota issues (402), or forbidden (403)
        const status = error.response?.status;
        if (status === 429 || status === 402 || status === 403 || status === 503) {
          console.warn(`Provider ${provider.name} exhausted. Falling back...`);
          continue; // Try next provider
        }
        
        // If it's a structural error (like bad prompt), maybe don't fallback?
        // For now, we fallback on any error to be safe, unless it's a 4xx that isn't 429/402
        if (status >= 400 && status < 500 && status !== 429 && status !== 402) {
            throw error; 
        }
      }
    }

    throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
  }

  async executeProvider(provider, messages, options) {
    if (provider.type === 'openai') {
      return this.executeOpenAI(provider, messages, options);
    } else if (provider.type === 'gemini') {
      return this.executeGemini(provider, messages, options);
    }
  }

  async executeOpenAI(provider, messages, options) {
    const payload = {
      model: provider.model,
      messages: messages,
      response_format: options.jsonMode ? { type: 'json_object' } : undefined,
    };

    const response = await axios.post(provider.url, payload, {
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    const content = response.data.choices[0]?.message?.content;
    return options.jsonMode ? JSON.parse(content) : content;
  }

  async executeGemini(provider, messages, options) {
    // Gemini has a different message format
    // Map OpenAI messages to Gemini contents
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // If there's a system message, in Gemini 1.5 we use system_instruction
    const systemMessage = messages.find(m => m.role === 'system');
    const filteredContents = contents.filter(c => messages[contents.indexOf(c)].role !== 'system');

    const payload = {
      contents: filteredContents,
      generationConfig: {
        responseMimeType: options.jsonMode ? "application/json" : "text/plain",
      }
    };

    if (systemMessage) {
      payload.systemInstruction = {
        parts: [{ text: systemMessage.content }]
      };
    }

    const url = `${provider.url}?key=${provider.apiKey}`;
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    const content = response.data.candidates[0]?.content?.parts[0]?.text;
    return options.jsonMode ? JSON.parse(content) : content;
  }
}

module.exports = new LLMService();
