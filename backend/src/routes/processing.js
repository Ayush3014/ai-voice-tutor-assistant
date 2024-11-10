const express = require('express');
const router = express.Router();
const processingController = require('../controllers/processingController');

// Start processing a video URL
router.post('/process', processingController.startProcessing);

// Get processing status and results
router.get('/process/:jobId', processingController.getProcessingStatus);

module.exports = router;
