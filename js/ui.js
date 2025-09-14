// UI Management

const Elements = {
    // Modals
    termsModal: document.getElementById('termsModal'),
    authModal: document.getElementById('authModal'),
    settingsModal: document.getElementById('settingsModal'),
    archiveModal: document.getElementById('archiveModal'),
    pluginsModal: document.getElementById('pluginsModal'),
    
    // Warning banner
    warningBanner: document.getElementById('warningBanner'),
    
    // Main app
    mainApp: document.getElementById('mainApp'),
    
    // Auth forms
    loginForm: document.getElementById('loginForm'),
    signUpForm: document.getElementById('signUpForm'),
    
    // Chat interface
    messagesContainer: document.getElementById('messagesContainer'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    
    // Chat history
    chatHistory: document.getElementById('chatHistory'),
    mobileChatHistory: document.getElementById('mobileChatHistory'),
    
    // User info elements
    userInfo: document.getElementById('userInfo'),
    userName: document.getElementById('userName'),
    userAvatar: document.getElementById('userAvatar'),
    userPhoto: document.getElementById('userPhoto'),
    userInitial: document.getElementById('userInitial'),
    mobileUserName: document.getElementById('mobileUserName'),
    mobileUserAvatar: document.getElementById('mobileUserAvatar'),
    mobileUserPhoto: document.getElementById('mobileUserPhoto'),
    mobileUserInitial: document.getElementById('mobileUserInitial'),
    
    // Status indicators
    statusIndicator: document.getElementById('statusIndicator'),
    messageCount: document.getElementById('messageCount'),
    mobileMessageCount: document.getElementById('mobileMessageCount'),
    
    // Dropdowns
    chatDropdown: document.getElementById('chatDropdown'),
    
    // Archive
    archivedChats: document.getElementById('archivedChats'),
    
    // Plugins
    enabledPlugins: document.getElementById('enabledPlugins'),
    mobileEnabledPlugins: document.getElementById('mobileEnabledPlugins'),
    
    // Mobile elements
    mobileSidebar: document.getElementById('mobileSidebar'),
    mobileOverlay: document.getElementById('mobileOverlay'),
    
    // Chat elements
    chatTitle: document.getElementById('chatTitle'),
    chatAvatar: document.getElementById('chatAvatar')
};

const UIManager = {
    // Terms Modal Management
    showTermsModal: function() {
        Utils.show(Elements.termsModal);
    },
    
    hideTermsModal: function() {
        Utils.hide(Elements.termsModal);
    },
    
    // Modal Management
    showModal: function(modal) {
        Utils.show(modal);
    },
    
    hideModal: function(modal) {
        Utils.hide(modal);
    },
    
    // Settings Modal
    showSettings: function() {
        Utils.show(Elements.settingsModal);
    },
    
    hideSettings: function() {
        Utils.hide(Elements.settingsModal);
    },
    
    // Archive Modal
    showArchive: function() {
        ArchiveManager.updateArchivedChatsUI();
        Utils.show(Elements.archiveModal);
    },
    
    hideArchive: function() {
        Utils.hide(Elements.archiveModal);
    },
    
    // Plugins Modal
    showPlugins: function() {
        Utils.show(Elements.pluginsModal);
    },
    
    hidePlugins: function() {
        Utils.hide(Elements.pluginsModal);
    },
    
    // Warning Banner
    showWarningBanner: function() {
        Utils.show(Elements.warningBanner);
    },
    
    hideWarningBanner: function() {
        Utils.hide(Elements.warningBanner);
    },
    
    // Mobile Sidebar Management
    openMobileSidebar: function() {
        Utils.addClass(Elements.mobileSidebar, 'open');
        Utils.addClass(Elements.mobileOverlay, 'active');
    },
    
    closeMobileSidebar: function() {
        Utils.removeClass(Elements.mobileSidebar, 'open');
        Utils.removeClass(Elements.mobileOverlay, 'active');
    },
    
    // Chat Dropdown
    toggleChatDropdown: function() {
        Utils.toggleClass(Elements.chatDropdown, 'active');
    },
    
    hideChatDropdown: function() {
        Utils.removeClass(Elements.chatDropdown, 'active');
    },
    
    // Message Count Update
    updateMessageCount: function(count) {
        const countText = `${count}/${MAX_MESSAGES_PER_CHAT}`;
        Elements.messageCount.textContent = countText;
        Elements.mobileMessageCount.textContent = countText;
        
        if (count >= MAX_MESSAGES_PER_CHAT) {
            this.showWarningBanner();
            Elements.sendBtn.disabled = true;
            Elements.messageInput.disabled = true;
        }
    },
    
    // Chat UI Updates
    setChatTitle: function(title) {
        Elements.chatTitle.textContent = title;
    },
    
    setChatAvatar: function(content, isChess = false) {
        Elements.chatAvatar.innerHTML = content;
        if (isChess) {
            Elements.chatAvatar.className = 'w-8 h-8 chess-conversation rounded-full flex items-center justify-center text-sm font-bold text-white';
        } else {
            Elements.chatAvatar.className = 'w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold';
        }
    },
    
    // Clear messages container
    clearMessages: function() {
        Elements.messagesContainer.innerHTML = '';
    },
    
    // Show welcome message
    showWelcomeMessage: function(title = "Welcome to AiVA", subtitle = "Your AI Virtual Assistant is ready to help!", note = "You can send up to 7 messages per chat") {
        Elements.messagesContainer.innerHTML = `
            <div class="text-center text-gray-500 mt-8">
                <div class="logo-placeholder mx-auto mb-4 pulse">AI</div>
                <h3 class="text-lg font-medium mb-1">${title}</h3>
                <p class="text-sm">${subtitle}</p>
                <p class="text-xs text-gray-600 mt-2">${note}</p>
            </div>
        `;
    },
    
    // Show chess welcome message
    showChessWelcomeMessage: function() {
        Elements.messagesContainer.innerHTML = `
            <div class="text-center text-gray-500 mt-8">
                <div class="w-12 h-12 chess-conversation rounded-full flex items-center justify-center text-2xl mx-auto mb-4">♗</div>
                <h3 class="text-lg font-medium mb-1">Chess Master</h3>
                <p class="text-sm">Ready for a strategic chess battle?</p>
                <p class="text-xs text-gray-600 mt-2">Let's play some chess!</p>
            </div>
        `;
    },
    
    // Enable/disable input
    enableInput: function() {
        Elements.messageInput.disabled = false;
        Elements.sendBtn.disabled = false;
        Elements.messageInput.focus();
    },
    
    disableInput: function() {
        Elements.messageInput.disabled = true;
        Elements.sendBtn.disabled = true;
    },
    
    // Clear input
    clearInput: function() {
        Elements.messageInput.value = '';
        Utils.autoResize(Elements.messageInput);
    },
    
    // Focus input
    focusInput: function() {
        Elements.messageInput.focus();
    },
    
    // Scroll to bottom of messages
    scrollMessagesToBottom: function() {
        Utils.scrollToBottom(Elements.messagesContainer);
    },
    
    // Create chat item element
    createChatItem: function(chat) {
        const chatItem = document.createElement('div');
        chatItem.className = `p-3 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors ${
            chat.id === AppState.currentChatId ? 'bg-gray-700' : 'bg-gray-800'
        }`;
        
        const isChess = chat.isChessConversation;
        const icon = isChess ? '♗' : '';
        const titlePrefix = isChess ? 'Chess: ' : '';
        
        chatItem.innerHTML = `
            <div class="font-medium text-sm truncate flex items-center gap-2">
                ${icon ? `<span class="text-lg">${icon}</span>` : ''}
                ${titlePrefix}${Utils.truncate(chat.title)}
            </div>
            <div class="text-xs text-gray-400 flex justify-between">
                <span>${Utils.formatDate(chat.timestamp)}</span>
                <span>${chat.messageCount || 0}/${MAX_MESSAGES_PER_CHAT}</span>
            </div>
        `;
        
        return chatItem;
    },
    
    // Create enabled plugin item
    createEnabledPluginItem: function(pluginName) {
        const item = document.createElement('div');
        item.className = 'enabled-plugin-item';
        
        let icon, title;
        switch(pluginName) {
            case 'chess':
                icon = '♗';
                title = 'Chess Master';
                break;
            default:
                icon = '🧩';
                title = pluginName;
        }
        
        item.innerHTML = `
            <span class="text-lg">${icon}</span>
            <span class="text-sm font-medium">${title}</span>
        `;
        
        return item;
    },
    
    // Initialize UI event listeners
    initEventListeners: function() {
        // Terms modal
        const acceptTerms = document.getElementById('acceptTerms');
        const declineTerms = document.getElementById('declineTerms');
        
        if (acceptTerms) {
            acceptTerms.addEventListener('click', () => {
                AppState.hasAcceptedTerms = true;
                AppState.saveToStorage();
                this.hideTermsModal();
                AuthManager.checkAuthState();
            });
        }
        
        if (declineTerms) {
            declineTerms.addEventListener('click', () => {
                alert('You must accept terms to use AiVA');
            });
        }
        
        // Settings modal
        const closeSettings = document.getElementById('closeSettings');
        const settingsBtn = document.getElementById('settingsBtn');
        const mobileSettingsBtn = document.getElementById('mobileSettingsBtn');
        
        if (closeSettings) closeSettings.addEventListener('click', this.hideSettings.bind(this));
        if (settingsBtn) settingsBtn.addEventListener('click', this.showSettings.bind(this));
        if (mobileSettingsBtn) mobileSettingsBtn.addEventListener('click', this.showSettings.bind(this));
        
        // Archive modal
        const closeArchive = document.getElementById('closeArchive');
        const archiveBtn = document.getElementById('archiveBtn');
        const mobileArchiveBtn = document.getElementById('mobileArchiveBtn');
        
        if (closeArchive) closeArchive.addEventListener('click', this.hideArchive.bind(this));
        if (archiveBtn) archiveBtn.addEventListener('click', this.showArchive.bind(this));
        if (mobileArchiveBtn) mobileArchiveBtn.addEventListener('click', this.showArchive.bind(this));
        
        // Plugins modal
        const closePlugins = document.getElementById('closePlugins');
        const pluginsBtn = document.getElementById('pluginsBtn');
        const mobilePluginsBtn = document.getElementById('mobilePluginsBtn');
        
        if (closePlugins) closePlugins.addEventListener('click', this.hidePlugins.bind(this));
        if (pluginsBtn) pluginsBtn.addEventListener('click', this.showPlugins.bind(this));
        if (mobilePluginsBtn) mobilePluginsBtn.addEventListener('click', this.showPlugins.bind(this));
        
        // Mobile menu
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const closeMobileMenu = document.getElementById('closeMobileMenu');
        
        if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', this.openMobileSidebar.bind(this));
        if (closeMobileMenu) closeMobileMenu.addEventListener('click', this.closeMobileSidebar.bind(this));
        if (Elements.mobileOverlay) Elements.mobileOverlay.addEventListener('click', this.closeMobileSidebar.bind(this));
        
        // Chat menu
        const chatMenuBtn = document.getElementById('chatMenuBtn');
        if (chatMenuBtn) chatMenuBtn.addEventListener('click', this.toggleChatDropdown.bind(this));
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#chatMenuBtn') && !e.target.closest('#chatDropdown')) {
                this.hideChatDropdown();
            }
        });
        
        // Message input auto-resize
        if (Elements.messageInput) {
            Elements.messageInput.addEventListener('input', () => {
                Utils.autoResize(Elements.messageInput);
            });
        }
    }
};
