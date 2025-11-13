// server.js (CommonJS)
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch'); // node-fetch v2
const path = require('path');
require('dotenv').config();

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://aiva-site.onrender.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parser middleware
app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (for production deployment)
app.use(express.static('public'));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    ok: true, 
    service: 'AiVA API Server',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: ['conversational_context', 'message_limits', 'error_handling']
  });
});

// Enhanced AI Query function with better error handling
async function queryHuggingFace(data) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000); // 45 second timeout

  try {
    const response = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json",
          "User-Agent": "AiVA-Chatbot/2.0"
        },
        method: "POST",
        body: JSON.stringify(data),
        signal: controller.signal
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HuggingFace API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    clearTimeout(timeout);
    console.error('HuggingFace API Error:', error);
    throw error;
  }
}

// Main AI query endpoint with conversational context
app.post('/api/query', async (req, res) => {
  try {
    // Check if HF_TOKEN is configured
    if (!process.env.HF_TOKEN) {
      console.error('HF_TOKEN not configured');
      return res.status(500).json({ 
        error: 'AI service not configured', 
        message: 'Server configuration error. Please contact support.',
        code: 'CONFIG_ERROR'
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
        message: 'Provide messages array or message string',
        code: 'INVALID_INPUT'
      });
    }

    // Enhanced system prompt for better conversational AI
    const systemPrompt = {
      role: "system",
      content: `You are AiVA (AI Virtual Assistant), a helpful, knowledgeable, and friendly AI assistant. 

Key behaviors:
- Maintain conversational context and remember previous messages in this conversation
- Provide detailed, accurate, and helpful responses
- Be engaging and personable while remaining professional
- Ask follow-up questions when appropriate to better assist the user
- Acknowledge previous parts of the conversation naturally
- Provide examples and explanations when helpful
- Be honest about your limitations
- Format responses clearly with proper structure when needed

You can assist with various tasks including answering questions, explaining concepts, helping with coding, creative writing, analysis, problem-solving, and general conversation. Always aim to be as helpful as possible while being truthful about your capabilities.`
    };

    // Limit conversation history to prevent token overflow while maintaining context
    const MAX_MESSAGES = 25; // Allow more messages for better context
    let processedMessages = [...messages];
    
    if (processedMessages.length > MAX_MESSAGES) {
      // Keep system message, first user message for context, and recent messages
      const systemMsg = processedMessages.find(msg => msg.role === 'system');
      const firstUserMsg = processedMessages.find(msg => msg.role === 'user');
      const recentMessages = processedMessages.slice(-MAX_MESSAGES + 2);
      
      processedMessages = [
        ...(systemMsg ? [systemMsg] : []),
        ...(firstUserMsg && !recentMessages.includes(firstUserMsg) ? [firstUserMsg] : []),
        ...recentMessages
      ];
    }

    // Ensure system prompt is at the beginning
    const hasSystemPrompt = processedMessages.some(msg => msg.role === 'system');
    if (!hasSystemPrompt) {
      processedMessages.unshift(systemPrompt);
    }

    // Prepare payload for HuggingFace API
    const payload = {
      model: body.model || 'openai/gpt-oss-120b:together',
      messages: processedMessages,
      max_tokens: Math.min(body.max_tokens || 2048, 4000),
      temperature: Math.min(Math.max(body.temperature || 0.7, 0.1), 1.0),
      top_p: Math.min(Math.max(body.top_p || 0.9, 0.1), 1.0),
      stream: false,
      // Add additional parameters for better responses
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    };

    console.log(`AI Query - Model: ${payload.model}, Messages: ${processedMessages.length}, User: ${req.ip}`);

    // Query HuggingFace API with retry logic
    let hfResponse;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        hfResponse = await queryHuggingFace(payload);
        break; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        console.warn(`AI API attempt ${retryCount} failed:`, error.message);
        
        if (retryCount > maxRetries) {
          throw error; // Re-throw after max retries
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }

    // Extract reply text from response with better parsing
    let replyText = '';
    
    try {
      // Handle different response formats from various models
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
      } else if (typeof hfResponse === 'string') {
        replyText = hfResponse;
      }

      // Fallback if no text extracted
      if (!replyText || replyText.trim().length === 0) {
        console.warn('No reply text found in response:', JSON.stringify(hfResponse, null, 2));
        replyText = 'I apologize, but I encountered an issue generating a response. Please try rephrasing your question or try again in a moment.';
      }

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      replyText = 'I encountered an error while processing your request. Please try again or rephrase your question.';
    }

    // Clean up and validate reply text
    replyText = replyText.trim();
    
    // Remove any leaked system prompts or unwanted prefixes
    const unwantedPrefixes = [
      'You are AiVA',
      'As AiVA',
      'AI Virtual Assistant:',
      'Assistant:',
      'System:'
    ];
    
    for (const prefix of unwantedPrefixes) {
      if (replyText.toLowerCase().startsWith(prefix.toLowerCase())) {
        replyText = replyText.substring(prefix.length).trim();
        if (replyText.startsWith(':')) {
          replyText = replyText.substring(1).trim();
        }
      }
    }

    // Ensure minimum response quality
    if (replyText.length < 10) {
      replyText = 'I received your message but need more context to provide a helpful response. Could you please provide more details or rephrase your question?';
    }

    console.log(`AI Response generated successfully - Length: ${replyText.length} chars, Retries: ${retryCount}`);

    return res.json({ 
      success: true,
      result: hfResponse, 
      replyText: replyText,
      model: payload.model,
      usage: {
        messages_processed: processedMessages.length,
        retries: retryCount,
        response_length: replyText.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in /api/query:', error.stack || error);
    
    // Determine error type and send appropriate response
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    let errorCode = 'SERVER_ERROR';
    
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      statusCode = 408;
      errorMessage = 'Request timeout - the AI service is taking too long to respond';
      errorCode = 'TIMEOUT_ERROR';
    } else if (error.message.includes('fetch') || error.message.includes('ENOTFOUND')) {
      statusCode = 503;
      errorMessage = 'AI service temporarily unavailable';
      errorCode = 'SERVICE_UNAVAILABLE';
    } else if (error.message.includes('API error')) {
      statusCode = 502;
      errorMessage = 'AI service error - please try again';
      errorCode = 'API_ERROR';
    } else if (error.message.includes('rate limit') || error.message.includes('429')) {
      statusCode = 429;
      errorMessage = 'Service is busy - please wait a moment and try again';
      errorCode = 'RATE_LIMIT';
    }

    return res.status(statusCode).json({ 
      error: errorMessage,
      message: 'Please try again in a moment. If the problem persists, please contact support.',
      code: errorCode,
      timestamp: new Date().toISOString(),
      retryAfter: statusCode === 429 ? 30 : 5
    });
  }
});

// Get available models endpoint
app.get('/api/models', (req, res) => {
  const models = [
    {
      id: 'openai/gpt-oss-120b:together',
      name: 'GPT OSS 120B',
      provider: 'OpenAI Compatible',
      description: 'Large language model optimized for conversation',
      recommended: true
    },
    {
      id: 'openai/gpt-4o-mini',
      name: 'GPT-4O Mini',
      provider: 'OpenAI Compatible',
      description: 'Fast and efficient model for quick responses'
    },
    {
      id: 'mistralai/Mistral-7B-Instruct-v0.1',
      name: 'Mistral 7B Instruct',
      provider: 'Mistral AI',
      description: 'Efficient instruction-following model'
    }
  ];

  res.json({
    success: true,
    models: models,
    default: 'openai/gpt-oss-120b:together',
    total: models.length
  });
});

// Server status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    service: 'AiVA API',
    version: '2.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    hf_configured: !!process.env.HF_TOKEN,
    features: {
      conversational_context: true,
      message_limits: true,
      error_handling: true,
      retry_logic: true,
      model_selection: true
    }
  });
});

// Rate limiting info endpoint
app.get('/api/limits', (req, res) => {
  res.json({
    message_limit_per_chat: 12,
    timeout_seconds: 45,
    max_retries: 2,
    supported_models: 3,
    max_conversation_length: 25
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong on our end',
    code: 'UNHANDLED_ERROR',
    timestamp: new Date().toISOString()
  });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'API endpoint not found',
    path: req.originalUrl,
    available_endpoints: ['/api/query', '/api/models', '/api/status', '/api/limits']
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
  console.log(`🧠 AI Models: GPT OSS, GPT-4O Mini, Mistral`);
  console.log(`💬 Features: Conversational Context, Message Limits, Error Handling`);
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
