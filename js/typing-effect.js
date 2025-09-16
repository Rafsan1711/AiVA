// Typing Effect for AI Messages - Fixed Complete Version

const TypingEffect = {
    // Active typing instances
    activeTypers: new Map(),
    
    // Default configuration
    defaultConfig: {
        speed: 25, // Characters per second
        minDelay: 10, // Minimum delay between characters (ms)
        maxDelay: 50, // Maximum delay between characters (ms)
        pauseOnPunctuation: true, // Pause longer on punctuation
        punctuationDelay: 200, // Extra delay after punctuation
        wordDelay: 100, // Extra delay after words
        showCursor: true, // Show typing cursor
        cursorChar: '|',
        cursorBlinkSpeed: 500 // Cursor blink speed (ms)
    },

    // Create typing animation for AI message
    typeMessage: function(content, container, config = {}) {
        const settings = { ...this.defaultConfig, ...config };
        const typerId = `typer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Check if content has code blocks
        const hasCode = content.includes('```') || content.includes('`');
        
        // Create message container
        const messageDiv = document.createElement('div');
        messageDiv.className = 'ai-message fade-in';
        messageDiv.innerHTML = `
            <div class="ai-message-content">
                <div class="typing-content" id="${typerId}"></div>
                ${settings.showCursor ? `<span class="typing-cursor" id="${typerId}_cursor"></span>` : ''}
            </div>
            <div class="text-xs opacity-70 mt-2">${Utils.formatTime()}</div>
        `;

        // Clear welcome message if exists
        const welcomeMsg = container.querySelector('.text-center');
        if (welcomeMsg) welcomeMsg.remove();

        container.appendChild(messageDiv);
        UIManager.scrollMessagesToBottom();

        // Start typing animation
        this.startTyping(typerId, content, settings);

        return typerId;
    },

    // Start typing animation
    startTyping: function(typerId, content, config) {
        const contentElement = document.getElementById(typerId);
        const cursorElement = document.getElementById(`${typerId}_cursor`);
        
        if (!contentElement) return;

        // Start cursor blinking
        if (cursorElement && config.showCursor) {
            this.startCursorBlink(cursorElement, config.cursorBlinkSpeed);
        }

        // Create typing instance
        const typer = {
            id: typerId,
            content: content,
            currentIndex: 0,
            config: config,
            isComplete: false,
            isPaused: false,
            element: contentElement,
            cursorElement: cursorElement
        };

        this.activeTypers.set(typerId, typer);

        // Start typing loop
        this.typeNextCharacter(typerId);
    },

    // Type next character
    typeNextCharacter: function(typerId) {
        const typer = this.activeTypers.get(typerId);
        if (!typer || typer.isComplete || typer.isPaused) return;

        const { content, currentIndex, config, element } = typer;
        
        if (currentIndex >= content.length) {
            this.completeTyping(typerId);
            return;
        }

        // Get current character
        const char = content[currentIndex];
        
        // Add character to content
        const currentContent = element.textContent + char;
        element.textContent = currentContent;
        typer.currentIndex++;

        // Calculate delay for next character
        let delay = this.getRandomDelay(config.minDelay, config.maxDelay);

        // Add extra delay for punctuation
        if (config.pauseOnPunctuation && this.isPunctuation(char)) {
            delay += config.punctuationDelay;
        }

        // Add extra delay for spaces (word boundaries)
        if (char === ' ') {
            delay += config.wordDelay;
        }

        // Scroll to bottom during typing
        UIManager.scrollMessagesToBottom();

        // Schedule next character
        setTimeout(() => this.typeNextCharacter(typerId), delay);
    },

    // Complete typing animation
    completeTyping: function(typerId) {
        const typer = this.activeTypers.get(typerId);
        if (!typer) return;

        typer.isComplete = true;

        // Hide cursor
        if (typer.cursorElement) {
            typer.cursorElement.style.display = 'none';
        }

        // Process the final content for formatting
        const finalContent = Utils.formatMessage(typer.content);
        typer.element.innerHTML = finalContent;

        // Final scroll
        UIManager.scrollMessagesToBottom();

        // Clean up
        this.activeTypers.delete(typerId);
    },

    // Start cursor blinking animation
    startCursorBlink: function(cursorElement, speed) {
        if (!cursorElement) return;

        cursorElement.innerHTML = '|';
        cursorElement.style.animation = `blink ${speed}ms infinite`;
    },

    // Get random delay between min and max
    getRandomDelay: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Check if character is punctuation
    isPunctuation: function(char) {
        const punctuation = '.!?;:,';
        return punctuation.includes(char);
    },

    // Estimate typing duration
    estimateTypingDuration: function(content, config) {
        const textLength = content.length;
        const avgDelay = (config.minDelay + config.maxDelay) / 2;
        return textLength * avgDelay;
    },

    // Stop all typing animations
    stopAllTyping: function() {
        for (const [typerId] of this.activeTypers) {
            this.skipTyping(typerId);
        }
    },

    // Skip typing and show complete content
    skipTyping: function(typerId) {
        const typer = this.activeTypers.get(typerId);
        if (!typer) return;

        // Set full content immediately
        const finalContent = Utils.formatMessage(typer.content);
        typer.element.innerHTML = finalContent;
        this.completeTyping(typerId);
    }
};

// Continue functionality
const ContinueHandler = {
    // Check if message needs continue functionality
    needsContinue: function(content) {
        const continueIndicators = [
            'continue',
            'continued...',
            '...',
            'to be continued',
            'more...'
        ];
        
        const lowerContent = content.toLowerCase();
        return continueIndicators.some(indicator => lowerContent.includes(indicator));
    },

    // Add continue button to message
    addContinueButton: function(messageContainer, conversationHistory) {
        const continueBtn = document.createElement('button');
        continueBtn.className = 'continue-btn';
        continueBtn.innerHTML = '▶️ Continue';
        continueBtn.onclick = () => this.handleContinue(conversationHistory, continueBtn);
        
        messageContainer.appendChild(continueBtn);
        return continueBtn;
    },

    // Handle continue request
    handleContinue: async function(conversationHistory, button) {
        button.disabled = true;
        button.innerHTML = '⏳ Continuing...';

        try {
            // Add continue message
            conversationHistory.push({ role: 'user', content: 'continue' });

            // Send continue request
            const response = await MessageManager.sendContinueRequest(conversationHistory);
            
            if (response) {
                // Add new response
                MessageManager.addAIMessage(response);
                button.remove();
            } else {
                button.disabled = false;
                button.innerHTML = '❌ Error - Try Again';
            }
        } catch (error) {
            console.error('Continue error:', error);
            button.disabled = false;
            button.innerHTML = '❌ Error - Try Again';
        }
    }
};

// Visualization handler (simple version)
const VisualizationHandler = {
    // Detect and create visualizations
    detectAndCreateVisualizations: function(text) {
        // Simple implementation - can be expanded
        return [];
    },

    // Create chart placeholder
    createChart: function(data, type = 'bar', title = '') {
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        chartContainer.innerHTML = `<div class="chart-title">${title}</div><p>Chart functionality available</p>`;
        return chartContainer;
    }
};

// Export for global access
window.TypingEffect = TypingEffect;
window.ContinueHandler = ContinueHandler;
window.VisualizationHandler = VisualizationHandler;
