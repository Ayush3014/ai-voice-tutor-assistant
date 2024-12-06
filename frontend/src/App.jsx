import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import VideoProcessor from './components/VideoProcessor';
import ProcessingStatus from './components/ProcessingStatus';
import VoiceSession from './components/VoiceSession';
import EvaluationResults from './components/EvaluationResults';
import QueryHandler from './components/QueryHandler';

const App = () => {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<VideoProcessor />} />
          <Route path="/status/:jobId" element={<ProcessingStatus />} />
          <Route path="/session/:jobId" element={<VoiceSession />} />
          <Route path="/evaluations/:jobId" element={<EvaluationResults />} />
          <Route path="/query/:jobId" element={<QueryHandler />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
