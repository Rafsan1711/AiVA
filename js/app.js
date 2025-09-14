// Main Application Entry Point

const App = {
    // Initialize the application
    init: function() {
        console.log('Initializing AiVA...');
        
        // Load user preferences
        this.loadUserPreferences();
        
        // Initialize all managers
        this.initializeManagers();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check if terms are accepted
        if (AppState.hasAcceptedTerms) {
            UIManager.hideTermsModal();
            AuthManager.checkAuthState();
        } else {
            UIManager.showTermsModal();
        }
        
        console.log('AiVA initialized successfully');
    },
    
    // Load user preferences from storage
    loadUserPreferences: function() {
        AppState.hasAcceptedTerms = StorageManager.hasAcceptedTerms();
        AppState.archivedChats = StorageManager.loadArchivedChats();
        AppState.enabledPlugins = StorageManager.loadEnabledPlugins();
    },
    
    // Initialize all managers
    initializeManagers: function() {
        // Initialize UI Manager
        UIManager.initEventListeners();
        
        // Initialize Authentication Manager
        AuthManager.initEventListeners();
        
        // Initialize Chat Manager
        ChatManager.initEventListeners();
        
        // Initialize Message Manager
        MessageManager.initEventListeners();
        
        // Initialize Chess Plugin if enabled
        if (AppState.enabledPlugins.chess) {
            ChessPlugin.initialize();
        }
    },
    
    // Setup main application event listeners
    setupEventListeners: function() {
        // Window load event
        window.addEventListener('load', () => {
            console.log('Window loaded');
        });
        
        // Window beforeunload event (save data before closing)
        window.addEventListener('beforeunload', () => {
            AppState.saveToStorage();
        });
        
        // Handle window resize
        window.addEventListener('resize', Utils.debounce(() => {
            this.handleWindowResize();
        }, 250));
        
        // Handle online/offline events
        window.addEventListener('online', () => {
            console.log('Connection restored');
            this.updateConnectionStatus(true);
        });
        
        window.addEventListener('offline', () => {
            console.log('Connection lost');
            this.updateConnectionStatus(false);
        });
        
        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page is hidden, save state
                AppState.saveToStorage();
            }
        });
        
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.handleGlobalError(event.error);
        });
        
        // Unhandled promise rejection
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleGlobalError(event.reason);
        });
    },
    
    // Handle window resize
    handleWindowResize: function() {
        // Close mobile sidebar if window is resized to desktop
        if (window.innerWidth >= 769) {
            UIManager.closeMobileSidebar();
        }
        
        // Refresh chess board if exists
        if (ChessState.chessBoard && typeof ChessState.chessBoard.resize === 'function') {
            ChessState.chessBoard.resize();
        }
    },
    
    // Update connection status
    updateConnectionStatus: function(isOnline) {
        const statusElements = document.querySelectorAll('#statusIndicator');
        statusElements.forEach(element => {
            element.textContent = isOnline ? 'Online' : 'Offline';
            element.className = isOnline ? 'text-xs text-green-400' : 'text-xs text-red-400';
        });
    },
    
    // Handle global errors
    handleGlobalError: function(error) {
        // Log error for debugging
        console.error('Application error:', error);
        
        // Show user-friendly error message for critical errors
        if (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk')) {
            this.showErrorMessage('A resource failed to load. Please refresh the page and try again.');
        } else if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
            this.showErrorMessage('Network error occurred. Please check your internet connection.');
        } else if (error.name === 'TypeError' && error.message?.includes('Cannot read property')) {
            console.warn('Non-critical error caught:', error);
            // Don't show user message for minor property access errors
        } else {
            // For other critical errors, show generic message
            this.showErrorMessage('An unexpected error occurred. Please refresh the page if the problem persists.');
        }
    },
    
    // Show error message to user
    showErrorMessage: function(message) {
        // Create or update error banner
        let errorBanner = document.getElementById('errorBanner');
        if (!errorBanner) {
            errorBanner = document.createElement('div');
            errorBanner.id = 'errorBanner';
            errorBanner.className = 'fixed top-0 left-0 right-0 bg-red-600 text-white p-3 text-center z-50';
            document.body.prepend(errorBanner);
        }
        
        errorBanner.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">×</button>
            </div>
        `;
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (errorBanner && errorBanner.parentNode) {
                errorBanner.remove();
            }
        }, 10000);
    },
    
    // Cleanup function
    cleanup: function() {
        console.log('Cleaning up application...');
        
        // Save current state
        AppState.saveToStorage();
        
        // Close any open connections
        if (ChessState.stockfishEngine) {
            try {
                ChessState.stockfishEngine.terminate?.();
            } catch (e) {
                console.warn('Error terminating chess engine:', e);
            }
        }
        
        // Clear any intervals/timeouts
        // (Add any cleanup for intervals/timeouts here)
    },
    
    // Development helper functions
    debug: {
        // Get current app state
        getState: function() {
            return {
                appState: AppState,
                chessState: ChessState,
                elements: Elements
            };
        },
        
        // Reset application
        reset: function() {
            if (confirm('This will reset all application data. Are you sure?')) {
                AppState.resetAll();
                StorageManager.clearAll();
                location.reload();
            }
        },
        
        // Enable debug logging
        enableLogging: function() {
            window.AIVA_DEBUG = true;
            console.log('Debug logging enabled');
        },
        
        // Test chess engine
        testChessEngine: function() {
            if (ChessState.stockfishEngine && ChessState.engineReady) {
                console.log('Chess engine is ready');
                return true;
            } else {
                console.log('Chess engine not ready');
                return false;
            }
        }
    }
};

// Make debug functions available in development
if (typeof window !== 'undefined') {
    window.AivaDebug = App.debug;
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    App.cleanup();
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}
