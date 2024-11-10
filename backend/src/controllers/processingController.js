const ProcessingJob = require('../models/ProcessingJob');
const TranscriptionService = require('../services/transcriptionService');
const SummarizationService = require('../services/summarizationService');

const transcriptionService = new TranscriptionService();
const summarizationService = new SummarizationService();

exports.startProcessing = async (req, res) => {
  try {
    const { videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    // Create new processing job
    const processingJob = new ProcessingJob({
      videoUrl,
      status: 'transcribing',
    });
    await processingJob.save();

    // Start async processing
    processVideo(processingJob._id, videoUrl);

    res.status(202).json({
      message: 'Processing started',
      jobId: processingJob._id,
      status: 'transcribing',
    });
  } catch (error) {
    console.error('Error starting processing:', error);
    res.status(500).json({ error: 'Failed to start processing' });
  }
};

const processVideo = async (jobId, videoUrl) => {
  const job = await ProcessingJob.findById(jobId);

  try {
    // Step 1: Upload video to AssemblyAI
    // console.log(`Uploading video for job ${jobId}`);
    // const uploadUrl = await transcriptionService.uploadVideo(videoUrl);

    // Step 1: Start transcription
    console.log(`Starting transcription for job ${jobId}`);
    const transcriptionId = await transcriptionService.startTranscription(
      videoUrl
    );

    // Step 2: Get transcription result
    console.log(`Getting transcription result for job ${jobId}`);
    const transcription = await transcriptionService.getTranscriptionResult(
      transcriptionId
    );

    job.transcription = transcription;
    job.status = 'summarizing';
    await job.save();

    // Step 3: Summarization
    console.log(`Starting summarization for job ${jobId}`);
    const summary = await summarizationService.summarize(transcription);
    console.log('Summarized successfully!');
    job.summary = summary;
    job.status = 'completed';
    job.completedAt = new Date();
    await job.save();
  } catch (error) {
    console.error(`Processing error for job ${jobId}:`, error);
    job.status = 'failed';
    job.error = error.message;
    await job.save();
  }
};

exports.getProcessingStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await ProcessingJob.findById(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Processing job not found' });
    }

    const response = {
      jobId: job._id,
      status: job.status,
      createdAt: job.createdAt,
    };

    if (job.error) {
      response.error = job.error;
    }

    if (job.status === 'completed') {
      response.transcription = job.transcription;
      response.summary = job.summary;
      response.completedAt = job.completedAt;
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({ error: 'Failed to fetch processing status' });
  }
};
