const fs = require('fs').promises;
const OpenAITranscription = require('../services/openAiTranscription');

const transcriptionService = new OpenAITranscription();

exports.transcribeAudio = async (req, res) => {
  console.log('Transcription request received');
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Validate file
    const validation = transcriptionService.validateAudioFile(req.file);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Transcribe audio
    const result = await transcriptionService.transcribeAudio(req.file.path);

    // Clean up: delete the uploaded file after processing
    await fs.unlink(req.file.path);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ text: result.text });
  } catch (error) {
    console.error('Error during transcription:', error);
    res.status(500).json({ error: 'Server error during transcription' });
  }
};
