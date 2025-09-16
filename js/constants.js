// Updated Application Constants with New Features

// Chess piece candidates for image resolution
const pieceCandidates = {
    'wK': ['pieces/wK.svg', 'pieces/wKing.svg', 'pieces/WK.svg'],
    'wQ': ['pieces/wQ.svg', 'pieces/wQueen.svg', 'pieces/WQ.svg'],
    'wR': ['pieces/wR.svg', 'pieces/wRook.svg', 'pieces/WR.svg'],
    'wB': ['pieces/wB.svg', 'pieces/wBishop.svg', 'pieces/WB.svg'],
    'wN': ['pieces/wN.svg', 'pieces/wKnight.svg', 'pieces/WN.svg', 'pieces/wn.svg'],
    'wP': ['pieces/wP.svg', 'pieces/wPawn.svg', 'pieces/WP.svg'],
    'bK': ['pieces/bK.svg', 'pieces/bKing.svg', 'pieces/BK.svg'],
    'bQ': ['pieces/bQ.svg', 'pieces/bQueen.svg', 'pieces/BQ.svg'],
    'bR': ['pieces/bR.svg', 'pieces/bRook.svg', 'pieces/BR.svg'],
    'bB': ['pieces/bB.svg', 'pieces/bBishop.svg', 'pieces/BB.svg'],
    'bN': ['pieces/bN.svg', 'pieces/bKnight.svg', 'pieces/BN.svg', 'pieces/bn.svg', 'pieces/black-knight.svg'],
    'bP': ['pieces/bP.svg', 'pieces/bPawn.svg', 'pieces/BP.svg']
};

// Chess evaluation weights
const weights = { 
    p: 100, 
    n: 280, 
    b: 320, 
    r: 479, 
    q: 929, 
    k: 60000, 
    k_e: 60000 
};

// Position tables for chess evaluation (white pieces)
const pst_w = {
    p: [[100, 100, 100, 100, 105, 100, 100, 100], [78, 83, 86, 73, 102, 82, 85, 90], [7, 29, 21, 44, 40, 31, 44, 7], [-17, 16, -2, 15, 14, 0, 15, -13], [-26, 3, 10, 9, 6, 1, 0, -23], [-22, 9, 5, -11, -10, -2, 3, -19], [-31, 8, -7, -37, -36, -14, 3, -31], [0, 0, 0, 0, 0, 0, 0, 0]],
    n: [[-66, -53, -75, -75, -10, -55, -58, -70], [-3, -6, 100, -36, 4, 62, -4, -14], [10, 67, 1, 74, 73, 27, 62, -2], [24, 24, 45, 37, 33, 41, 25, 17], [-1, 5, 31, 21, 22, 35, 2, 0], [-18, 10, 13, 22, 18, 15, 11, -14], [-23, -15, 2, 0, 2, 0, -23, -20], [-74, -23, -26, -24, -19, -35, -22, -69]],
    b: [[-59, -78, -82, -76, -23, -107, -37, -50], [-11, 20, 35, -42, -39, 31, 2, -22], [-9, 39, -32, 41, 52, -10, 28, -14], [25, 17, 20, 34, 26, 25, 15, 10], [13, 10, 17, 23, 17, 16, 0, 7], [14, 25, 24, 15, 8, 25, 20, 15], [19, 20, 11, 6, 7, 6, 20, 16], [-7, 2, -15, -12, -14, -15, -10, -10]],
    r: [[35, 29, 33, 4, 37, 33, 56, 50], [55, 29, 56, 67, 55, 62, 34, 60], [19, 35, 28, 33, 45, 27, 25, 15], [0, 5, 16, 13, 18, -4, -9, -6], [-28, -35, -16, -21, -13, -29, -46, -30], [-42, -28, -42, -25, -25, -35, -26, -46], [-53, -38, -31, -26, -29, -43, -44, -53], [-30, -24, -18, 5, -2, -18, -31, -32]],
    q: [[6, 1, -8, -104, 69, 24, 88, 26], [14, 32, 60, -10, 20, 76, 57, 24], [-2, 43, 32, 60, 72, 63, 43, 2], [1, -16, 22, 17, 25, 20, -13, -6], [-14, -15, -2, -5, -1, -10, -20, -22], [-30, -6, -13, -11, -16, -11, -16, -27], [-36, -18, 0, -19, -15, -15, -21, -38], [-39, -30, -31, -13, -31, -36, -34, -42]],
    k: [[4, 54, 47, -99, -99, 60, 83, -62], [-32, 10, 55, 56, 56, 55, 10, 3], [-62, 12, -57, 44, -67, 28, 37, -31], [-55, 50, 11, -4, -19, 13, 0, -49], [-55, -43, -52, -28, -51, -47, -8, -50], [-47, -42, -43, -79, -64, -32, -29, -32], [-4, 3, -14, -50, -57, -18, 13, 4], [17, 30, -3, -14, 6, -1, 40, 18]],
    k_e: [[-50, -40, -30, -20, -20, -30, -40, -50], [-30, -20, -10, 0, 0, -10, -20, -30], [-30, -10, 20, 30, 30, 20, -10, -30], [-30, -10, 30, 40, 40, 30, -10, -30], [-30, -10, 30, 40, 40, 30, -10, -30], [-30, -10, 20, 30, 30, 20, -10, -30], [-30, -30, 0, 0, 0, 0, -30, -30], [-50, -30, -30, -30, -30, -30, -30, -50]]
};

// Position tables for black pieces (reversed)
const pst_b = { 
    p: pst_w['p'].slice().reverse(), 
    n: pst_w['n'].slice().reverse(), 
    b: pst_w['b'].slice().reverse(), 
    r: pst_w['r'].slice().reverse(), 
    q: pst_w['q'].slice().reverse(), 
    k: pst_w['k'].slice().reverse(), 
    k_e: pst_w['k_e'].slice().reverse() 
};

// Position table mappings
const pstOpponent = { w: pst_b, b: pst_w };
const pstSelf = { w: pst_w, b: pst_b };

// Sound types for chess
const CHESS_SOUNDS = {
    MOVE: 'move',
    CAPTURE: 'capture',
    PROMOTE: 'promote',
    CASTLING: 'castling',
    INCORRECT: 'incorrect',
    CHECK: 'check',
    CHECKMATE: 'checkmate'
};

// Chess AI modes
const AI_MODES = {
    STOCKFISH: 'stockfish',
    MINIMAX: 'minimax'
};

// Message limits
const MAX_MESSAGES_PER_CHAT = 7;

// Admin configuration
const ADMIN_CONFIG = {
    ADMIN_EMAIL: '123@gmail.com',
    DEFAULT_LIMITS: {
        responseLimit: 0, // 0 means unlimited
        dailyChatLimit: 0, // 0 means unlimited
        customMessage: 'You have reached your usage limit. Please contact support.'
    }
};

// Typing effect configuration
const TYPING_CONFIG = {
    DEFAULT_SPEED: 25, // Characters per second
    MIN_DELAY: 10, // Minimum delay between characters (ms)
    MAX_DELAY: 50, // Maximum delay between characters (ms)
    PUNCTUATION_DELAY: 200, // Extra delay after punctuation
    WORD_DELAY: 100, // Extra delay after words
    CURSOR_BLINK_SPEED: 500 // Cursor blink speed (ms)
};

// Code formatter configuration
const CODE_CONFIG = {
    SUPPORTED_LANGUAGES: [
        'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
        'html', 'css', 'sql', 'php', 'ruby', 'go', 'rust', 'kotlin',
        'swift', 'dart', 'bash', 'json', 'xml', 'yaml', 'markdown'
    ],
    PRISM_THEME: 'dark', // Default Prism theme
    AUTO_DETECT_LANGUAGE: true, // Auto-detect code language
    SHOW_LINE_NUMBERS: true, // Show line numbers in code blocks
    COPY_BUTTON_TEXT: '📋 Copy',
    COPY_SUCCESS_TEXT: '✅ Copied!'
};

// Continue functionality keywords
const CONTINUE_INDICATORS = [
    'continue',
    'continued...',
    'to be continued',
    'more...',
    'part 1 of',
    'part 2 of',
    '...',
    'see next message',
    'continuing...'
];

// Chart and visualization configuration
const VISUALIZATION_CONFIG = {
    DEFAULT_CHART_COLORS: [
        '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
        '#8b5cf6', '#f97316', '#06b6d4', '#84cc16'
    ],
    CHART_BACKGROUND: '#1f2937',
    CHART_GRID_COLOR: '#374151',
    CHART_TEXT_COLOR: '#f3f4f6',
    DEFAULT_CHART_HEIGHT: 300,
    DEFAULT_CHART_WIDTH: 500
};

// Enhanced message formatting patterns
const MESSAGE_PATTERNS = {
    CODE_BLOCK: /```(\w*)\n?([\s\S]*?)```/g,
    INLINE_CODE: /`([^`]+)`/g,
    BOLD: /\*\*([^*]+)\*\*/g,
    ITALIC: /\*([^*]+)\*/g,
    HEADER_1: /^# (.+)$/gm,
    HEADER_2: /^## (.+)$/gm,
    HEADER_3: /^### (.+)$/gm,
    UNORDERED_LIST: /^\- (.+)$/gm,
    ORDERED_LIST: /^\d+\. (.+)$/gm,
    HORIZONTAL_RULE: /\n---\n/g
};

// Firebase paths for admin functionality
const FIREBASE_PATHS = {
    USER_LIMITS: 'userLimits',
    USER_USAGE: 'userUsage',
    CHATS: 'chats',
    ADMIN_SETTINGS: 'adminSettings'
};

// Error messages
const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error occurred. Please check your internet connection.',
    AI_SERVICE_ERROR: 'AI service temporarily unavailable. Please try again.',
    RATE_LIMIT: 'Service is busy. Please wait a moment and try again.',
    GENERAL_ERROR: 'An unexpected error occurred. Please try again.',
    ADMIN_ONLY: 'This feature is only available to administrators.',
    LIMIT_REACHED: 'You have reached your usage limit.',
    INVALID_INPUT: 'Please provide a valid input.'
};

// Success messages
const SUCCESS_MESSAGES = {
    CODE_COPIED: 'Code copied to clipboard!',
    SETTINGS_SAVED: 'Settings saved successfully!',
    CHAT_ARCHIVED: 'Chat archived successfully!',
    PLUGIN_ENABLED: 'Plugin enabled successfully!',
    PLUGIN_DISABLED: 'Plugin disabled successfully!',
    USER_LIMITS_UPDATED: 'User limits updated successfully!'
};

// UI Animation durations (in milliseconds)
const ANIMATION_DURATIONS = {
    FADE_IN: 300,
    SLIDE_IN: 250,
    BOUNCE: 400,
    TYPING_CURSOR: 500,
    BUTTON_HOVER: 200,
    MODAL_TRANSITION: 250
};

// Local storage keys
const STORAGE_KEYS = {
    TERMS_ACCEPTED: 'aivaTermsAccepted',
    ARCHIVED_CHATS: 'aivaArchivedChats',
    ENABLED_PLUGINS: 'aivaEnabledPlugins',
    USER_PREFERENCES: 'aivaUserPreferences',
    THEME_SETTINGS: 'aivaThemeSettings'
};

// Plugin configuration
const PLUGIN_CONFIG = {
    CHESS: {
        NAME: 'Chess Master',
        DESCRIPTION: 'Play chess games with AI opponent',
        ICON: '♗',
        CATEGORY: 'Games',
        REQUIRES_ASSETS: ['chess.js', 'chessboard.js', 'pieces/*.svg', 'sounds/*.mp3']
    },
    ADMIN: {
        NAME: 'Admin Panel',
        DESCRIPTION: 'Administrative controls and user management',
        ICON: '⚙️',
        CATEGORY: 'Administration',
        RESTRICTED: true,
        ALLOWED_USERS: [ADMIN_CONFIG.ADMIN_EMAIL]
    }
};

// Export all constants for use in other modules
if (typeof window !== 'undefined') {
    window.APP_CONSTANTS = {
        pieceCandidates,
        weights,
        pst_w,
        pst_b,
        pstOpponent,
        pstSelf,
        CHESS_SOUNDS,
        AI_MODES,
        MAX_MESSAGES_PER_CHAT,
        ADMIN_CONFIG,
        TYPING_CONFIG,
        CODE_CONFIG,
        CONTINUE_INDICATORS,
        VISUALIZATION_CONFIG,
        MESSAGE_PATTERNS,
        FIREBASE_PATHS,
        ERROR_MESSAGES,
        SUCCESS_MESSAGES,
        ANIMATION_DURATIONS,
        STORAGE_KEYS,
        PLUGIN_CONFIG
    };
}
