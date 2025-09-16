// Enhanced Message Management with New Features

const MessageManager = {
    // Send message with limit checking
    sendMessage: async function() {
        const message = Elements.messageInput.value.trim();
        if (!message || AppState.messageCount >= MAX_MESSAGES_PER_CHAT) return;

        // Check user limits (admin plugin)
        if (AppState.currentUser) {
            const canSend = await AdminPlugin.checkMessageLimits(AppState.currentUser.email);
            if (!canSend) return;
        }

        // Disable input
        UIManager.disableInput();

        // Add user message with new styling
        this.addUserMessage(message);
        UIManager.clearInput();
        AppState.messageCount++;
        UIManager.updateMessageCount(AppState.messageCount);

        // Track usage
        if (AppState.currentUser) {
            AdminPlugin.trackUserUsage(AppState.currentUser.email, 'response');
        }

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

    // Add user message with new styling
    addUserMessage: function(content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'user-message fade-in';
        
        messageDiv.innerHTML = `
            <div class="user-message-content">
                ${Utils.formatMessage(content)}
                <div class="text-xs opacity-70 mt-1">${Utils.formatTime()}</div>
            </div>
        `;

        // Clear welcome message if exists
        const welcomeMsg = Elements.messagesContainer.querySelector('.text-center');
        if (welcomeMsg) welcomeMsg.remove();

        Elements.messagesContainer.appendChild(messageDiv);
        UIManager.scrollMessagesToBottom();
    },

    // Enhanced AI message with typing effect
    addAIMessage: function(content) {
        // Check for continue functionality
        const needsContinue = ContinueHandler.needsContinue(content);
        
        // Create typing effect
        const typerId = TypingEffect.typeMessage(content, Elements.messagesContainer, {
            speed: 30,
            pauseOnPunctuation: true,
            showCursor: true
        });

        // Add continue button if needed
        if (needsContinue) {
            setTimeout(() => {
                const messageDiv = Elements.messagesContainer.lastElementChild;
                ContinueHandler.addContinueButton(messageDiv, AppState.conversationHistory);
            }, TypingEffect.estimateTypingDuration(content, TypingEffect.defaultConfig) + 1000);
        }

        return typerId;
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
                content: `You are Chess Master, an enthusiastic chess AI. You love chess and are always encouraging players. You can discuss chess strategies, famous games, and provide tips. You often ask if users want to play chess games with you. When users seem interested in chess, encourage them to play a match. Be friendly and supportive about chess gameplay. Use emojis naturally to express excitement about chess.`
            };

            const messagesToSend = [systemPrompt, ...AppState.conversationHistory];

            // Send to AI
            const response = await this.sendToAI(messagesToSend, 'chess');
            this.hideTypingIndicator();

            if (response.replyText) {
                this.addAIMessage(response.replyText);
                AppState.conversationHistory.push({ role: 'assistant', content: response.replyText });
                ChatManager.saveChatToHistory();
            } else {
                this.addAIMessage('Sorry, I encountered an error. Please try again.');
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.addAIMessage('Sorry, I cannot connect to the AI service right now. Please check your connection and try again.');
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
                content: "You are AiVA, a helpful AI assistant. Maintain conversational context and provide detailed, helpful responses. Remember previous messages in this conversation. Format your responses with proper spacing and use emojis naturally (except face emojis). When discussing data or statistics, create visualizations if appropriate. Use horizontal lines (---) to separate different topics or sections. Make your responses more conversational and less robotic."
            };

            if (AppState.enabledPlugins.chess) {
                const message = AppState.conversationHistory[AppState.conversationHistory.length - 1].content.toLowerCase();
                if (message.includes('chess') || message.includes('game') || message.includes('play')) {
                    systemPrompt.content += " You have access to a chess plugin. When users show interest in chess, ask them if they'd like to play a chess match with you.";
                }
            }

            const messagesToSend = [systemPrompt, ...AppState.conversationHistory];

            // Send to AI
            const response = await this.sendToAI(messagesToSend, 'regular');
            this.hideTypingIndicator();

            if (response.replyText) {
                this.addAIMessage(response.replyText);
                AppState.conversationHistory.push({ role: 'assistant', content: response.replyText });
                ChatManager.saveChatToHistory();
            } else {
                this.addAIMessage('Sorry, I encountered an error. Please try again.');
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.addAIMessage('Sorry, I cannot connect to the AI service right now. Please check your connection and try again.');
            console.error('AI query error:', error);
        }
    },

    // Send request to AI with conversation type
    sendToAI: async function(messages, conversationType = 'regular') {
        const response = await fetch(`${SERVER_BASE}/api/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: messages,
                conversationType: conversationType,
                max_tokens: 3000,
                temperature: conversationType === 'chess' ? 0.8 : 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    },

    // Send continue request
    sendContinueRequest: async function(conversationHistory) {
        try {
            const response = await this.sendToAI(conversationHistory, 'regular');
            return response.replyText;
        } catch (error) {
            console.error('Continue request error:', error);
            return null;
        }
    },

    // Add message (legacy compatibility)
    addMessage: function(content, sender, htmlContent = null) {
        if (sender === 'user') {
            this.addUserMessage(content);
        } else {
            if (htmlContent) {
                // For chess board and special content
                const messageDiv = document.createElement('div');
                messageDiv.className = 'ai-message fade-in';
                
                const processedContent = Utils.formatMessage(content);
                messageDiv.innerHTML = `
                    <div class="ai-message-content">
                        <div>${processedContent}</div>
                        ${htmlContent}
                        <div class="text-xs opacity-70 mt-2">${Utils.formatTime()}</div>
                    </div>
                `;

                // Clear welcome message if exists
                const welcomeMsg = Elements.messagesContainer.querySelector('.text-center');
                if (welcomeMsg) welcomeMsg.remove();

                Elements.messagesContainer.appendChild(messageDiv);
                UIManager.scrollMessagesToBottom();
            } else {
                // Regular AI message with typing effect
                this.addAIMessage(content);
            }
        }
    },

    // Show typing indicator
    showTypingIndicator: function() {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typingIndicator';
        typingDiv.className = 'ai-message fade-in';
        typingDiv.innerHTML = `
            <div class="ai-message-content">
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

    // Process message for visualizations and enhancements
    processMessageContent: function(content) {
        // Check for data patterns that could be visualized
        const visualizations = VisualizationHandler.detectAndCreateVisualizations(content);
        
        // Format content with enhanced markdown
        let processedContent = CodeFormatter.formatText(content);
        
        // Add horizontal separators for better readability
        processedContent = processedContent.replace(/\n---\n/g, '<hr class="my-4 opacity-30">');
        
        // Process lists better
        processedContent = processedContent.replace(/^\* (.+)$/gm, '<li class="ml-4 mb-1">• $1</li>');
        processedContent = processedContent.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 mb-1 list-decimal">$1</li>');
        
        // Better paragraph spacing
        processedContent = processedContent.replace(/\n\n/g, '</p><p class="mb-4">');
        
        return {
            content: processedContent,
            visualizations: visualizations
        };
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
    },

    // Clear all messages
    clearMessages: function() {
        const messages = Elements.messagesContainer.querySelectorAll('.ai-message, .user-message');
        messages.forEach(msg => msg.remove());
    },

    // Export conversation
    exportConversation: function() {
        const messages = [];
        const messageElements = Elements.messagesContainer.querySelectorAll('.ai-message, .user-message');
        
        messageElements.forEach(el => {
            const isUser = el.classList.contains('user-message');
            const content = el.querySelector('.ai-message-content, .user-message-content').textContent.trim();
            messages.push({
                sender: isUser ? 'user' : 'assistant',
                content: content,
                timestamp: new Date().toISOString()
            });
        });

        return {
            chatId: AppState.currentChatId,
            messages: messages,
            exportedAt: new Date().toISOString()
        };
    },

    // Import conversation (for restored chats)
    importConversation: function(conversationData) {
        this.clearMessages();
        
        conversationData.messages.forEach(msg => {
            if (msg.sender === 'user') {
                this.addUserMessage(msg.content);
            } else {
                // For imported messages, don't use typing effect
                const messageDiv = document.createElement('div');
                messageDiv.className = 'ai-message fade-in';
                
                const processedContent = CodeFormatter.formatText(msg.content);
                messageDiv.innerHTML = `
                    <div class="ai-message-content">
                        ${processedContent}
                        <div class="text-xs opacity-70 mt-2">${msg.timestamp ? Utils.formatTime(new Date(msg.timestamp).getTime()) : Utils.formatTime()}</div>
                    </div>
                `;

                Elements.messagesContainer.appendChild(messageDiv);
            }
        });

        // Process any code blocks in imported messages
        setTimeout(() => {
            const codeElements = Elements.messagesContainer.querySelectorAll('code[class*="language-"]');
            codeElements.forEach(codeElement => {
                if (typeof Prism !== 'undefined') {
                    Prism.highlightElement(codeElement);
                }
            });
        }, 100);

        UIManager.scrollMessagesToBottom();
    }
};

// Enhanced message utilities
const MessageUtils = {
    // Extract code from message
    extractCode: function(messageElement) {
        const codeElements = messageElement.querySelectorAll('code');
        const codes = [];
        
        codeElements.forEach(code => {
            const language = code.className.match(/language-(\w+)/);
            codes.push({
                language: language ? language[1] : 'text',
                content: code.textContent
            });
        });
        
        return codes;
    },

    // Get message statistics
    getMessageStats: function() {
        const userMessages = Elements.messagesContainer.querySelectorAll('.user-message');
        const aiMessages = Elements.messagesContainer.querySelectorAll('.ai-message');
        const codeBlocks = Elements.messagesContainer.querySelectorAll('.code-container');
        
        return {
            userMessages: userMessages.length,
            aiMessages: aiMessages.length,
            totalMessages: userMessages.length + aiMessages.length,
            codeBlocks: codeBlocks.length,
            conversationLength: AppState.conversationHistory.length
        };
    },

    // Search messages
    searchMessages: function(query) {
        const messages = Elements.messagesContainer.querySelectorAll('.ai-message, .user-message');
        const results = [];
        
        messages.forEach((message, index) => {
            const content = message.textContent.toLowerCase();
            if (content.includes(query.toLowerCase())) {
                results.push({
                    index: index,
                    element: message,
                    snippet: this.getSnippet(content, query, 100)
                });
            }
        });
        
        return results;
    },

    // Get text snippet around search term
    getSnippet: function(text, term, maxLength) {
        const index = text.toLowerCase().indexOf(term.toLowerCase());
        if (index === -1) return text.substring(0, maxLength);
        
        const start = Math.max(0, index - maxLength / 2);
        const end = Math.min(text.length, index + term.length + maxLength / 2);
        
        return text.substring(start, end);
    }
};
