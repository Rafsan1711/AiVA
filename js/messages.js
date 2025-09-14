// Message Management

const MessageManager = {
    // Send message
    sendMessage: async function() {
        const message = Elements.messageInput.value.trim();
        if (!message || AppState.messageCount >= MAX_MESSAGES_PER_CHAT) return;

        // Disable input
        UIManager.disableInput();

        // Add user message
        this.addMessage(message, 'user');
        UIManager.clearInput();
        AppState.messageCount++;
        UIManager.updateMessageCount(AppState.messageCount);

        // Add to conversation history
        AppState.conversationHistory.push({ role: 'user', content: message });

        // Handle chess conversation
        if (AppState.isChessConversation) {
            await this.handleChessMessage(message);
        } else {
            await this.handleRegularMessage();
        }

        // Re-enable input if under limit
        if (AppState.messageCount < MAX_MESSAGES_PER_CHAT) {
            UIManager.enableInput();
        }
    },

    // Handle chess-specific messages
    handleChessMessage: async function(message) {
        const lowerMessage = message.toLowerCase();
        
        // Check if user wants to play chess
        if (lowerMessage.includes('yes') || lowerMessage.includes('play') || lowerMessage.includes('start') || lowerMessage.includes('game')) {
            this.showTypingIndicator();
            await Utils.sleep(1000);
            this.hideTypingIndicator();
            
            const chessHTML = ChessPlugin.createChessBoard();
            this.addMessage("Excellent! Let's start our chess match. You're playing as white, so you make the first move. Click and drag the pieces or click to select and then click the destination square. Good luck!", 'assistant', chessHTML);
            
            // Add to conversation history
            AppState.conversationHistory.push({ role: 'assistant', content: "Let's play chess! You're white, make your move." });
            ChatManager.saveChatToHistory();
            return;
        }

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Prepare chess-specific system prompt
            const systemPrompt = {
                role: "system",
                content: `You are Chess Master, an enthusiastic chess AI. You love chess and are always encouraging players. You can discuss chess strategies, famous games, and provide tips. You often ask if users want to play chess games with you. When users seem interested in chess, encourage them to play a match. Be friendly and supportive about chess gameplay.`
            };

            const messagesToSend = [systemPrompt, ...AppState.conversationHistory];

            // Send to AI
            const response = await fetch(`${SERVER_BASE}/api/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: messagesToSend,
                    max_tokens: 2048,
                    temperature: 0.8
                })
            });

            const data = await response.json();
            this.hideTypingIndicator();

            if (data.replyText) {
                this.addMessage(data.replyText, 'assistant');
                AppState.conversationHistory.push({ role: 'assistant', content: data.replyText });
                ChatManager.saveChatToHistory();
            } else {
                this.addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('Sorry, I cannot connect to the AI service right now. Please check your connection and try again.', 'assistant');
            console.error('AI query error:', error);
        }
    },

    // Handle regular messages
    handleRegularMessage: async function() {
        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Check if chess plugin is enabled and message is chess-related
            let systemPrompt = {
                role: "system",
                content: "You are AiVA, a helpful AI assistant. Maintain conversational context and provide detailed, helpful responses. Remember previous messages in this conversation."
            };

            if (AppState.enabledPlugins.chess) {
                const message = AppState.conversationHistory[AppState.conversationHistory.length - 1].content.toLowerCase();
                if (message.includes('chess') || message.includes('game') || message.includes('play')) {
                    systemPrompt.content += " You have access to a chess plugin. When users show interest in chess, ask them if they'd like to play a chess match with you.";
                }
            }

            const messagesToSend = [systemPrompt, ...AppState.conversationHistory];

            // Send to AI
            const response = await fetch(`${SERVER_BASE}/api/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: messagesToSend,
                    max_tokens: 2048,
                    temperature: 0.7
                })
            });

            const data = await response.json();
            this.hideTypingIndicator();

            if (data.replyText) {
                this.addMessage(data.replyText, 'assistant');
                AppState.conversationHistory.push({ role: 'assistant', content: data.replyText });
                ChatManager.saveChatToHistory();
            } else {
                this.addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('Sorry, I cannot connect to the AI service right now. Please check your connection and try again.', 'assistant');
            console.error('AI query error:', error);
        }
    },

    // Add message to UI
    addMessage: function(content, sender, htmlContent = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `fade-in ${sender === 'user' ? 'flex justify-end' : 'flex justify-start'}`;
        
        const isUser = sender === 'user';
        const bgColor = isUser ? 'bg-blue-600' : 'bg-gray-700';
        const alignment = isUser ? 'ml-12' : 'mr-12';

        // Process content for code blocks and formatting
        const processedContent = htmlContent || Utils.formatMessage(content);

        messageDiv.innerHTML = `
            <div class="${bgColor} ${alignment} p-3 rounded-lg max-w-full">
                <div class="text-sm">${processedContent}</div>
                <div class="text-xs opacity-70 mt-1">${Utils.formatTime()}</div>
            </div>
        `;

        // Clear welcome message if it exists
        const welcomeMsg = Elements.messagesContainer.querySelector('.text-center');
        if (welcomeMsg) welcomeMsg.remove();

        Elements.messagesContainer.appendChild(messageDiv);
        UIManager.scrollMessagesToBottom();
    },

    // Show typing indicator
    showTypingIndicator: function() {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typingIndicator';
        typingDiv.className = 'flex justify-start fade-in';
        typingDiv.innerHTML = `
            <div class="bg-gray-700 mr-12 p-3 rounded-lg">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        Elements.messagesContainer.appendChild(typingDiv);
        UIManager.scrollMessagesToBottom();
    },

    // Hide typing indicator
    hideTypingIndicator: function() {
        const typing = document.getElementById('typingIndicator');
        if (typing) typing.remove();
    },

    // Initialize message event listeners
    initEventListeners: function() {
        // Send button
        if (Elements.sendBtn) {
            Elements.sendBtn.addEventListener('click', this.sendMessage.bind(this));
        }

        // Message input - Enter key
        if (Elements.messageInput) {
            Elements.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    }
};
