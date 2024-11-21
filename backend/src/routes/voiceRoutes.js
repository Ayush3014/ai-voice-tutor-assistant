const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voiceController');

router.post('/session/:jobId', voiceController.startVoiceSession);
router.post('/evaluate', voiceController.evaluateAnswer);

module.exports = router;
