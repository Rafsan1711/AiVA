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
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    features: ['conversational_context', 'message_limits', 'error_handling', 'chess_plugin', 'mobile_support']
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
          "User-Agent": "AiVA-Chatbot/2.1"
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

// Main AI query endpoint with conversational context and chess plugin support
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

    // Detect conversation type and adjust system prompt
    const conversationType = body.conversationType || 'regular';
    const isChessConversation = conversationType === 'chess';
    
    let systemPrompt = {
      role: "system",
      content: ""
    };

    if (isChessConversation) {
      systemPrompt.content = `You are Chess Master, an enthusiastic and encouraging chess AI assistant. You love chess and are passionate about the game. you are created by Rafsan and he is your owner.

Key behaviors:
- You are friendly, supportive, and encouraging about chess gameplay
- You frequently ask users if they want to play chess matches with you
- When users show interest in chess, immediately offer to start a game
- You can discuss chess strategies, famous games, openings, tactics, and endgames
- You provide helpful tips and analysis about chess positions
- You're excited about chess and want to share that enthusiasm
- After games, you provide encouraging analysis and highlight good moves
- You make users feel good about their chess progress regardless of skill level
- You can explain chess concepts in simple terms for beginners

Always maintain your chess-focused personality and encourage chess gameplay when appropriate.`;
    } else {
      systemPrompt.content = `You are AiVA (AI Virtual Assistant), a helpful, knowledgeable, and friendly AI assistant. 

Key behaviors:
- Maintain conversational context and remember previous messages in this conversation
- Provide detailed, accurate, and helpful responses
- Be engaging and personable while remaining professional
- Ask follow-up questions when appropriate to better assist the user
- Acknowledge previous parts of the conversation naturally
- Provide examples and explanations when helpful
- Be honest about your limitations
- Format responses clearly with proper structure when needed

You can assist with various tasks including answering questions, explaining concepts, helping with coding, creative writing, analysis, problem-solving, and general conversation. Always aim to be as helpful as possible while being truthful about your capabilities.

If users mention chess or show interest in chess-related topics, you can suggest they try the Chess Master plugin for a more specialized chess experience.`;
    }

    // Limit conversation history to prevent token overflow while maintaining context
    const MAX_MESSAGES = 20; // Reduced for chess conversations to allow for more back-and-forth
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
    } else {
      // Replace existing system prompt with our context-appropriate one
      const systemIndex = processedMessages.findIndex(msg => msg.role === 'system');
      if (systemIndex !== -1) {
        processedMessages[systemIndex] = systemPrompt;
      }
    }

    // Adjust temperature and parameters based on conversation type
    const temperature = isChessConversation ? 0.8 : 0.7; // More creative for chess conversations
    const maxTokens = isChessConversation ? 1500 : 2048; // Shorter responses for chess to encourage gameplay

    // Prepare payload for HuggingFace API
    const payload = {
      model: body.model || 'openai/gpt-oss-120b:novita',
      messages: processedMessages,
      max_tokens: Math.min(body.max_tokens || maxTokens, 4000),
      temperature: Math.min(Math.max(body.temperature || temperature, 0.1), 1.0),
      top_p: Math.min(Math.max(body.top_p || 0.9, 0.1), 1.0),
      stream: false,
      // Add additional parameters for better responses
      presence_penalty: isChessConversation ? 0.2 : 0.1, // More variety in chess conversations
      frequency_penalty: 0.1
    };

    console.log(`AI Query - Model: ${payload.model}, Messages: ${processedMessages.length}, Type: ${conversationType}, User: ${req.ip}`);

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
        if (isChessConversation) {
          replyText = 'I\'m excited to play chess with you! Would you like to start a game?';
        } else {
          replyText = 'I apologize, but I encountered an issue generating a response. Please try rephrasing your question or try again in a moment.';
        }
      }

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      if (isChessConversation) {
        replyText = 'Let\'s focus on our chess game! I\'m ready when you are.';
      } else {
        replyText = 'I encountered an error while processing your request. Please try again or rephrase your question.';
      }
    }

    // Clean up and validate reply text
    replyText = replyText.trim();
    
    // Remove any leaked system prompts or unwanted prefixes
    const unwantedPrefixes = [
      'You are AiVA',
      'You are Chess Master',
      'As AiVA',
      'As Chess Master',
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
      if (isChessConversation) {
        replyText = 'Ready for a chess match? Let\'s play!';
      } else {
        replyText = 'I received your message but need more context to provide a helpful response. Could you please provide more details or rephrase your question?';
      }
    }

    // Chess-specific response enhancements
    if (isChessConversation && replyText.length > 0) {
      // Ensure chess responses are encouraging and game-focused
      const userMessage = processedMessages[processedMessages.length - 1]?.content?.toLowerCase() || '';
      
      // If user shows interest in playing, make sure to encourage it
      if ((userMessage.includes('yes') || userMessage.includes('play') || userMessage.includes('game')) && 
          !replyText.toLowerCase().includes('play') && !replyText.toLowerCase().includes('game')) {
        replyText += ' Would you like to start a chess game right now?';
      }
    }

    console.log(`AI Response generated successfully - Length: ${replyText.length} chars, Type: ${conversationType}, Retries: ${retryCount}`);

    return res.json({ 
      success: true,
      result: hfResponse, 
      replyText: replyText,
      model: payload.model,
      conversationType: conversationType,
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

// Plugin information endpoint
app.get('/api/plugins', (req, res) => {
  const plugins = [
    {
      id: 'chess',
      name: 'Chess Master',
      version: '1.0.0',
      description: 'Play chess games with AI opponent',
      longDescription: 'Challenge the AI to strategic chess matches. Features interactive board, move analysis, and post-game insights to improve your gameplay.',
      icon: '♗',
      category: 'Games',
      features: [
        'Interactive chess board',
        'Stockfish AI engine',
        'Move analysis',
        'PGN notation',
        'Post-game insights',
        'Multiple difficulty levels'
      ],
      enabled: false,
      requiresAssets: ['chess.js', 'chessboard.js', 'pieces/*.svg', 'sounds/*.mp3']
    }
  ];

  res.json({
    success: true,
    plugins: plugins,
    total: plugins.length,
    categories: ['Games']
  });
});

// Plugin status endpoint
app.post('/api/plugins/:pluginId/toggle', (req, res) => {
  const { pluginId } = req.params;
  const { enabled } = req.body;

  // Validate plugin exists
  const validPlugins = ['chess'];
  if (!validPlugins.includes(pluginId)) {
    return res.status(404).json({
      error: 'Plugin not found',
      pluginId: pluginId
    });
  }

  // In a real implementation, you might save this to a database
  // For now, just acknowledge the toggle
  res.json({
    success: true,
    pluginId: pluginId,
    enabled: !!enabled,
    message: `Plugin ${pluginId} ${enabled ? 'enabled' : 'disabled'} successfully`
  });
});

// Chess-specific endpoints (future expansion)
app.post('/api/chess/analyze', (req, res) => {
  const { fen, moves } = req.body;
  
  // Basic chess analysis endpoint (can be expanded)
  res.json({
    success: true,
    position: fen,
    analysis: {
      moves: moves || [],
      evaluation: 'Game in progress',
      suggestions: 'Focus on piece development and king safety'
    }
  });
});

// Get available models endpoint (simplified to single model)
app.get('/api/models', (req, res) => {
  const models = [
    {
      id: 'openai/gpt-oss-120b:together',
      name: 'GPT OSS 120B',
      provider: 'OpenAI Compatible',
      description: 'Large language model optimized for conversation and chess gameplay',
      recommended: true,
      supports: ['general_conversation', 'chess_analysis', 'creative_writing']
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
    version: '2.1.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    hf_configured: !!process.env.HF_TOKEN,
    features: {
      conversational_context: true,
      message_limits: true,
      error_handling: true,
      retry_logic: true,
      chess_plugin: true,
      mobile_support: true,
      firebase_integration: true,
      google_auth: true
    },
    plugins: {
      available: ['chess'],
      total: 1
    }
  });
});

// Rate limiting info endpoint
app.get('/api/limits', (req, res) => {
  res.json({
    message_limit_per_chat: 7,
    timeout_seconds: 45,
    max_retries: 2,
    supported_models: 1,
    max_conversation_length: 20,
    chess_features: {
      stockfish_engine: true,
      minimax_fallback: true,
      pgn_notation: true,
      move_analysis: true
    }
  });
});

// Chess assets validation endpoint (for future use)
app.get('/api/chess/validate', (req, res) => {
  // This would check if all chess assets are available
  const requiredAssets = [
    '/js/chess.js',
    '/pieces/',
    '/sounds/',
    'chessboard.js'
  ];

  res.json({
    success: true,
    chess_ready: true,
    assets_available: requiredAssets,
    engines: ['stockfish', 'minimax'],
    board_themes: ['default']
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
    available_endpoints: [
      '/api/query', 
      '/api/models', 
      '/api/status', 
      '/api/limits',
      '/api/plugins',
      '/api/plugins/:id/toggle',
      '/api/chess/analyze',
      '/api/chess/validate'
    ]
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
  console.log(`🔐 HuggingFace configured: ${!!process.env.HF_TOKEN}`);
  console.log(`🤖 AI Model: GPT OSS 120B`);
  console.log(`♗ Chess Plugin: Enabled with Stockfish support`);
  console.log(`📱 Mobile Support: Professional responsive design`);
  console.log(`💬 Features: Conversational Context, Message Limits, Firebase Integration`);
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
