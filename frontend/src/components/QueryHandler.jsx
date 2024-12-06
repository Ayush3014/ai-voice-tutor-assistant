import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Room } from 'livekit-client';

const QueryHandler = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState('');
  const [queryResponse, setQueryResponse] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [recognition, setRecognition] = useState(null);
  const [currentTranscript, setCurrentTranscript] = useState('');

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const speechRecognition = new SpeechRecognition();
      speechRecognition.continuous = true;
      speechRecognition.interimResults = true;
      speechRecognition.lang = 'en-US';

      setRecognition(speechRecognition);
    } else {
      setFeedback('Speech recognition not supported in this browser.');
    }

    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [room]);

  const startLiveSession = async () => {
    try {
      console.log('starting live session');
      setFeedback('Connecting to LiveKit...');
      const response = await fetch(
        `http://localhost:5000/api/v1/voice/session/${jobId}`,
        { method: 'POST' }
      );
      const { token } = await response.json();

      const newRoom = new Room();
      await newRoom.connect(import.meta.env.VITE_LIVEKIT_HOST, token);
      console.log('after connect');
      setRoom(newRoom);
      setIsConnected(true);
      setFeedback('Connected to LiveKit. Start speaking.');

      if (recognition) {
        recognition.onresult = async (event) => {
          const isFinal = event.results[event.results.length - 1].isFinal;
          if (isFinal) {
            const transcript =
              event.results[event.results.length - 1][0].transcript;
            console.log('Recognized speech:', transcript);
            setFeedback('Transcribing...');
            setCurrentTranscript(transcript.trim()); // Set current transcript
            recognition.abort(); // reset recognition results
            // Process transcript with the backend
            await processQuery(transcript.trim());
          } else {
            console.log(
              'Interim Recognized speech:',
              event.results[event.results.length - 1][0].transcript
            );
          }
        };

        recognition.onerror = (event) => {
          if (event.error === 'network') {
            setFeedback('Network error occurred. Retrying...');
            setTimeout(() => {
              recognition.start();
            }, 3000); // Retry after 3 seconds
          } else {
            setFeedback('Speech recognition error: ' + event.error);
          }
        };

        recognition.start();

        recognition.onend = () => {
          console.log('Speech recognition ended.');

          // Restart recognition unless explicitly disconnected
          if (isConnected) {
            setFeedback('Listening...');
            recognition.start();
          }
        };
      }
    } catch (error) {
      console.error('Error connecting to LiveKit:', error);
      setFeedback('Error connecting to LiveKit: ' + error.message);
    }
  };

  const stopLiveSession = () => {
    if (room) {
      room.disconnect();
      setRoom(null);
    }
    if (recognition) {
      recognition.abort(); // Abort any ongoing recognition
      setRecognition(null); // Reset recognition object
    }
    setIsConnected(false);
    setFeedback('Disconnected from LiveKit.');
  };

  let debounceTimeout;

  const processQuery = async (transcript) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async () => {
      try {
        setFeedback('Processing your query...');
        const response = await fetch(
          `http://localhost:5000/api/v1/transcript/query/${jobId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userQuery: transcript }),
          }
        );

        const result = await response.json();
        console.log('Query result:', result);
        setQueryResponse(result.answer);
        setFeedback('Query answered successfully!');
        speakText(result.answer);

        // Restart recognition after processing
        if (recognition) {
          recognition.stop(); // Stop recognition
          recognition.start(); // Restart recognition
        }
      } catch (error) {
        console.error('Error processing query:', error);
        setFeedback('Failed to process query: ' + error.message);
      }
    }, 500);
  };

  const speakText = (text) => {
    console.log('Speaking text:', text);
    setFeedback('Speaking response...');
    window.speechSynthesis.cancel(); // Stop ongoing speech synthesis
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setFeedback('Finished speaking.');
    utterance.onerror = (error) =>
      setFeedback('Error speaking: ' + error.message);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="query-handler flex flex-col items-center bg-gray-100 p-6 min-h-screen">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Live Query Session
      </h2>
      <div className="feedback-message text-lg font-medium text-blue-600 mb-4">
        {feedback}
      </div>
      <div className="controls flex justify-center gap-4 mt-4">
        {!isConnected ? (
          <button
            onClick={startLiveSession}
            className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300"
          >
            Start Live Session
          </button>
        ) : (
          <button
            onClick={stopLiveSession}
            className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            Stop Live Session
          </button>
        )}
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
