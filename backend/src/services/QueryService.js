const { OpenAI } = require('openai');

class QueryService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-3.5-turbo',
    });
  }

  async getAnswer(summary, userQuery) {
    console.log('in the getAnswer');
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an AI tutor. Use the following summary to answer questions or clarify doubts concisely and accurately: "${summary}"`,
          },
          {
            role: 'user',
            content: userQuery,
          },
        ],
      });
      console.log('response: ', response);
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error in OpenAI query:', error);
      throw new Error('Failed to get an answer');
    }
  }
}

module.exports = QueryService;
