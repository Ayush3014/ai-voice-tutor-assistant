require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const connectDB = require('./config/database');
const processingRouter = require('./routes/processing');
const voiceRouter = require('./routes/voiceRoutes');
const transcriptionRouter = require('./routes/transcriptionRouter');

const app = express();

connectDB();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
// const ensureUploadsDirectory = async () => {
//   try {
//     await fs.mkdir('uploads', { recursive: true });
//     console.log('Uploads directory ready');
//   } catch (error) {
//     console.error('Error creating uploads directory:', error);
//     process.exit(1);
//   }
// };

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes',
  },
});
// app.use('/api/', limiter);

// Routes
// app.use('/api', transcriptionRouter);
// app.use('/api', summarizationRouter);
app.use('/api/v1/voice', voiceRouter);
app.use('/api/v1/', processingRouter);
app.use('/api/v1/transcript', transcriptionRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// URL validation middleware
const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

app.use((req, res, next) => {
  if (req.body.videoUrl && !validateUrl(req.body.videoUrl)) {
    return res.status(400).json({ error: 'Invalid video URL format' });
  }
  next();
});

// Basic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // await ensureUploadsDirectory();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};
startServer();
