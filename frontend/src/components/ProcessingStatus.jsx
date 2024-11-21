import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ProcessingStatus = () => {
  const [status, setStatus] = useState(null);
  const { jobId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/v1/process/${jobId}`
        );
        const data = await response.json();
        setStatus(data.status);

        if (data.status === 'completed') {
          navigate(`/session/${jobId}`);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [jobId, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Processing Status
      </h2>
      <p className="text-lg text-gray-600">
        Current status:{' '}
        <span className="font-semibold text-blue-600">{status}</span>
      </p>
    </div>
  );
};

export default ProcessingStatus;
