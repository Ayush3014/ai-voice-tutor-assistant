import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const VoiceSession = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [evaluations, setEvaluations] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const audioChunksRef = useRef([]);
  const speechSynthesisRef = useRef(null);

  useEffect(() => {
    console.log('Initializing session for jobId:', jobId);
    initializeSession();
  }, []);

  useEffect(() => {
    if (sessionData && sessionData.questions) {
      askCurrentQuestion();
    }
  }, [currentQuestionIndex, sessionData]);

  const initializeSession = async () => {
    console.log('Initializing voice tutoring session...');
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `http://localhost:5000/api/v1/voice/session/${jobId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to initialize session: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Session data received:', data);
      setSessionData(data);

      await speakText(
        "Welcome to your voice tutoring session. Let's begin with the first question."
      );

      await askCurrentQuestion();
    } catch (err) {
      console.error('Error initializing session:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const speakText = async (text) => {
    console.log('Speaking text:', text);
    setFeedback('Speaking');
    return new Promise((resolve, reject) => {
      console.log('in promise');
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      console.log('utterance object created: ', utterance);
      utterance.onend = () => {
        console.log('Speech synthesis finished');
        setFeedback('Finished speaking');
        resolve();
      };

      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        setFeedback('Speech error: ' + error.message);
        reject(error);
      };
      console.log('speaking');
      window.speechSynthesis.speak(utterance);
      console.log('after speak');
      console.log(speechSynthesis.current);
      speechSynthesisRef.current = utterance;
      console.log('speak text complete');
    });
  };

  const startListening = async () => {
    console.log('Starting listening...');
    try {
      setFeedback('Starting recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/wav',
        });
        await processAudio(audioBlob);
      };

      recorder.start(1000);
      setIsListening(true);
      setFeedback('Recording... Speak now');
    } catch (err) {
      setFeedback('Error starting recording: ' + err.message);
    }
  };

  const stopListening = () => {
    console.log('Stopping listening...');
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setFeedback('Processing your answer...');
    }
    setIsListening(false);
  };

  const processAudio = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.wav');
      const response = await fetch(
        'http://localhost:5000/api/v1/transcript/transcribe',
        {
          method: 'POST',
          body: formData,
        }
      );

      const { text } = await response.json();
      handleUserAnswer(text);
    } catch (err) {
      setFeedback('Error processing audio: ' + err.message);
    }
  };

  const handleUserAnswer = async (answer) => {
    console.log('Handling user answer:', answer);
    setFeedback('Answer recorded: ' + answer);

    setUserAnswers((prev) => [
      ...prev,
      {
        questionId: sessionData.questions[currentQuestionIndex]._id,
        question: sessionData.questions[currentQuestionIndex].question,
        userAnswer: answer,
        correctAnswer: sessionData.questions[currentQuestionIndex].answer,
      },
    ]);

    if (currentQuestionIndex < sessionData.questions.length - 1) {
      console.log('Moving to next question...');
      // First update the index
      setCurrentQuestionIndex((prev) => prev + 1);
      // Wait for state update to complete using useEffect
      // setTimeout(() => askCurrentQuestion(), 1000);
    } else {
      console.log('All questions answered, stopping session...');
      await speakText('Thank you for completing all questions.');
      await submitAnswers();
    }
  };

  const askCurrentQuestion = async () => {
    const question = sessionData.questions[currentQuestionIndex].question;
    console.log('Asking question:', question);
    try {
      await speakText(question);
    } catch (err) {
      console.error('Error asking question: ', err);
      setError(`Failed to speak question: ${err.message}`);
    }
  };

  const submitAnswers = async () => {
    console.log('Evaluating user answers...');
    setFeedback('Submitting answers for evaluation...');
    try {
      const response = await fetch(
        'http://localhost:5000/api/v1/voice/evaluate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, answers: userAnswers }),
        }
      );

      if (!response.ok) {
        throw new Error(`Evaluation failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Evaluation results:', result);
      setEvaluations(result.evaluations);
      setFeedback('Evaluation complete!');
      // Force a re-render by setting another state
      setCurrentQuestionIndex(sessionData.questions.length);
      navigate(`/evaluations/${jobId}`, {
        state: { evaluations: result.evaluations },
      });
    } catch (err) {
      setFeedback('Error submitting answers: ' + err.message);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-lg text-gray-700">
        Loading session...
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center h-screen text-lg text-red-600">
        Error: {error}
      </div>
    );

  // if (evaluations) {
  //   console.log('Evaluations exists:', evaluations);

  //   return (
  //     <div className="evaluation-results bg-gray-100 p-4 rounded shadow-md">
  //       <h2 className="text-xl font-semibold mb-4">Evaluation Results</h2>
  //       {evaluations.map((evaluation, index) => (
  //         <div
  //           key={index}
  //           className="evaluation-item bg-white p-4 mb-4 rounded border border-gray-300"
  //         >
  //           <p className="text-gray-800 font-medium mb-2">
  //             <strong>Feedback:</strong> {evaluation.feedback}
  //           </p>
  //           <p className="text-gray-700 mb-2">
  //             <strong>Correct Answer:</strong> {evaluation.correctAnswer}
  //           </p>
  //           <p className="text-gray-700 mb-2">
  //             <strong>Confidence Score:</strong> {evaluation.confidenceScore}
  //           </p>
  //           <p
  //             className={`font-semibold ${
  //               evaluation.isCorrect ? 'text-green-600' : 'text-red-600'
  //             }`}
  //           >
  //             <strong>Result:</strong>{' '}
  //             {evaluation.isCorrect ? 'Correct' : 'Incorrect'}
  //           </p>
  //         </div>
  //       ))}
  //     </div>
  //   );
  // }

  return (
    <div className="voice-session flex flex-col items-center bg-gray-100 p-6 min-h-screen">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Voice Tutoring Session
      </h2>
      <div className="feedback-message text-lg font-medium text-blue-600 mb-4">
        {feedback}
      </div>

      <div className="question-container bg-white shadow-lg rounded-lg p-6 mb-6 w-full max-w-lg text-center">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          Question {currentQuestionIndex + 1} of {sessionData.questions.length}
        </h3>
        <p className="question-text text-base text-gray-600 mb-4">
          {sessionData.questions[currentQuestionIndex].question}
        </p>

        <div className="controls flex justify-center gap-4 mt-4">
          <button
            onClick={() => askCurrentQuestion()}
            className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Repeat Question
          </button>
          <button
            className={`px-4 py-2 font-semibold rounded-lg shadow focus:outline-none focus:ring-2 ${
              isListening
                ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-300'
                : 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-300'
            }`}
            onClick={() => (isListening ? stopListening() : startListening())}
          >
            {isListening ? 'Stop Recording' : 'Start Recording'}
          </button>
        </div>
      </div>

      <div className="answers-container w-full max-w-lg bg-gray-50 p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Your Previous Answers:
        </h3>
        {userAnswers.map((answer, index) => (
          <div
            key={index}
            className="answer-entry bg-white p-4 mb-3 rounded-lg shadow border border-gray-200"
          >
            <p className="text-gray-800 font-medium">
              <strong>Q:</strong> {answer.question}
            </p>
            <p className="text-gray-700">
              <strong>A:</strong> {answer.userAnswer}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VoiceSession;
