// Chat Management

const ChatManager = {
    // Start new regular chat
    startNewChat: function() {
        AppState.currentChatId = Utils.generateChatId();
        AppState.conversationHistory = [];
        AppState.messageCount = 0;
        AppState.isChessConversation = false;
        AppState.chessGameData = null;
        AppState.isCodeImproverConversation = false;
        AppState.codeImproverData = null;
        UIManager.updateMessageCount(0);
        UIManager.hideWarningBanner();
        
        // Reset chat title and avatar
        UIManager.setChatTitle('AiVA Assistant');
        UIManager.setChatAvatar('AI', false);
        
        UIManager.showWelcomeMessage("New Conversation", "How can I help you today?");
        UIManager.enableInput();
        UIManager.focusInput();
    },
    
    // Start new chess conversation
    startChessConversation: function() {
        AppState.currentChatId = Utils.generateChatId();
        AppState.conversationHistory = [];
        AppState.messageCount = 0;
        AppState.isChessConversation = true;
        AppState.isCodeImproverConversation = false;
        ChessState.reset();
        ChessPlugin.initialize();
        UIManager.updateMessageCount(0);
        UIManager.hideWarningBanner();
        
        // Set chess chat appearance
        UIManager.setChatTitle('Chess Master');
        UIManager.setChatAvatar('♗', true);
        
        UIManager.showChessWelcomeMessage();
        
        // Add initial chess message
        setTimeout(() => {
            MessageManager.addMessage("Welcome to Chess Master! I'm excited to play chess with you. Would you like to start a game? Just say 'yes' or 'let's play' to begin our match!", 'assistant');
        }, 500);
        
        UIManager.enableInput();
        UIManager.focusInput();
    },

    // Start Code Improver conversation (Always uses same chat ID)
    startCodeImproverConversation: function() {
        // Check if Code Improver chat already exists
        const existingCodeImproverChat = Object.values(AppState.chatHistoryData).find(chat => 
            chat.isCodeImproverConversation && !AppState.archivedChats[chat.id]
        );

        if (existingCodeImproverChat) {
            // Load existing Code Improver chat
            this.loadChat(existingCodeImproverChat);
            return;
        }

        // Create new Code Improver conversation
        AppState.currentChatId = CodeImproverPlugin.CHAT_ID;
        AppState.conversationHistory = [];
        AppState.messageCount = 0;
        AppState.isChessConversation = false;
        AppState.isCodeImproverConversation = true;
        CodeImproverState.reset();
        CodeImproverState.isActive = true;
        
        // Initialize Code Improver plugin
        if (AppState.currentUser) {
            CodeImproverState.initFirebase(AppState.currentUser.uid);
            CodeImproverPlugin.initialize();
        }
        
        UIManager.updateMessageCount(0);
        UIManager.hideWarningBanner();
        
        // Set Code Improver chat appearance
        UIManager.setChatTitle('Code Improver');
        UIManager.setChatAvatar('💻', true);
        
        UIManager.clearMessages();
        
        // Start Code Improver conversation
        CodeImproverPlugin.startCodeImproverConversation();
    },
    
    // Load chat history from Firebase
    loadChatHistory: function() {
        if (!AppState.currentUser) return;

        database.ref(`chats/${AppState.currentUser.uid}`).on('value', (snapshot) => {
            AppState.chatHistoryData = snapshot.val() || {};
            this.updateChatHistoryUI();
        });
    },
    
    // Update chat history UI
    updateChatHistoryUI: function() {
        const chats = Object.values(AppState.chatHistoryData)
            .filter(chat => !AppState.archivedChats[chat.id])
            .sort((a, b) => b.timestamp - a.timestamp);

        // Clear existing history
        Elements.chatHistory.innerHTML = '';
        Elements.mobileChatHistory.innerHTML = '';

        chats.forEach(chat => {
            const chatItem = UIManager.createChatItem(chat);
            const mobileChatItem = UIManager.createChatItem(chat);
            
            chatItem.addEventListener('click', () => this.loadChat(chat));
            mobileChatItem.addEventListener('click', () => {
                this.loadChat(chat);
                UIManager.closeMobileSidebar();
            });
            
            Elements.chatHistory.appendChild(chatItem);
            Elements.mobileChatHistory.appendChild(mobileChatItem);
        });
    },
    
    // Load specific chat
    loadChat: function(chat) {
        AppState.currentChatId = chat.id;
        AppState.conversationHistory = chat.messages || [];
        AppState.messageCount = chat.messageCount || AppState.conversationHistory.filter(msg => msg.role === 'user').length;
        AppState.isChessConversation = chat.isChessConversation || false;
        AppState.chessGameData = chat.chessGameData || null;
        AppState.isCodeImproverConversation = chat.isCodeImproverConversation || false;
        AppState.codeImproverData = chat.codeImproverData || null;
        UIManager.updateMessageCount(AppState.messageCount);
        
        // Set chat appearance based on type
        if (AppState.isChessConversation) {
            UIManager.setChatTitle('Chess Master');
            UIManager.setChatAvatar('♗', true);
        } else if (AppState.isCodeImproverConversation) {
            UIManager.setChatTitle('Code Improver');
            UIManager.setChatAvatar('💻', true);
            CodeImproverState.isActive = true;
            
            // Initialize Code Improver for existing chat
            if (AppState.currentUser) {
                CodeImproverState.initFirebase(AppState.currentUser.uid);
                CodeImproverPlugin.initialize();
            }
        } else {
            UIManager.setChatTitle('AiVA Assistant');
            UIManager.setChatAvatar('AI', false);
        }
        
        // Clear messages and rebuild
        UIManager.clearMessages();
        
        // Special handling for Code Improver chat
        if (AppState.isCodeImproverConversation) {
            // Show source code card first
            CodeImproverPlugin.showSourceCodeCard();
        }
        
        // Rebuild conversation display
        AppState.conversationHistory.forEach(msg => {
            if (msg.role === 'user') {
                MessageManager.addMessage(msg.content, 'user');
            } else if (msg.role === 'assistant') {
                // Check if this message should contain special content
                if (AppState.isChessConversation && msg.content.includes("Let's play chess")) {
                    const chessHTML = ChessPlugin.createChessBoard();
                    MessageManager.addMessage(msg.content, 'assistant', chessHTML);
                } else {
                    MessageManager.addMessage(msg.content, 'assistant');
                }
            }
        });
        
        this.updateChatHistoryUI();
    },
    
    // Save chat to history
    saveChatToHistory: function() {
        if (!AppState.currentUser || !AppState.currentChatId) return;

        const chatTitle = AppState.conversationHistory.find(msg => msg.role === 'user')?.content?.substring(0, 50) || 'New Chat';
        const chatData = {
            id: AppState.currentChatId,
            title: chatTitle,
            messages: AppState.conversationHistory,
            timestamp: Date.now(),
            userId: AppState.currentUser.uid,
            messageCount: AppState.messageCount,
            isChessConversation: AppState.isChessConversation || false,
            chessGameData: AppState.chessGameData || null,
            isCodeImproverConversation: AppState.isCodeImproverConversation || false,
            codeImproverData: AppState.codeImproverData || null
        };

        AppState.chatHistoryData[AppState.currentChatId] = chatData;
        
        // Save to Firebase
        database.ref(`chats/${AppState.currentUser.uid}/${AppState.currentChatId}`).set(chatData);
        
        // Update UI
        this.updateChatHistoryUI();
    },
    
    // Clear all chat history
    clearChatHistory: function() {
        if (!AppState.currentUser) return;
        
        if (confirm('Are you sure you want to clear all chat history?')) {
            database.ref(`chats/${AppState.currentUser.uid}`).remove();
            AppState.chatHistoryData = {};
            AppState.archivedChats = {};
            AppState.saveToStorage();
            this.updateChatHistoryUI();
            ArchiveManager.updateArchivedChatsUI();
            this.startNewChat();
        }
    },
    
    // Filter chats based on search
    filterChats: function() {
        const searchTerm = document.getElementById('searchChats').value.toLowerCase();
        const mobileSearchTerm = document.getElementById('mobileSearchChats').value.toLowerCase();
        const term = searchTerm || mobileSearchTerm;
        
        const chatItems = [...Elements.chatHistory.querySelectorAll('div'), ...Elements.mobileChatHistory.querySelectorAll('div')];
        
        chatItems.forEach(item => {
            const title = item.querySelector('.font-medium')?.textContent?.toLowerCase() || '';
            item.style.display = title.includes(term) ? 'block' : 'none';
        });
    },
    
    // Archive current chat
    archiveCurrentChat: function() {
        if (!AppState.currentChatId || !AppState.chatHistoryData[AppState.currentChatId]) return;
        
        // Prevent archiving Code Improver chat
        if (AppState.isCodeImproverConversation) {
            alert('Code Improver chat cannot be archived. Use delete option if you want to remove it.');
            return;
        }
        
        AppState.archivedChats[AppState.currentChatId] = AppState.chatHistoryData[AppState.currentChatId];
        AppState.saveToStorage();
        this.updateChatHistoryUI();
        ArchiveManager.updateArchivedChatsUI();
        UIManager.hideChatDropdown();
        this.startNewChat();
    },
    
    // Delete current chat
    deleteCurrentChat: function() {
        if (!AppState.currentChatId) return;
        
        // Special handling for Code Improver chat
        if (AppState.isCodeImproverConversation) {
            this.showCodeImproverDeleteModal();
            return;
        }
        
        if (confirm('Are you sure you want to delete this chat?')) {
            if (AppState.currentUser && AppState.chatHistoryData[AppState.currentChatId]) {
                database.ref(`chats/${AppState.currentUser.uid}/${AppState.currentChatId}`).remove();
            }
            delete AppState.chatHistoryData[AppState.currentChatId];
            delete AppState.archivedChats[AppState.currentChatId];
            AppState.saveToStorage();
            this.updateChatHistoryUI();
            ArchiveManager.updateArchivedChatsUI();
            UIManager.hideChatDropdown();
            this.startNewChat();
        }
    },
    
    // Show Code Improver delete confirmation modal
    showCodeImproverDeleteModal: function() {
        const modal = document.getElementById('codeImproverDeleteModal');
        const confirmCheckbox = document.getElementById('confirmDelete');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        const cancelBtn = document.getElementById('cancelDeleteBtn');
        
        Utils.show(modal);
        UIManager.hideChatDropdown();
        
        // Handle checkbox change
        confirmCheckbox.onchange = function() {
            confirmBtn.disabled = !this.checked;
        };
        
        // Handle confirm delete
        confirmBtn.onclick = () => {
            this.deleteCodeImproverChat();
            Utils.hide(modal);
            confirmCheckbox.checked = false;
            confirmBtn.disabled = true;
        };
        
        // Handle cancel
        cancelBtn.onclick = () => {
            Utils.hide(modal);
            confirmCheckbox.checked = false;
            confirmBtn.disabled = true;
        };
    },
    
    // Delete Code Improver chat and all associated data
    deleteCodeImproverChat: function() {
        if (!AppState.currentUser) return;
        
        // Delete from Firebase
        const userRef = database.ref(`codeImprover/${AppState.currentUser.uid}`);
        userRef.remove();
        
        // Delete chat history
        if (AppState.chatHistoryData[AppState.currentChatId]) {
            database.ref(`chats/${AppState.currentUser.uid}/${AppState.currentChatId}`).remove();
        }
        
        // Clean up state
        delete AppState.chatHistoryData[AppState.currentChatId];
        delete AppState.archivedChats[AppState.currentChatId];
        CodeImproverState.reset();
        AppState.saveToStorage();
        
        // Update UI
        this.updateChatHistoryUI();
        ArchiveManager.updateArchivedChatsUI();
        this.startNewChat();
    },
    
    // Initialize chat event listeners
    initEventListeners: function() {
        // New chat buttons
        const newChatBtn = document.getElementById('newChatBtn');
        const mobileNewChatBtn = document.getElementById('mobileNewChatBtn');
        
        if (newChatBtn) newChatBtn.addEventListener('click', this.startNewChat.bind(this));
        if (mobileNewChatBtn) {
            mobileNewChatBtn.addEventListener('click', () => {
                this.startNewChat();
                UIManager.closeMobileSidebar();
            });
        }
        
        // Chat menu actions
        const archiveChat = document.getElementById('archiveChat');
        const deleteChat = document.getElementById('deleteChat');
        
        if (archiveChat) archiveChat.addEventListener('click', this.archiveCurrentChat.bind(this));
        if (deleteChat) deleteChat.addEventListener('click', this.deleteCurrentChat.bind(this));
        
        // Search functionality
        const searchChats = document.getElementById('searchChats');
        const mobileSearchChats = document.getElementById('mobileSearchChats');
        
        if (searchChats) searchChats.addEventListener('input', this.filterChats.bind(this));
        if (mobileSearchChats) mobileSearchChats.addEventListener('input', this.filterChats.bind(this));
        
        // Clear history button
        const clearHistory = document.getElementById('clearHistory');
        if (clearHistory) clearHistory.addEventListener('click', this.clearChatHistory.bind(this));
    }
};// Chat Management

const ChatManager = {
    // Start new regular chat
    startNewChat: function() {
        AppState.currentChatId = Utils.generateChatId();
        AppState.conversationHistory = [];
        AppState.messageCount = 0;
        AppState.isChessConversation = false;
        AppState.chessGameData = null;
        UIManager.updateMessageCount(0);
        UIManager.hideWarningBanner();
        
        // Reset chat title and avatar
        UIManager.setChatTitle('AiVA Assistant');
        UIManager.setChatAvatar('AI', false);
        
        UIManager.showWelcomeMessage("New Conversation", "How can I help you today?");
        UIManager.enableInput();
        UIManager.focusInput();
    },
    
    // Start new chess conversation
    startChessConversation: function() {
        AppState.currentChatId = Utils.generateChatId();
        AppState.conversationHistory = [];
        AppState.messageCount = 0;
        AppState.isChessConversation = true;
        ChessState.reset();
        ChessPlugin.initialize();
        UIManager.updateMessageCount(0);
        UIManager.hideWarningBanner();
        
        // Set chess chat appearance
        UIManager.setChatTitle('Chess Master');
        UIManager.setChatAvatar('♗', true);
        
        UIManager.showChessWelcomeMessage();
        
        // Add initial chess message
        setTimeout(() => {
            MessageManager.addMessage("Welcome to Chess Master! I'm excited to play chess with you. Would you like to start a game? Just say 'yes' or 'let's play' to begin our match!", 'assistant');
        }, 500);
        
        UIManager.enableInput();
        UIManager.focusInput();
    },
    
    // Load chat history from Firebase
    loadChatHistory: function() {
        if (!AppState.currentUser) return;

        database.ref(`chats/${AppState.currentUser.uid}`).on('value', (snapshot) => {
            AppState.chatHistoryData = snapshot.val() || {};
            this.updateChatHistoryUI();
        });
    },
    
    // Update chat history UI
    updateChatHistoryUI: function() {
        const chats = Object.values(AppState.chatHistoryData)
            .filter(chat => !AppState.archivedChats[chat.id])
            .sort((a, b) => b.timestamp - a.timestamp);

        // Clear existing history
        Elements.chatHistory.innerHTML = '';
        Elements.mobileChatHistory.innerHTML = '';

        chats.forEach(chat => {
            const chatItem = UIManager.createChatItem(chat);
            const mobileChatItem = UIManager.createChatItem(chat);
            
            chatItem.addEventListener('click', () => this.loadChat(chat));
            mobileChatItem.addEventListener('click', () => {
                this.loadChat(chat);
                UIManager.closeMobileSidebar();
            });
            
            Elements.chatHistory.appendChild(chatItem);
            Elements.mobileChatHistory.appendChild(mobileChatItem);
        });
    },
    
    // Load specific chat
    loadChat: function(chat) {
        AppState.currentChatId = chat.id;
        AppState.conversationHistory = chat.messages || [];
        AppState.messageCount = chat.messageCount || AppState.conversationHistory.filter(msg => msg.role === 'user').length;
        AppState.isChessConversation = chat.isChessConversation || false;
        AppState.chessGameData = chat.chessGameData || null;
        UIManager.updateMessageCount(AppState.messageCount);
        
        // Set chat appearance
        if (AppState.isChessConversation) {
            UIManager.setChatTitle('Chess Master');
            UIManager.setChatAvatar('♗', true);
        } else {
            UIManager.setChatTitle('AiVA Assistant');
            UIManager.setChatAvatar('AI', false);
        }
        
        // Clear messages and rebuild
        UIManager.clearMessages();
        
        // Rebuild conversation display
        AppState.conversationHistory.forEach(msg => {
            if (msg.role === 'user') {
                MessageManager.addMessage(msg.content, 'user');
            } else if (msg.role === 'assistant') {
                // Check if this message should contain chess board
                if (AppState.isChessConversation && msg.content.includes("Let's play chess")) {
                    const chessHTML = ChessPlugin.createChessBoard();
                    MessageManager.addMessage(msg.content, 'assistant', chessHTML);
                } else {
                    MessageManager.addMessage(msg.content, 'assistant');
                }
            }
        });
        
        this.updateChatHistoryUI();
    },
    
    // Save chat to history
    saveChatToHistory: function() {
        if (!AppState.currentUser || !AppState.currentChatId) return;

        const chatTitle = AppState.conversationHistory.find(msg => msg.role === 'user')?.content?.substring(0, 50) || 'New Chat';
        const chatData = {
            id: AppState.currentChatId,
            title: chatTitle,
            messages: AppState.conversationHistory,
            timestamp: Date.now(),
            userId: AppState.currentUser.uid,
            messageCount: AppState.messageCount,
            isChessConversation: AppState.isChessConversation || false,
            chessGameData: AppState.chessGameData || null
        };

        AppState.chatHistoryData[AppState.currentChatId] = chatData;
        
        // Save to Firebase
        database.ref(`chats/${AppState.currentUser.uid}/${AppState.currentChatId}`).set(chatData);
        
        // Update UI
        this.updateChatHistoryUI();
    },
    
    // Clear all chat history
    clearChatHistory: function() {
        if (!AppState.currentUser) return;
        
        if (confirm('Are you sure you want to clear all chat history?')) {
            database.ref(`chats/${AppState.currentUser.uid}`).remove();
            AppState.chatHistoryData = {};
            AppState.archivedChats = {};
            AppState.saveToStorage();
            this.updateChatHistoryUI();
            ArchiveManager.updateArchivedChatsUI();
            this.startNewChat();
        }
    },
    
    // Filter chats based on search
    filterChats: function() {
        const searchTerm = document.getElementById('searchChats').value.toLowerCase();
        const mobileSearchTerm = document.getElementById('mobileSearchChats').value.toLowerCase();
        const term = searchTerm || mobileSearchTerm;
        
        const chatItems = [...Elements.chatHistory.querySelectorAll('div'), ...Elements.mobileChatHistory.querySelectorAll('div')];
        
        chatItems.forEach(item => {
            const title = item.querySelector('.font-medium')?.textContent?.toLowerCase() || '';
            item.style.display = title.includes(term) ? 'block' : 'none';
        });
    },
    
    // Archive current chat
    archiveCurrentChat: function() {
        if (!AppState.currentChatId || !AppState.chatHistoryData[AppState.currentChatId]) return;
        
        AppState.archivedChats[AppState.currentChatId] = AppState.chatHistoryData[AppState.currentChatId];
        AppState.saveToStorage();
        this.updateChatHistoryUI();
        ArchiveManager.updateArchivedChatsUI();
        UIManager.hideChatDropdown();
        this.startNewChat();
    },
    
    // Delete current chat
    deleteCurrentChat: function() {
        if (!AppState.currentChatId) return;
        
        if (confirm('Are you sure you want to delete this chat?')) {
            if (AppState.currentUser && AppState.chatHistoryData[AppState.currentChatId]) {
                database.ref(`chats/${AppState.currentUser.uid}/${AppState.currentChatId}`).remove();
            }
            delete AppState.chatHistoryData[AppState.currentChatId];
            delete AppState.archivedChats[AppState.currentChatId];
            AppState.saveToStorage();
            this.updateChatHistoryUI();
            ArchiveManager.updateArchivedChatsUI();
            UIManager.hideChatDropdown();
            this.startNewChat();
        }
    },
    
    // Initialize chat event listeners
    initEventListeners: function() {
        // New chat buttons
        const newChatBtn = document.getElementById('newChatBtn');
        const mobileNewChatBtn = document.getElementById('mobileNewChatBtn');
        
        if (newChatBtn) newChatBtn.addEventListener('click', this.startNewChat.bind(this));
        if (mobileNewChatBtn) {
            mobileNewChatBtn.addEventListener('click', () => {
                this.startNewChat();
                UIManager.closeMobileSidebar();
            });
        }
        
        // Chat menu actions
        const archiveChat = document.getElementById('archiveChat');
        const deleteChat = document.getElementById('deleteChat');
        
        if (archiveChat) archiveChat.addEventListener('click', this.archiveCurrentChat.bind(this));
        if (deleteChat) deleteChat.addEventListener('click', this.deleteCurrentChat.bind(this));
        
        // Search functionality
        const searchChats = document.getElementById('searchChats');
        const mobileSearchChats = document.getElementById('mobileSearchChats');
        
        if (searchChats) searchChats.addEventListener('input', this.filterChats.bind(this));
        if (mobileSearchChats) mobileSearchChats.addEventListener('input', this.filterChats.bind(this));
        
        // Clear history button
        const clearHistory = document.getElementById('clearHistory');
        if (clearHistory) clearHistory.addEventListener('click', this.clearChatHistory.bind(this));
    }
};
