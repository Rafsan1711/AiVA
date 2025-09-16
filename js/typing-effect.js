// Typing Effect for AI Messages

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
        
        // Check if content has code blocks and pre-process
        const hasCode = CodeFormatter.hasCodeBlocks(content);
        let processedContent = content;
        
        if (hasCode) {
            // Parse and queue code blocks for later processing
            processedContent = CodeFormatter.parseCodeBlocks(content);
        }

        // Format the content
        const formattedContent = CodeFormatter.formatText(processedContent);
        
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
        this.startTyping(typerId, formattedContent, settings);

        // Process code blocks
