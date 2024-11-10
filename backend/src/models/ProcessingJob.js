const mongoose = require('mongoose');

const processingJobSchema = new mongoose.Schema({
  videoUrl: {
    type: String,
    required: true,
    trim: true,
  },
  transcription: {
    type: String,
    default: '',
  },
  summary: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: [
      'pending',
      'transcribing',
      'transcribed',
      'summarizing',
      'completed',
      'failed',
    ],
    default: 'pending',
  },
  error: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model('ProcessingJob', processingJobSchema);
