// Global State Management

// Application State
const AppState = {
    // User authentication
    currentUser: null,
    
    // Chat management
    currentChatId: null,
    conversationHistory: [],
    chatHistoryData: {},
    messageCount: 0,
    
    // Archive management
    archivedChats: {},
    
    // Settings and preferences
    hasAcceptedTerms: false,
    enabledPlugins: {},
    
    // Chess specific state
    isChessConversation: false,
    chessGameData: null,
    
    // Initialize state
    init: function() {
        this.loadFromStorage();
    },
    
    // Load state from localStorage
    loadFromStorage: function() {
        this.hasAcceptedTerms = localStorage.getItem('aivaTermsAccepted') === 'true';
        
        const savedArchived = localStorage.getItem('aivaArchivedChats');
        if (savedArchived) {
            try {
                this.archivedChats = JSON.parse(savedArchived);
            } catch (e) {
                this.archivedChats = {};
            }
        }
        
        const savedPlugins = localStorage.getItem('aivaEnabledPlugins');
        if (savedPlugins) {
            try {
                this.enabledPlugins = JSON.parse(savedPlugins);
            } catch (e) {
                this.enabledPlugins = {};
            }
        }
    },
    
    // Save state to localStorage
    saveToStorage: function() {
        localStorage.setItem('aivaTermsAccepted', 'true');
        localStorage.setItem('aivaArchivedChats', JSON.stringify(this.archivedChats));
        localStorage.setItem('aivaEnabledPlugins', JSON.stringify(this.enabledPlugins));
    },
    
    // Reset chat state
    resetChatState: function() {
        this.currentChatId = null;
        this.conversationHistory = [];
        this.messageCount = 0;
        this.isChessConversation = false;
        this.chessGameData = null;
    },
    
    // Reset all state
    resetAll: function() {
        this.currentUser = null;
        this.resetChatState();
        this.chatHistoryData = {};
        this.archivedChats = {};
        this.hasAcceptedTerms = false;
        this.enabledPlugins = {};
        this.saveToStorage();
    }
};

// Chess Engine State
const ChessState = {
    // Chess board and game
    chessBoard: null,
    chessGame: null,
    globalSum: 0,
    
    // AI engine configuration
    aiMode: AI_MODES.STOCKFISH,
    stockfishEngine: null,
    engineReady: false,
    engineBusy: false,
    stockfishMovetime: 800,
    engineOpts: {},
    engineDefaultHandler: null,
    
    // Game state
    inputLocked: false,
    processingMove: false,
    selectedSquare: null,
    legalTargets: [],
    pieceImgResolved: {},
    pgn_moves: [],
    
    // Reset chess state
    reset: function() {
        this.chessBoard = null;
        this.chessGame = null;
        this.globalSum = 0;
        this.inputLocked = false;
        this.processingMove = false;
        this.selectedSquare = null;
        this.legalTargets = [];
        this.pgn_moves = [];
    }
};

// Initialize state on load
AppState.init();
