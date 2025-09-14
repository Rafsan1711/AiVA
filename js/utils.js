// Utility Functions

const Utils = {
    // Generate unique chat ID
    generateChatId: function() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    // Format message with markdown-like syntax
    formatMessage: function(content) {
        content = content.replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-2 py-1 rounded text-sm">$1</code>');
        content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        content = content.replace(/\n/g, '<br>');
        
        content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<div class="code-block"><pre><code>${this.escapeHtml(code.trim())}</code></pre></div>`;
        });

        return content;
    },
    
    // Escape HTML entities
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Get text from event (for chess engine)
    textFromEvent: function(ev) {
        const d = (ev && ev.data !== undefined) ? ev.data : ev;
        if (typeof d === 'string') return d;
        try { 
            return '' + d; 
        } catch (e) { 
            return String(d); 
        }
    },
    
    // Auto-resize textarea
    autoResize: function(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 128) + 'px';
    },
    
    // Show/hide elements
    show: function(element) {
        if (element) element.classList.remove('hidden');
    },
    
    hide: function(element) {
        if (element) element.classList.add('hidden');
    },
    
    // Toggle element visibility
    toggle: function(element) {
        if (element) element.classList.toggle('hidden');
    },
    
    // Add CSS class
    addClass: function(element, className) {
        if (element) element.classList.add(className);
    },
    
    // Remove CSS class
    removeClass: function(element, className) {
        if (element) element.classList.remove(className);
    },
    
    // Toggle CSS class
    toggleClass: function(element, className) {
        if (element) element.classList.toggle(className);
    },
    
    // Format date for display
    formatDate: function(timestamp) {
        return new Date(timestamp).toLocaleDateString();
    },
    
    // Format time for display
    formatTime: function(timestamp = null) {
        return new Date(timestamp || Date.now()).toLocaleTimeString();
    },
    
    // Debounce function
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Deep clone object
    deepClone: function(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    
    // Check if object is empty
    isEmpty: function(obj) {
        return Object.keys(obj).length === 0;
    },
    
    // Truncate text
    truncate: function(text, length = 50) {
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    },
    
    // Wait for specified time
    sleep: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // Get user initials from name or email
    getUserInitials: function(nameOrEmail) {
        if (!nameOrEmail) return 'U';
        
        const name = nameOrEmail.split('@')[0]; // Remove email domain if present
        const parts = name.split(/[\s.]+/);
        
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        } else {
            return parts[0][0].toUpperCase();
        }
    },
    
    // Scroll element to bottom
    scrollToBottom: function(element) {
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    },
    
    // Check if user agent is mobile
    isMobile: function() {
        return /Mobi|Android/i.test(navigator.userAgent) || (window.innerWidth && window.innerWidth < 720);
    },
    
    // Get hardware concurrency
    getHardwareConcurrency: function() {
        return navigator.hardwareConcurrency || 2;
    },
    
    // Create event listener with cleanup
    addEventListenerWithCleanup: function(element, event, handler) {
        if (element) {
            element.addEventListener(event, handler);
            return () => element.removeEventListener(event, handler);
        }
        return () => {};
    }
};
