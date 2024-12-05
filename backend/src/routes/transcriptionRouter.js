const express = require('express');
const router = express.Router();
const transcriptionController = require('../controllers/transcriptionController');
const multer = require('multer');
const path = require('path');

// Configure multer for handling audio files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `audio-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

router.post(
  '/transcribe',
  upload.single('audio'),
  transcriptionController.transcribeAudio
);

router.post('/query/:jobId', transcriptionController.handleQuery);

module.exports = router;
