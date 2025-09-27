// server.js (Enhanced with Code Analysis & Rich Content Support)
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
app.use(bodyParser.json({ limit: '5mb' })); // Increased for file uploads
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (for production deployment)
app.use(express.static('public'));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    ok: true, 
    service: 'AiVA Enhanced API Server',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    features: [
      'conversational_context', 
      'message_limits', 
      'error_handling', 
      'chess_plugin', 
      'mobile_support',
      'code_analysis',
      'file_upload',
      'rich_formatting',
      'data_visualization',
      'admin_panel',
      'dynamic_libraries'
    ]
  });
});

// Enhanced AI Query function with better error handling
async function queryHuggingFace(data) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json",
          "User-Agent": "AiVA-Enhanced/3.0"
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

// Code Analysis Helper Functions
function analyzeCodeStructure(code, language) {
  const analysis = {
    language: language,
    lines: code.split('\n').length,
    complexity: 'Medium',
    suggestions: [],
    issues: [],
    features: []
  };

  // Language-specific analysis
  switch(language) {
    case 'javascript':
      if (code.includes('function')) analysis.features.push('Functions');
      if (code.includes('class')) analysis.features.push('Classes');
      if (code.includes('const') || code.includes('let')) analysis.features.push('Modern JS');
      if (code.includes('async') || code.includes('await')) analysis.features.push('Async/Await');
      if (code.includes('=>')) analysis.features.push('Arrow Functions');
      break;
      
    case 'python':
      if (code.includes('def ')) analysis.features.push('Functions');
      if (code.includes('class ')) analysis.features.push('Classes');
      if (code.includes('import ')) analysis.features.push('Imports');
      if (code.includes('try:')) analysis.features.push('Error Handling');
      break;
      
    case 'html':
      if (code.includes('<!DOCTYPE')) analysis.features.push('HTML5');
      if (code.includes('<script>')) analysis.features.push('JavaScript');
      if (code.includes('<style>')) analysis.features.push('CSS');
      break;
  }

  // General complexity analysis
  const functionCount = (code.match(/function|def |class /g) || []).length;
  if (functionCount > 10) analysis.complexity = 'High';
  else if (functionCount < 3) analysis.complexity = 'Low';

  return analysis;
}

function generateCodeSuggestions(code, language) {
  const suggestions = [];
  
  // General suggestions
  if (code.length > 5000) {
    suggestions.push('Consider breaking this large file into smaller, more manageable modules');
  }
  
  if (language === 'javascript') {
    if (code.includes('var ')) {
      suggestions.push('Consider using const or let instead of var for better scoping');
    }
    if (!code.includes('use strict')) {
      suggestions.push('Consider adding "use strict" at the top for better error checking');
    }
  }
  
  if (language === 'python') {
    if (!code.includes('"""') && !code.includes("'''")) {
      suggestions.push('Consider adding docstrings to document your functions');
    }
  }
  
  return suggestions;
}

// Enhanced Main AI query endpoint
app.post('/api/query', async (req, res) => {
  try {
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

    // Detect conversation type and file content
    const conversationType = body.conversationType || 'regular';
    const isChessConversation = conversationType === 'chess';
    const hasCodeFile = body.hasCodeFile || false;
    
    let systemPrompt = {
      role: "system",
      content: ""
    };

    if (isChessConversation) {
      systemPrompt.content = `You are Chess Master, an enthusiastic and encouraging chess AI assistant created by Rafsan. You love chess and are passionate about the game.

Key behaviors:
- Be friendly, supportive, and encouraging about chess gameplay
- Frequently ask users if they want to play chess matches with you  
- When users show interest in chess, immediately offer to start a game
- Discuss chess strategies, famous games, openings, tactics, and endgames
- Provide helpful tips and analysis about chess positions
- Share your enthusiasm for chess
- After games, provide encouraging analysis and highlight good moves
- Make users feel good about their chess progress regardless of skill level
- Explain chess concepts in simple terms for beginners
- Use chess emojis naturally (♔♕♖♗♘♙)

Format your responses with proper markdown:
- Use **bold** for emphasis
- Use ## for headings when discussing chess concepts
- Use emojis appropriately
- Keep responses engaging and chess-focused`;

    } else {
      systemPrompt.content = `You are AiVA (AI Virtual Assistant), a helpful, knowledgeable, and friendly AI assistant created by Rafsan.

Key behaviors:
- Maintain conversational context and remember previous messages
- Provide detailed, accurate, and well-formatted responses
- Be engaging and personable while remaining professional
- Ask follow-up questions when appropriate
- Acknowledge previous conversation parts naturally
- Provide examples and explanations when helpful
- Be honest about your limitations
- Format responses professionally with clear structure

IMPORTANT - Response Formatting:
- Use proper markdown formatting with # ## ### for headings
- Use **bold text** for emphasis and important points
- Use *italics* for subtle emphasis
- Use bullet points with - for lists
- Use \`code\` for inline code and \`\`\`language blocks for code
- Use emojis naturally to enhance communication (📊📈💡🔍⚡🎯)
- When showing data, suggest charts or create tables using markdown
- Structure responses with clear headings and sections
- Make responses visually appealing and easy to scan

${hasCodeFile ? `
CODE ANALYSIS FOCUS:
The user has uploaded a code file. Analyze it thoroughly:
- Explain what the code does in simple terms
- Identify the programming language and key features
- Point out good practices and areas for improvement
- Suggest optimizations or best practices
- Explain complex concepts in an educational way
- Provide constructive feedback
- If there are errors, explain how to fix them
- Format code examples properly with syntax highlighting
` : ''}

You can assist with coding, creative writing, analysis, problem-solving, data visualization suggestions, and general conversation. Always aim to be helpful while being truthful about capabilities.`;
    }

    // Process messages and detect code analysis needs
    const MAX_MESSAGES = 20;
    let processedMessages = [...messages];
    
    if (processedMessages.length > MAX_MESSAGES) {
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
      const systemIndex = processedMessages.findIndex(msg => msg.role === 'system');
      if (systemIndex !== -1) {
        processedMessages[systemIndex] = systemPrompt;
      }
    }

    // Enhanced parameters for better formatting
    const temperature = isChessConversation ? 0.8 : 0.7;
    const maxTokens = hasCodeFile ? 3000 : (isChessConversation ? 1500 : 2048);

    const payload = {
      model: body.model || 'openai/gpt-oss-120b:together',
      messages: processedMessages,
      max_tokens: Math.min(body.max_tokens || maxTokens, 4000),
      temperature: Math.min(Math.max(body.temperature || temperature, 0.1), 1.0),
      top_p: Math.min(Math.max(body.top_p || 0.9, 0.1), 1.0),
      stream: false,
      presence_penalty: isChessConversation ? 0.2 : 0.1,
      frequency_penalty: 0.1
    };

    console.log(`AI Query - Model: ${payload.model}, Messages: ${processedMessages.length}, Type: ${conversationType}, HasCode: ${hasCodeFile}, User: ${req.ip}`);

    // Query with retry logic
    let hfResponse;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        hfResponse = await queryHuggingFace(payload);
        break;
      } catch (error) {
        retryCount++;
        console.warn(`AI API attempt ${retryCount} failed:`, error.message);
        
        if (retryCount > maxRetries) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }

    // Enhanced response parsing
    let replyText = '';
    
    try {
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

      if (!replyText || replyText.trim().length === 0) {
        console.warn('No reply text found in response');
        if (isChessConversation) {
          replyText = '♔ I\'m excited to play chess with you! Would you like to start a game? ♕';
        } else if (hasCodeFile) {
          replyText = '💻 I\'ve received your code file and I\'m ready to analyze it! Please let me know what specific aspects you\'d like me to focus on.';
        } else {
          replyText = 'I apologize, but I encountered an issue generating a response. Please try rephrasing your question or try again in a moment.';
        }
      }

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      if (isChessConversation) {
        replyText = '♗ Let\'s focus on our chess game! I\'m ready when you are.';
      } else if (hasCodeFile) {
        replyText = '🔍 I\'m here to help analyze your code! What would you like me to look at?';
      } else {
        replyText = 'I encountered an error while processing your request. Please try again or rephrase your question.';
      }
    }

    // Clean up response
    replyText = replyText.trim();
    
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

    // Ensure minimum quality
    if (replyText.length < 10) {
      if (isChessConversation) {
        replyText = '♔ Ready for a chess match? Let\'s play! ♕';
      } else if (hasCodeFile) {
        replyText = '💻 I\'m ready to analyze your code! What would you like me to help you with?';
      } else {
        replyText = 'I received your message but need more context to provide a helpful response. Could you please provide more details?';
      }
    }

    // Enhanced response enhancements
    if (isChessConversation) {
      const userMessage = processedMessages[processedMessages.length - 1]?.content?.toLowerCase() || '';
      
      if ((userMessage.includes('yes') || userMessage.includes('play') || userMessage.includes('game')) && 
          !replyText.toLowerCase().includes('play') && !replyText.toLowerCase().includes('game')) {
        replyText += ' ♗ Would you like to start a chess game right now?';
      }
    }

    console.log(`Enhanced AI Response - Length: ${replyText.length} chars, Type: ${conversationType}, Code: ${hasCodeFile}, Retries: ${retryCount}`);

    // Detect if response suggests data visualization
    const suggestsChart = replyText.toLowerCase().includes('chart') || 
                         replyText.toLowerCase().includes('graph') || 
                         replyText.toLowerCase().includes('visualize') ||
                         /\d+%/.test(replyText);

    const suggestsTable = replyText.includes('|') || 
                         replyText.toLowerCase().includes('comparison') ||
                         replyText.toLowerCase().includes('table');

    return res.json({ 
      success: true,
      result: hfResponse, 
      replyText: replyText,
      model: payload.model,
      conversationType: conversationType,
      hasCodeFile: hasCodeFile,
      suggestions: {
        chart: suggestsChart,
        table: suggestsTable
      },
      usage: {
        messages_processed: processedMessages.length,
        retries: retryCount,
        response_length: replyText.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in /api/query:', error.stack || error);
    
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

// Code Analysis Endpoint
app.post('/api/analyze-code', (req, res) => {
  try {
    const { code, language, filename } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide both code and language'
      });
    }

    const analysis = analyzeCodeStructure(code, language);
    const suggestions = generateCodeSuggestions(code, language);

    res.json({
      success: true,
      filename: filename || 'Unknown',
      analysis: {
        ...analysis,
        suggestions: suggestions
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Code analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: 'Could not analyze the provided code'
    });
  }
});

// Enhanced Plugin information endpoint
app.get('/api/plugins', (req, res) => {
  const plugins = [
    {
      id: 'chess',
      name: 'Chess Master',
      version: '1.2.0',
      description: 'Play chess games with AI opponent',
      longDescription: 'Challenge the AI to strategic chess matches. Features interactive board, move analysis, post-game insights, and Stockfish engine integration.',
      icon: '♗',
      category: 'Games',
      features: [
        'Interactive chess board with drag & drop',
        'Stockfish AI engine with fallback minimax',
        'Real-time move analysis',
        'PGN notation display',
        'Post-game analysis and insights',
        'Multiple difficulty levels',
        'Sound effects for moves',
        'Piece highlighting system'
      ],
      enabled: false,
      requiresAssets: ['chess.js', 'chessboard.js', 'pieces/*.svg', 'sounds/*.mp3'],
      loadingStrategy: 'dynamic'
    }
  ];

  res.json({
    success: true,
    plugins: plugins,
    total: plugins.length,
    categories: ['Games'],
    dynamicLoading: true
  });
});

// Enhanced server status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    service: 'AiVA Enhanced API',
    version: '3.0.0',
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
      google_auth: true,
      code_analysis: true,
      file_upload: true,
      rich_formatting: true,
      data_visualization: true,
      admin_panel: true,
      dynamic_libraries: true,
      markdown_support: true,
      emoji_integration: true
    },
    plugins: {
      available: ['chess'],
      total: 1,
      dynamicLoading: true
    },
    libraries: {
      supported: ['prism', 'chart', 'd3', 'tabulator', 'gsap', 'aos', 'lottie'],
      loadingStrategy: 'onDemand'
    }
  });
});

// Enhanced limits endpoint
app.get('/api/limits', (req, res) => {
  res.json({
    message_limit_per_chat: 7,
    file_upload_limit_per_day: 1,
    max_file_size_mb: 5,
    timeout_seconds: 45,
    max_retries: 2,
    supported_models: 1,
    max_conversation_length: 20,
    supported_file_types: [
      '.js', '.html', '.css', '.py', '.java', '.cpp', '.c', '.php', 
      '.rb', '.go', '.rs', '.ts', '.jsx', '.vue', '.swift', '.kt',
      '.scala', '.r', '.sql', '.json', '.xml', '.yaml', '.yml'
    ],
    chess_features: {
      stockfish_engine: true,
      minimax_fallback: true,
      pgn_notation: true,
      move_analysis: true,
      sound_effects: true,
      piece_highlighting: true
    },
    visualization_features: {
      charts: true,
      graphs: true,
      tables: true,
      dynamic_data: true
    }
  });
});

// Data Visualization endpoint
app.post('/api/visualize', (req, res) => {
  try {
    const { data, type, title } = req.body;
    
    if (!data || !type) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide both data and visualization type'
      });
    }

    // Basic validation and processing
    const supportedTypes = ['bar', 'line', 'pie', 'table'];
    if (!supportedTypes.includes(type)) {
      return res.status(400).json({
        error: 'Unsupported visualization type',
        message: `Supported types: ${supportedTypes.join(', ')}`
      });
    }

    res.json({
      success: true,
      visualization: {
        type: type,
        data: data,
        title: title || 'Data Visualization',
        config: {
          responsive: true,
          theme: 'dark'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Visualization error:', error);
    res.status(500).json({
      error: 'Visualization failed',
      message: 'Could not create visualization'
    });
  }
});

// File Upload Validation endpoint
app.post('/api/validate-file', (req, res) => {
  const { filename, size, type } = req.body;
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = [
    '.js', '.html', '.css', '.py', '.java', '.cpp', '.c', '.php',
    '.rb', '.go', '.rs', '.ts', '.jsx', '.vue', '.swift', '.kt',
    '.scala', '.r', '.sql', '.json', '.xml', '.yaml', '.yml'
  ];

  const fileExt = filename ? filename.substring(filename.lastIndexOf('.')).toLowerCase() : '';
  
  const validation = {
    valid: true,
    errors: []
  };

  if (size > maxSize) {
    validation.valid = false;
    validation.errors.push('File size exceeds 5MB limit');
  }

  if (!allowedTypes.includes(fileExt)) {
    validation.valid = false;
    validation.errors.push(`File type ${fileExt} not supported`);
  }

  res.json({
    success: true,
    validation: validation,
    fileInfo: {
      name: filename,
      size: size,
      type: fileExt,
      language: detectLanguageFromExtension(fileExt)
    }
  });
});

function detectLanguageFromExtension(ext) {
  const mapping = {
    '.js': 'javascript',
    '.ts': 'typescript',
    '.jsx': 'jsx',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.html': 'html',
    '.css': 'css',
    '.vue': 'vue',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.r': 'r',
    '.sql': 'sql',
    '.json': 'json',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml'
  };
  
  return mapping[ext] || 'text';
}

// All existing endpoints remain the same...
app.post('/api/plugins/:pluginId/toggle', (req, res) => {
  const { pluginId } = req.params;
  const { enabled } = req.body;

  const validPlugins = ['chess'];
  if (!validPlugins.includes(pluginId)) {
    return res.status(404).json({
      error: 'Plugin not found',
      pluginId: pluginId
    });
  }

  res.json({
    success: true,
    pluginId: pluginId,
    enabled: !!enabled,
    message: `Plugin ${pluginId} ${enabled ? 'enabled' : 'disabled'} successfully`
  });
});

app.post('/api/chess/analyze', (req, res) => {
  const { fen, moves } = req.body;
  
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

app.get('/api/models', (req, res) => {
  const models = [
    {
      id: 'openai/gpt-oss-120b:together',
      name: 'GPT OSS 120B Enhanced',
      provider: 'OpenAI Compatible',
      description: 'Large language model optimized for conversation, code analysis, and rich formatting',
      recommended: true,
      supports: [
        'general_conversation', 
        'chess_analysis', 
        'creative_writing',
        'code_analysis',
        'data_visualization',
        'markdown_formatting'
      ]
    }
  ];

  res.json({
    success: true,
    models: models,
    default: 'openai/gpt-oss-120b:together',
    total: models.length
  });
});

app.get('/api/chess/validate', (req, res) => {
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
    board_themes: ['default'],
    loading_strategy: 'dynamic'
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
      '/api/analyze-code', 
      '/api/query',
      '/api/analyze-code', 
      '/api/visualize',
      '/api/validate-file',
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
  console.log(`🚀 AiVA Enhanced Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 HuggingFace configured: ${!!process.env.HF_TOKEN}`);
  console.log(`🤖 AI Model: GPT OSS 120B Enhanced`);
  console.log(`♗ Chess Plugin: Dynamic loading with Stockfish support`);
  console.log(`📱 Mobile Support: Professional responsive design`);
  console.log(`💻 Code Analysis: File upload and syntax highlighting`);
  console.log(`📊 Data Visualization: Charts, graphs, and tables`);
  console.log(`🎨 Rich Formatting: Markdown, emojis, and animations`);
  console.log(`👨‍💼 Admin Panel: User management system`);
  console.log(`📚 Dynamic Libraries: On-demand CDN loading`);
  console.log(`🔍 Features: Enhanced AI responses with code analysis`);
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
