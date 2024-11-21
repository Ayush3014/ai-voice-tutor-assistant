const OpenAI = require('openai');
const fs = require('fs');

class OpenAITranscription {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async transcribeAudio(audioFilePath) {
    try {
      console.log('Starting transcription (openai) for:', audioFilePath);

      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFilePath),
        model: 'whisper-1',
        language: 'en',
        response_format: 'json',
        temperature: 0.2,
      });

      console.log('Transcription completed');
      return {
        success: true,
        text: transcription.text,
      };
    } catch (error) {
      console.error('Transcription error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Method to validate audio file
  validateAudioFile(file) {
    // Add your validation logic here
    const validMimeTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg'];
    const maxSize = 25 * 1024 * 1024; // 25MB

    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (!validMimeTypes.includes(file.mimetype)) {
      return { valid: false, error: 'Invalid file type' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File too large (max 25MB)' };
    }

    return { valid: true };
  }
}

module.exports = OpenAITranscription;
