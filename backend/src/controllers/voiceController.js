const VoiceInteractionService = require('../services/VoiceInteractionService');
const voiceService = new VoiceInteractionService();

exports.startVoiceSession = async (req, res) => {
  console.log('start voice session');
  try {
    const { jobId } = req.params;
    if (!jobId) return res.status(400).json({ error: 'Job ID is required' });
    console.log('job id: ', jobId);
    const sessionData = await voiceService.createVoiceSession(jobId);
    res.status(200).json(sessionData);
  } catch (error) {
    console.error('Error starting voice session:', error);
    res.status(500).json({ error: 'Failed to start voice session' });
  }
};

exports.evaluateAnswer = async (req, res) => {
  console.log('evaluating answers');
  try {
    const { jobId, answers } = req.body; // 'answers' is an array of answer objects

    // Evaluate all answers in batch for efficient processing
    const evaluations = await Promise.all(
      answers.map(async (answer) => {
        const { userAnswer, correctAnswer, questionId } = answer;
        return await voiceService.compareAnswers(
          userAnswer,
          correctAnswer,
          jobId,
          questionId
        );
      })
    );

    // Return evaluations for all answers
    res.json({ evaluations });
  } catch (error) {
    console.error('Error evaluating answers:', error);
    res.status(500).json({ error: 'Failed to evaluate answers in batch' });
  }
};
