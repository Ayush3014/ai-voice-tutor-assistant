const fs = require('fs').promises;
const OpenAITranscription = require('../services/openAiTranscription');
const QueryService = require('../services/QueryService');
const ProcessingJob = require('../models/ProcessingJob');

const transcriptionService = new OpenAITranscription();
const queryService = new QueryService();

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

exports.handleQuery = async (req, res) => {
  console.log('Query request received');
  console.log('request: ', req);
  const { jobId } = req.params;
  const { userQuery } = req.body;
  console.log('jobid: ', jobId);
  console.log('userQuery: ', userQuery);
  if (!jobId || !userQuery) {
    return res.status(400).json({ error: 'Missing jobId or userQuery' });
  }

  try {
    const job = await ProcessingJob.findById(jobId);
    if (!job || !job.summary) {
      return res
        .status(404)
        .json({ error: 'Job not found or summary missing' });
    }
    console.log('Query job: ', job);
    const answer = await queryService.getAnswer(job.summary, userQuery);
    console.log('answer: ', answer);
    res.json({ answer });
  } catch (error) {
    console.error('Error handling query:', error);
    res.status(500).json({ error: 'Error processing the query' });
  }
};
