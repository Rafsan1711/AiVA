// Storage Management

const StorageManager = {
    // Keys for localStorage
    KEYS: {
        TERMS_ACCEPTED: 'aivaTermsAccepted',
        ARCHIVED_CHATS: 'aivaArchivedChats',
        ENABLED_PLUGINS: 'aivaEnabledPlugins'
    },
    
    // Save data to localStorage
    save: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    },
    
    // Load data from localStorage
    load: function(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return defaultValue;
        }
    },
    
    // Remove data from localStorage
    remove: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Failed to remove from localStorage:', error);
            return false;
        }
    },
    
    // Clear all app data from localStorage
    clearAll: function() {
        Object.values(this.KEYS).forEach(key => {
            this.remove(key);
        });
    },
    
    // Save terms acceptance
    saveTermsAccepted: function() {
        return this.save(this.KEYS.TERMS_ACCEPTED, true);
    },
    
    // Check if terms are accepted
    hasAcceptedTerms: function() {
        return this.load(this.KEYS.TERMS_ACCEPTED, false);
    },
    
    // Save archived chats
    saveArchivedChats: function(archivedChats) {
        return this.save(this.KEYS.ARCHIVED_CHATS, archivedChats);
    },
    
    // Load archived chats
    loadArchivedChats: function() {
        return this.load(this.KEYS.ARCHIVED_CHATS, {});
    },
    
    // Save enabled plugins
    saveEnabledPlugins: function(enabledPlugins) {
        return this.save(this.KEYS.ENABLED_PLUGINS, enabledPlugins);
    },
    
    // Load enabled plugins
    loadEnabledPlugins: function() {
        return this.load(this.KEYS.ENABLED_PLUGINS, {});
    }
};

const ArchiveManager = {
    // Update archived chats UI
    updateArchivedChatsUI: function() {
        const archivedContainer = Elements.archivedChats;
        archivedContainer.innerHTML = '';

        const archived = Object.values(AppState.archivedChats)
            .sort((a, b) => b.timestamp - a.timestamp);

        if (archived.length === 0) {
            archivedContainer.innerHTML = '<p class="text-gray-400 text-center">No archived chats</p>';
            return;
        }

        archived.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'p-3 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors bg-gray-800';
            
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
                    <div class="flex gap-2">
                        <button onclick="ArchiveManager.unarchiveChat('${chat.id}')" class="text-blue-400 hover:text-blue-300">Restore</button>
                        <button onclick="ArchiveManager.deleteArchivedChat('${chat.id}')" class="text-red-400 hover:text-red-300">Delete</button>
                    </div>
                </div>
            `;
            
            archivedContainer.appendChild(chatItem);
        });
    },
    
    // Unarchive chat
    unarchiveChat: function(chatId) {
        if (AppState.archivedChats[chatId]) {
            AppState.chatHistoryData[chatId] = AppState.archivedChats[chatId];
            delete AppState.archivedChats[chatId];
            AppState.saveToStorage();
            ChatManager.updateChatHistoryUI();
            this.updateArchivedChatsUI();
            
            if (AppState.currentUser) {
                database.ref(`chats/${AppState.currentUser.uid}/${chatId}`).set(AppState.chatHistoryData[chatId]);
            }
        }
    },
    
    // Delete archived chat
    deleteArchivedChat: function(chatId) {
        if (confirm('Are you sure you want to permanently delete this chat?')) {
            delete AppState.archivedChats[chatId];
            AppState.saveToStorage();
            this.updateArchivedChatsUI();
        }
    }
};

const PluginManager = {
    // Toggle plugin state
    togglePlugin: function(pluginName) {
        if (AppState.enabledPlugins[pluginName]) {
            AppState.enabledPlugins[pluginName] = false;
            delete AppState.enabledPlugins[pluginName];
            document.getElementById(`${pluginName}Badge`).textContent = 'Disabled';
            document.getElementById(`${pluginName}Badge`).className = 'plugin-disabled-badge';
            document.getElementById(`${pluginName}Plugin`).classList.remove('enabled');
            document.getElementById(`${pluginName}ToggleText`).textContent = 'Enable Plugin';
        } else {
            AppState.enabledPlugins[pluginName] = true;
            document.getElementById(`${pluginName}Badge`).textContent = 'Enabled';
            document.getElementById(`${pluginName}Badge`).className = 'plugin-enabled-badge';
            document.getElementById(`${pluginName}Plugin`).classList.add('enabled');
            document.getElementById(`${pluginName}ToggleText`).textContent = 'Disable Plugin';
            
            if (pluginName === 'chess') {
                ChessPlugin.initialize();
            }
        }
        
        AppState.saveToStorage();
        this.updateEnabledPluginsUI();
    },
    
    // Update enabled plugins UI
    updateEnabledPluginsUI: function() {
        // Update plugin status on load
        if (AppState.enabledPlugins.chess) {
            const chessBadge = document.getElementById('chessBadge');
            const chessPlugin = document.getElementById('chessPlugin');
            const chessToggleText = document.getElementById('chessToggleText');
            
            if (chessBadge) {
                chessBadge.textContent = 'Enabled';
                chessBadge.className = 'plugin-enabled-badge';
            }
            if (chessPlugin) chessPlugin.classList.add('enabled');
            if (chessToggleText) chessToggleText.textContent = 'Disable Plugin';
        }

        // Update enabled plugins list in sidebar
        const enabledList = Elements.enabledPlugins;
        const mobileEnabledList = Elements.mobileEnabledPlugins;
        
        if (enabledList) enabledList.innerHTML = '';
        if (mobileEnabledList) mobileEnabledList.innerHTML = '';
        
        Object.keys(AppState.enabledPlugins).forEach(pluginName => {
            if (AppState.enabledPlugins[pluginName]) {
                const pluginItem = UIManager.createEnabledPluginItem(pluginName);
                const mobilePluginItem = UIManager.createEnabledPluginItem(pluginName);
                
                pluginItem.addEventListener('click', () => {
                    if (pluginName === 'chess') {
                        ChatManager.startChessConversation();
                    }
                });
                
                mobilePluginItem.addEventListener('click', () => {
                    if (pluginName === 'chess') {
                        ChatManager.startChessConversation();
                        UIManager.closeMobileSidebar();
                    }
                });
                
                if (enabledList) enabledList.appendChild(pluginItem);
                if (mobileEnabledList) mobileEnabledList.appendChild(mobilePluginItem);
            }
        });
    }
};

// Make functions globally available for onclick handlers
window.unarchiveChat = ArchiveManager.unarchiveChat.bind(ArchiveManager);
window.deleteArchivedChat = ArchiveManager.deleteArchivedChat.bind(ArchiveManager);
window.togglePlugin = PluginManager.togglePlugin.bind(PluginManager);
