// server.js (CommonJS)
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch'); // node-fetch v2
require('dotenv').config();

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://https://aiva-site.onrender.com/'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parser middleware
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (for production deployment)
app.use(express.static('public'));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    ok: true, 
    service: 'AiVA API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// AI Query function using Hugging Face API
async function queryHuggingFace(data) {
  try {
    const response = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json",
          "User-Agent": "AiVA-Chatbot/1.0"
        },
        method: "POST",
        body: JSON.stringify(data),
        timeout: 30000 // 30 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('HuggingFace API Error:', error);
    throw error;
  }
}

// Main AI query endpoint
app.post('/api/query', async (req, res) => {
  try {
    // Check if HF_TOKEN is configured
    if (!process.env.HF_TOKEN) {
      console.error('HF_TOKEN not configured');
      return res.status(500).json({ 
        error: 'AI service not configured', 
        message: 'Server configuration error' 
      });
    }

    const body = req.body || {};
    let messages = [];

    // Parse messages from request
    if (Array.isArray(body.messages) && body.messages.length) {
      messages = body.messages;
    } else if (body.message && typeof body.message === 'string') {
      messages = [{ role: 'user', content: body.message }];
    } else {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Provide messages array or message string' 
      });
    }

    // Limit conversation history to prevent token overflow
    const MAX_MESSAGES = 20;
    if (messages.length > MAX_MESSAGES) {
      messages = [
        messages[0], // Keep system message if exists
        ...messages.slice(-MAX_MESSAGES + 1) // Keep recent messages
      ];
    }

    // Add system prompt for AiVA personality
    const systemPrompt = {
      role: "system",
      content: `You are AiVA (AI Virtual Assistant), a helpful, knowledgeable, and friendly AI assistant. You provide clear, accurate, and helpful responses. You can assist with various tasks including answering questions, explaining concepts, helping with coding, creative writing, analysis, and general conversation. Always be respectful, professional, and aim to be as helpful as possible while being truthful about your capabilities and limitations.`
    };

    // Prepare payload for HuggingFace API
    const payload = {
      model: body.model || 'openai/gpt-oss-120b:together',
      messages: [systemPrompt, ...messages],
      max_tokens: body.max_tokens || 2048,
      temperature: body.temperature || 0.7,
      top_p: body.top_p || 0.9,
      stream: false
    };

    console.log(`AI Query - Model: ${payload.model}, Messages: ${messages.length}`);

    // Query HuggingFace API
    const hfResponse = await queryHuggingFace(payload);

    // Extract reply text from response
    let replyText = '';
    
    try {
      // Handle different response formats
      if (hfResponse.choices && hfResponse.choices[0]) {
        const choice = hfResponse.choices[0];
        
        if (choice.message && choice.message.content) {
          replyText = choice.message.content;
        } else if (choice.text) {
          replyText = choice.text;
        }
      } else if (hfResponse.output && Array.isArray(hfResponse.output) && hfResponse.output[0]) {
        replyText = hfResponse.output[0].content || hfResponse.output[0].text || '';
      } else if (hfResponse.generated_text) {
        replyText = hfResponse.generated_text;
      }

      // Fallback if no text extracted
      if (!replyText) {
        console.warn('No reply text found in response:', JSON.stringify(hfResponse, null, 2));
        replyText = 'I apologize, but I encountered an issue generating a response. Please try again.';
      }

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      replyText = 'I encountered an error while processing your request. Please try again.';
    }

    // Clean up reply text
    replyText = replyText.trim();
    
    // Remove any system prompts that might have leaked through
    if (replyText.toLowerCase().includes('you are aiva') || 
        replyText.toLowerCase().includes('ai virtual assistant')) {
      const lines = replyText.split('\n');
      replyText = lines.filter(line => 
        !line.toLowerCase().includes('you are aiva') && 
        !line.toLowerCase().includes('ai virtual assistant')
      ).join('\n').trim();
    }

    console.log(`AI Response generated successfully - Length: ${replyText.length} chars`);

    return res.json({ 
      success: true,
      result: hfResponse, 
      replyText: replyText,
      model: payload.model,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in /api/query:', error.stack || error);
    
    // Determine error type and send appropriate response
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error.message.includes('fetch')) {
      statusCode = 503;
      errorMessage = 'AI service temporarily unavailable';
    } else if (error.message.includes('timeout')) {
      statusCode = 408;
      errorMessage = 'Request timeout - please try again';
    } else if (error.message.includes('API error')) {
      statusCode = 502;
      errorMessage = 'AI service error';
    }

    return res.status(statusCode).json({ 
      error: errorMessage,
      message: 'Please try again in a moment',
      timestamp: new Date().toISOString()
    });
  }
});

// Get available models endpoint
app.get('/api/models', (req, res) => {
  const models = [
    {
      id: 'openai/gpt-oss-120b:together',
      name: 'GPT OSS 120B',
      provider: 'OpenAI',
      description: 'Large language model optimized for conversation'
    },
    {
      id: 'meta-llama/Llama-2-70b-chat-hf',
      name: 'Llama 2 70B Chat',
      provider: 'Meta',
      description: 'Meta\'s large language model for chat applications'
    },
    {
      id: 'mistralai/Mistral-7B-Instruct-v0.1',
      name: 'Mistral 7B Instruct',
      provider: 'Mistral AI',
      description: 'Efficient instruction-following model'
    },
    {
      id: 'microsoft/DialoGPT-large',
      name: 'DialoGPT Large',
      provider: 'Microsoft',
      description: 'Conversational AI model'
    }
  ];

  res.json({
    success: true,
    models: models,
    default: 'openai/gpt-oss-120b:together'
  });
});

// Server status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    service: 'AiVA API',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    hf_configured: !!process.env.HF_TOKEN
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong on our end',
    timestamp: new Date().toISOString()
  });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// For production - serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 AiVA Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 HuggingFace configured: ${!!process.env.HF_TOKEN}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;
