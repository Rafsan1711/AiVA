// Enhanced Main Application Entry Point with New Features

const App = {
    // Initialize the application
    init: function() {
        console.log('Initializing AiVA with enhanced features...');
        
        // Load user preferences
        this.loadUserPreferences();
        
        // Initialize all managers
        this.initializeManagers();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check admin permissions
        this.checkAdminAccess();
        
        // Initialize new features
        this.initializeNewFeatures();
        
        // Check if terms are accepted
        if (AppState.hasAcceptedTerms) {
            UIManager.hideTermsModal();
            AuthManager.checkAuthState();
        } else {
            UIManager.showTermsModal();
        }
        
        console.log('AiVA initialized successfully with new features');
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
        
        // Initialize Enhanced Message Manager
        MessageManager.initEventListeners();
        
        // Initialize Code Formatter
        CodeFormatter.initialize();
        
        // Initialize Chess Plugin if enabled
        if (AppState.enabledPlugins.chess) {
            ChessPlugin.initialize();
        }
    },
    
    // Check admin access and initialize admin features
    checkAdminAccess: function() {
        // Wait for auth state to be ready
        setTimeout(() => {
            if (AdminPlugin.isAdmin()) {
                console.log('Admin access detected - initializing admin features');
                AdminPlugin.initialize();
            }
        }, 1000);
    },
    
    // Initialize new features
    initializeNewFeatures: function() {
        // Initialize typing effect system
        if (typeof TypingEffect !== 'undefined') {
            console.log('Typing effect system initialized');
        }
        
        // Initialize code formatting
        if (typeof CodeFormatter !== 'undefined') {
            console.log('Code formatter initialized');
        }
        
        // Initialize continue handler
        if (typeof ContinueHandler !== 'undefined') {
            console.log('Continue functionality initialized');
        }
        
        // Initialize visualization handler
        if (typeof VisualizationHandler !== 'undefined') {
            console.log('Visualization system initialized');
        }
    },
    
    // Enhanced chat creation with limit checking
    createNewChat: async function(isChessChat = false) {
        // Check admin limits if user exists
        if (AppState.currentUser) {
            const canCreateChat = await AdminPlugin.checkChatCreationLimits(AppState.currentUser.email);
            if (!canCreateChat) {
                return false;
            }
            
            // Track chat creation
            AdminPlugin.trackUserUsage(AppState.currentUser.email, 'chat');
        }
        
        if (isChessChat) {
            ChatManager.startChessConversation();
        } else {
            ChatManager.startNewChat();
        }
        
        return true;
    },
    
    // Setup main application event listeners
    setupEventListeners: function() {
        // Window load event
        window.addEventListener('load', () => {
            console.log('Window loaded - initializing dynamic features');
            this.initializeDynamicFeatures();
        });
        
        // Window beforeunload event (save data before closing)
        window.addEventListener('beforeunload', () => {
            AppState.saveToStorage();
            
            // Stop all typing animations
            if (typeof TypingEffect !== 'undefined') {
                TypingEffect.stopAllTyping();
            }
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
                
                // Pause typing animations
                if (typeof TypingEffect !== 'undefined') {
                    for (const [typerId] of TypingEffect.activeTypers) {
                        TypingEffect.pauseTyping(typerId);
                    }
                }
            } else {
                // Page is visible, resume typing animations
                if (typeof TypingEffect !== 'undefined') {
                    for (const [typerId] of TypingEffect.activeTypers) {
                        TypingEffect.resumeTyping(typerId);
                    }
                }
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
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    },
    
    // Initialize dynamic features after page load
    initializeDynamicFeatures: function() {
        // Load additional Prism components based on usage
        this.loadDynamicPrismComponents();
        
        // Initialize Chart.js if available
        if (typeof Chart !== 'undefined') {
            Chart.defaults.color = VISUALIZATION_CONFIG.CHART_TEXT_COLOR;
            Chart.defaults.backgroundColor = VISUALIZATION_CONFIG.CHART_BACKGROUND;
            console.log('Chart.js initialized with dark theme');
        }
        
        // Setup copy to clipboard functionality
        this.setupClipboardFeatures();
    },
    
    // Load Prism components dynamically
    loadDynamicPrismComponents: function() {
        // This will be called when specific languages are needed
        // The CodeFormatter handles dynamic loading
        console.log('Dynamic Prism loading system ready');
    },
    
    // Setup clipboard features
    setupClipboardFeatures: function() {
        if (!navigator.clipboard) {
            console.warn('Clipboard API not available - using fallback');
        } else {
            console.log('Clipboard API available');
        }
    },
    
    // Handle keyboard shortcuts
    handleKeyboardShortcuts: function(e) {
        // Ctrl/Cmd + Enter to send message
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            MessageManager.sendMessage();
        }
        
        // Ctrl/Cmd + N for new chat
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.createNewChat();
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.fixed.inset-0:not(.hidden)');
            modals.forEach(modal => {
                if (modal.id !== 'mainApp') {
                    Utils.hide(modal);
                }
            });
        }
        
        // Ctrl/Cmd + / to focus message input
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            Elements.messageInput?.focus();
        }
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
        
        // Adjust chart sizes if any exist
        const charts = document.querySelectorAll('.chart-canvas');
        charts.forEach(canvas => {
            if (canvas.chart) {
                canvas.chart.resize();
            }
        });
    },
    
    // Update connection status
    updateConnectionStatus: function(isOnline) {
        const statusElements = document.querySelectorAll('#statusIndicator');
        statusElements.forEach(element => {
            element.textContent = isOnline ? 'Online' : 'Offline';
            element.className = isOnline ? 'text-xs text-green-400' : 'text-xs text-red-400';
        });
        
        // Show notification for connection status
        if (!isOnline) {
            this.showNotification('Connection lost. Some features may not work.', 'warning');
        } else {
            this.showNotification('Connection restored!', 'success', 2000);
        }
    },
    
    // Show notification to user
    showNotification: function(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${this.getNotificationClasses(type)}`;
        notification.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-current opacity-70 hover:opacity-100">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    },
    
    // Get notification CSS classes based on type
    getNotificationClasses: function(type) {
        const classes = {
            info: 'bg-blue-600 text-white',
            success: 'bg-green-600 text-white',
            warning: 'bg-yellow-600 text-black',
            error: 'bg-red-600 text-white'
        };
        return classes[type] || classes.info;
    },
    
    // Handle global errors
    handleGlobalError: function(error) {
        // Log error for debugging
        console.error('Application error:', error);
        
        // Stop any active typing animations
        if (typeof TypingEffect !== 'undefined') {
            TypingEffect.stopAllTyping();
        }
        
        // Show user-friendly error message for critical errors
        if (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk')) {
            this.showNotification('A resource failed to load. Please refresh the page and try again.', 'error');
        } else if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
            this.showNotification('Network error occurred. Please check your internet connection.', 'error');
        } else if (error.name === 'TypeError' && error.message?.includes('Cannot read property')) {
            console.warn('Non-critical error caught:', error);
            // Don't show user message for minor property access errors
        } else {
            // For other critical errors, show generic message
            this.showNotification('An unexpected error occurred. Please refresh the page if the problem persists.', 'error');
        }
    },
    
    // Enhanced chat creation with admin limits
    createNewChatWithLimits: async function(isChessChat = false) {
        const success = await this.createNewChat(isChessChat);
        if (success && isChessChat) {
            this.showNotification('Chess conversation started! ♗', 'success', 3000);
        }
        return success;
    },
    
    // Application statistics and monitoring
    getAppStats: function() {
        return {
            version: '2.1.0',
            features: {
                typing_effect: typeof TypingEffect !== 'undefined',
                code_highlighting: typeof CodeFormatter !== 'undefined',
                admin_panel: AdminPlugin.isAdmin(),
                chess_plugin: AppState.enabledPlugins.chess || false,
                continue_functionality: typeof ContinueHandler !== 'undefined',
                visualizations: typeof VisualizationHandler !== 'undefined'
            },
            usage: MessageUtils.getMessageStats(),
            performance: {
                memory: performance.memory ? {
                    used: Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB',
                    total: Math.round(performance.memory.totalJSHeapSize / 1048576) + 'MB'
                } : 'Not available',
                uptime: performance.now()
            },
            state: {
                currentUser: AppState.currentUser ? AppState.currentUser.email : 'Anonymous',
                currentChatId: AppState.currentChatId,
                messageCount: AppState.messageCount,
                enabledPlugins: Object.keys(AppState.enabledPlugins).filter(p => AppState.enabledPlugins[p])
            }
        };
    },
    
    // Cleanup function
    cleanup: function() {
        console.log('Cleaning up application...');
        
        // Save current state
        AppState.saveToStorage();
        
        // Stop all typing animations
        if (typeof TypingEffect !== 'undefined') {
            TypingEffect.stopAllTyping();
        }
        
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
                elements: Elements,
                stats: App.getAppStats()
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
        
        // Test features
        testFeatures: function() {
            const tests = {
                typing_effect: typeof TypingEffect !== 'undefined',
                code_formatter: typeof CodeFormatter !== 'undefined',
                admin_plugin: typeof AdminPlugin !== 'undefined',
                continue_handler: typeof ContinueHandler !== 'undefined',
                visualization: typeof VisualizationHandler !== 'undefined',
                chess_engine: ChessState.stockfishEngine && ChessState.engineReady,
                prism_js: typeof Prism !== 'undefined',
                chart_js: typeof Chart !== 'undefined'
            };
            
            console.log('Feature test results:', tests);
            return tests;
        },
        
        // Simulate typing effect
        simulateTyping: function(text = 'This is a test message with **bold** and `code` formatting.') {
            TypingEffect.typeMessage(text, Elements.messagesContainer);
        },
        
        // Test code highlighting
        testCodeHighlighting: function() {
            const testCode = `function hello() {\n    console.log('Hello, World!');\n    return true;\n}`;
            const formattedCode = CodeFormatter.createCodeBlock(testCode, 'javascript');
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = formattedCode;
            Elements.messagesContainer.appendChild(tempDiv);
            
            CodeFormatter.highlightCodeBlock(tempDiv);
        },
        
        // Get admin status
        getAdminStatus: function() {
            return {
                isAdmin: AdminPlugin.isAdmin(),
                currentUser: AppState.currentUser?.email,
                adminEmail: AdminPlugin.ADMIN_EMAIL
            };
        }
    }
};

// Make debug functions available in development
if (typeof window !== 'undefined') {
    window.AivaDebug = App.debug;
    window.AppStats = App.getAppStats;
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
