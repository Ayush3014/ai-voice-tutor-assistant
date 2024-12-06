import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const QueryHandler = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [queryResponse, setQueryResponse] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const audioChunksRef = useRef([]);

  const startListening = async () => {
    console.log('Started listening');
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

      recorder.start();
      setIsListening(true);
      setFeedback('Recording... Speak now');
    } catch (error) {
      setFeedback('Error starting recording: ' + error.message);
    }
  };

  const stopListening = () => {
    console.log('Stopped listening');
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setFeedback('Processing your query...');
    }
    setIsListening(false);
  };

  const processAudio = async (audioBlob) => {
    console.log('Processing audio');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.wav');
      console.log('request to transcribe');
      const transcriptionResponse = await fetch(
        'http://localhost:5000/api/v1/transcript/transcribe',
        { method: 'POST', body: formData }
      );

      const { text } = await transcriptionResponse.json();
      console.log('Transcription: ', text);
      console.log('asking query');
      const queryResponse = await fetch(
        `http://localhost:5000/api/v1/transcript/query/${jobId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userQuery: text }),
        }
      );

      const queryResult = await queryResponse.json();
      console.log('queryresult: ', queryResult);
      setQueryResponse(queryResult.answer);
      setFeedback('Query answered successfully');
      speakText(queryResult.answer);
    } catch (error) {
      setFeedback('Error processing query: ' + error.message);
    }
  };

  const speakText = (text) => {
    console.log('Speaking text:', text);
    setFeedback('Speaking response...');
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setFeedback('Finished speaking');
    utterance.onerror = (error) =>
      setFeedback('Error speaking: ' + error.message);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="query-handler flex flex-col items-center bg-gray-100 p-6 min-h-screen">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Ask Your Queries
      </h2>
      <div className="feedback-message text-lg font-medium text-blue-600 mb-4">
        {feedback}
      </div>
      <div className="controls flex justify-center gap-4 mt-4">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`px-4 py-2 font-semibold rounded-lg shadow focus:outline-none focus:ring-2 ${
            isListening
              ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-300'
              : 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-300'
          }`}
        >
          {isListening ? 'Stop Recording' : 'Start Recording'}
        </button>
        <button
          onClick={() => navigate(`/session/${jobId}`)}
          className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          Go to Voice Session
        </button>
      </div>
      {queryResponse && (
        <div className="query-response bg-white shadow-md rounded-lg p-4 mt-6">
          <h3 className="text-lg font-semibold mb-2">Response:</h3>
          <p>{queryResponse}</p>
        </div>
      )}
    </div>
  );
};

export default QueryHandler;
