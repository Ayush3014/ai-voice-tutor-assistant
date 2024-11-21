// const { Room } = require('livekit-client');
// const { AccessToken } = require('livekit-server-sdk');

const { OpenAI } = require('openai');
const ProcessingJob = require('../models/ProcessingJob');

class VoiceInteractionService {
  constructor() {
    this.livekitHost = process.env.LIVEKIT_HOST;
    this.apiKey = process.env.LIVEKIT_API_KEY;
    this.apiSecret = process.env.LIVEKIT_API_SECRET;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-3.5-turbo',
    });
  }

  async createVoiceSession(jobId) {
    console.log('in the create voice session service');
    try {
      // Dynamically import LiveKit
      const { AccessToken } = await import('livekit-server-sdk');
      const { Room } = await import('livekit-client');
      console.log('imported successfully!!');
      const roomName = `voice-session-${jobId}`;

      const at = new AccessToken(this.apiKey, this.apiSecret, {
        identity: jobId,
      });

      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
      });

      const token = await at.toJwt();
      console.log('token generated: ', token);
      const job = await ProcessingJob.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      return {
        token,
        roomName,
        questions: job.questions,
      };
    } catch (error) {
      console.error('Error creating voice session:', error);
      throw error;
    }
  }

  async compareAnswers(userAnswer, correctAnswer, jobId, questionId) {
    console.log('comparing answers');
    try {
      // Use OpenAI to compare the answers and provide feedback
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that evaluates answers for correctness and provides feedback. Return only a JSON object with the following fields: userAnswer (string) confidenceScore (number), feedback (string), isCorrect (boolean), and correctAnswer (string).',
          },
          {
            role: 'user',
            content: `
            Evaluate the following answer:

            User Answer: "${userAnswer}"
            Correct Answer: "${correctAnswer}"
          `,
          },
        ],
      });

      const evaluation = response.choices[0].message.content;
      console.log('evaluation: ', evaluation);
      // Parse the evaluation response
      // return this.parseEvaluation(evaluation);
      return JSON.parse(evaluation);
    } catch (error) {
      console.error('Error in OpenAI evaluation:', error);
      throw new Error('OpenAI evaluation failed');
    }
  }
}

module.exports = VoiceInteractionService;
