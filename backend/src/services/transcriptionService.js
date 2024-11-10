const axios = require('axios');
require('dotenv').config();

class TranscriptionService {
  constructor() {
    this.assemblyAI = axios.create({
      baseURL: 'https://api.assemblyai.com/v2',
      headers: {
        authorization: process.env.ASSEMBLY_AI_API_KEY,
        'content-type': 'application/json',
      },
    });
  }

  async uploadVideo(videoUrl) {
    try {
      // Upload the video URL to AssemblyAI
      const response = await this.assemblyAI.post('/upload', {
        audio_url: videoUrl,
      });

      return response.data.upload_url;
    } catch (error) {
      console.error('Error uploading video:', error);
      throw new Error('Failed to upload video for transcription');
    }
  }

  async startTranscription(uploadUrl) {
    try {
      // Start the transcription job
      const response = await this.assemblyAI.post('/transcript', {
        audio_url: uploadUrl,
        language_detection: true,
        punctuate: true,
        format_text: true,
      });

      return response.data.id;
    } catch (error) {
      console.error('Error starting transcription:', error);
      throw new Error('Failed to start transcription process');
    }
  }

  async checkTranscriptionStatus(transcriptId) {
    try {
      const response = await this.assemblyAI.get(`/transcript/${transcriptId}`);
      return response.data;
    } catch (error) {
      console.error('Error checking transcription status:', error);
      throw new Error('Failed to check transcription status');
    }
  }

  async getTranscriptionResult(transcriptId) {
    try {
      let status = await this.checkTranscriptionStatus(transcriptId);

      while (status.status !== 'completed' && status.status !== 'error') {
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Poll every 3 seconds
        status = await this.checkTranscriptionStatus(transcriptId);
      }

      if (status.status === 'error') {
        throw new Error('Transcription failed: ' + status.error);
      }

      return status.text;
    } catch (error) {
      console.error('Error getting transcription result:', error);
      throw new Error('Failed to get transcription result');
    }
  }
}

module.exports = TranscriptionService;
