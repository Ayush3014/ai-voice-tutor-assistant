import React from 'react';
import { useLocation, useParams } from 'react-router-dom';

const EvaluationResultsPage = () => {
  const { jobId } = useParams();
  const location = useLocation();
  const evaluations = location.state?.evaluations;

  if (!evaluations) {
    return <p>No evaluation results found for jobId: {jobId}</p>;
  }

  return (
    <div className="evaluation-results-page bg-gray-100 p-4 rounded shadow-md">
      <h2 className="text-xl font-semibold mb-4">
        Evaluation Results for Job ID: {jobId}
      </h2>
      {evaluations.map((evaluation, index) => (
        <div
          key={index}
          className="evaluation-item bg-white p-4 mb-4 rounded border border-gray-300"
        >
          <p className="text-gray-800 font-medium mb-2">
            <strong>User Answer:</strong> {evaluation.userAnswer}
          </p>
          <p className="text-gray-800 font-medium mb-2">
            <strong>Feedback:</strong> {evaluation.feedback}
          </p>
          <p className="text-gray-700 mb-2">
            <strong>Correct Answer:</strong> {evaluation.correctAnswer}
          </p>
          <p className="text-gray-700 mb-2">
            <strong>Confidence Score:</strong> {evaluation.confidenceScore}
          </p>
          <p
            className={`font-semibold ${
              evaluation.isCorrect ? 'text-green-600' : 'text-red-600'
            }`}
          >
            <strong>Result:</strong>{' '}
            {evaluation.isCorrect ? 'Correct' : 'Incorrect'}
          </p>
        </div>
      ))}
    </div>
  );
};

export default EvaluationResultsPage;
