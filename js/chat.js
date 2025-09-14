// Chat Management

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
