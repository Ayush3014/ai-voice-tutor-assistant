const axios = require('axios');
const { OpenAI } = require('openai');
const { Groq } = require('groq-sdk');
require('dotenv').config();

class SummarizationService {
  constructor() {
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-3.5-turbo',
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

    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async summarizeWithOpenAI(text) {
    console.log('summarizing with openai');
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
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
      console.log('summarized successfully');
      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI summarization error:', error);
      throw new Error('Failed to summarize with OpenAI');
    }
  }

  async summarizeWithHuggingFace(text) {
    console.log('summarizing with huggingface');
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
      console.log('summarized successfully');
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

  async generateQuestionsWithOpenAI(summary) {
    console.log('generating questions with openai');
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are an educational assistant that generates concise comprehension questions and answers based on a provided summary. Format each question-answer pair clearly, without using any prefixes like "-" in the answers. Generate a maximum of 3 questions with answers.',
          },
          {
            role: 'user',
            content: `Based on the following summary, generate some comprehension questions with expected answers:\n\n${summary}`,
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
      });

      console.log(response.choices[0].message.content);
      console.log('questions generated successfully');
      const questionsAndAnswers = response.choices[0].message.content
        .split('\n')
        .filter((line) => line.trim() !== '')
        .reduce((acc, line, index) => {
          if (index % 2 === 0) {
            acc.push({ question: line.trim() });
          } else {
            acc[Math.floor(index / 2)].answer = line.trim();
          }
          return acc;
        }, []);
      console.log(questionsAndAnswers);
      return questionsAndAnswers;
    } catch (error) {
      console.error('OpenAI question generation error:', error);
      throw new Error('Failed to generate questions with OpenAI');
    }
  }

  async generateQuestionsWithGroq(summary) {
    console.log('generating questions with groq');
    try {
      const response = await this.groq.chat.completions.create({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content:
              'You are an educational assistant that generates questions based on a summary.',
          },
          {
            role: 'user',
            content: `Based on the following summary, generate three comprehension questions with expected answers. Format each question-answer pair clearly:\n\n${summary}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });
      console.log('after groq call');
      const content = response.choices[0].message.content;
      console.log('content: ', content);
      // Parse the response into question-answer pairs
      const lines = content.split('\n').filter((line) => line.trim() !== '');
      const questionsAndAnswers = [];
      console.log('questions generated successfully');
      for (let i = 0; i < lines.length; i += 2) {
        if (i + 1 < lines.length) {
          questionsAndAnswers.push({
            question: lines[i].trim(),
            answer: lines[i + 1].trim(),
          });
        }
      }
      console.log(questionsAndAnswers);
      return questionsAndAnswers;
    } catch (error) {
      console.error('Groq question generation error:', error);
      throw new Error('Failed to generate questions with Groq');
    }
  }

  async generateQuestions(summary, preferredService = 'openai') {
    try {
      if (preferredService === 'openai') {
        return await this.generateQuestionsWithOpenAI(summary);
      } else {
        return await this.generateQuestionsWithGroq(summary);
      }
    } catch (error) {
      console.log(`${preferredService} failed, trying alternative service...`);
      try {
        return await (preferredService === 'openai'
          ? this.generateQuestionsWithGroq(summary)
          : this.generateQuestionsWithOpenAI(summary));
      } catch (fallbackError) {
        throw new Error('All question generation services failed');
      }
    }
  }
}

module.exports = SummarizationService;
