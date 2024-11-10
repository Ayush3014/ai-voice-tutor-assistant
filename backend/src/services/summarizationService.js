const axios = require('axios');
const { OpenAI } = require('openai');
require('dotenv').config();

class SummarizationService {
  constructor() {
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize Hugging Face client
    this.huggingface = axios.create({
      baseURL:
        'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async summarizeWithOpenAI(text) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo-16k', // Using 16k model for longer texts
        messages: [
          {
            role: 'system',
            content:
              'You are a precise summarizer. Create a detailed summary that captures the main points and key details from the provided text. The summary should be well-structured and maintain the logical flow of information.',
          },
          {
            role: 'user',
            content: `Please summarize the following text:\n\n${text}`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.5,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI summarization error:', error);
      throw new Error('Failed to summarize with OpenAI');
    }
  }

  async summarizeWithHuggingFace(text) {
    try {
      // Split text into chunks if it's too long (BART typically has a 1024 token limit)
      const chunks = this.splitTextIntoChunks(text, 1000);
      let summaries = [];

      for (const chunk of chunks) {
        const response = await this.huggingface.post('', {
          inputs: chunk,
          parameters: {
            max_length: 300,
            min_length: 30,
            do_sample: false,
          },
        });

        summaries.push(response.data[0].summary_text);
      }

      // Combine summaries if there were multiple chunks
      return summaries.join('\n\n');
    } catch (error) {
      console.error('Hugging Face summarization error:', error);
      throw new Error('Failed to summarize with Hugging Face');
    }
  }

  splitTextIntoChunks(text, maxChunkLength) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkLength) {
        chunks.push(currentChunk);
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  async summarize(text, preferredService = 'openai') {
    try {
      if (preferredService === 'openai') {
        return await this.summarizeWithOpenAI(text);
      } else {
        return await this.summarizeWithHuggingFace(text);
      }
    } catch (error) {
      // If preferred service fails, try the alternative
      console.log(`${preferredService} failed, trying alternative service...`);
      try {
        return await (preferredService === 'openai'
          ? this.summarizeWithHuggingFace(text)
          : this.summarizeWithOpenAI(text));
      } catch (fallbackError) {
        throw new Error('Both summarization services failed');
      }
    }
  }
}

module.exports = SummarizationService;
