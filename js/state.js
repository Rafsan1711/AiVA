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
    
    // Code Improver specific state
    isCodeImproverConversation: false,
    codeImproverData: null,
    
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
        this.isCodeImproverConversation = false;
        this.codeImproverData = null;
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

// Code Improver State
const CodeImproverState = {
    // Plugin active status
    isActive: false,
    
    // Source files management
    sourceFiles: {},
    
    // Current workflow state
    currentWorkflow: {
        stage: CODE_IMPROVER_STAGES.IDLE,
        featureDescription: '',
        currentFile: null,
        currentGeneratedCode: '',
        allFiles: [],
        fileIndex: 0,
        debugCount: 0
    },
    
    // Prism.js loading status
    prismLoaded: false,
    
    // Firebase references
    firebaseRef: null,
    
    // Reset code improver state
    reset: function() {
        this.isActive = false;
        this.sourceFiles = {};
        this.currentWorkflow = {
            stage: CODE_IMPROVER_STAGES.IDLE,
            featureDescription: '',
            currentFile: null,
            currentGeneratedCode: '',
            allFiles: [],
            fileIndex: 0,
            debugCount: 0
        };
        this.prismLoaded = false;
        this.firebaseRef = null;
    },
    
    // Initialize Firebase reference
    initFirebase: function(userId) {
        if (userId && typeof database !== 'undefined') {
            this.firebaseRef = database.ref(`codeImprover/${userId}`);
        }
    },
    
    // Save source files to Firebase
    saveSourceFiles: function() {
        if (this.firebaseRef) {
            this.firebaseRef.child('sourceFiles').set(this.sourceFiles);
        }
    },
    
    // Load source files from Firebase
    loadSourceFiles: function() {
        return new Promise((resolve) => {
            if (this.firebaseRef) {
                this.firebaseRef.child('sourceFiles').on('value', (snapshot) => {
                    this.sourceFiles = snapshot.val() || {};
                    resolve(this.sourceFiles);
                });
            } else {
                resolve({});
            }
        });
    }
};

// Initialize state on load
AppState.init();
