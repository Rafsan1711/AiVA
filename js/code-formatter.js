// Code Formatter and Syntax Highlighter

const CodeFormatter = {
    // Language detection patterns
    languagePatterns: {
        javascript: /^(javascript|js)$/i,
        typescript: /^(typescript|ts)$/i,
        python: /^(python|py)$/i,
        java: /^java$/i,
        cpp: /^(c\+\+|cpp|cxx)$/i,
        c: /^c$/i,
        csharp: /^(c#|csharp|cs)$/i,
        html: /^(html|htm)$/i,
        css: /^css$/i,
        sql: /^sql$/i,
        php: /^php$/i,
        ruby: /^(ruby|rb)$/i,
        go: /^(go|golang)$/i,
        rust: /^rust$/i,
        kotlin: /^kotlin$/i,
        swift: /^swift$/i,
        dart: /^dart$/i,
        bash: /^(bash|sh|shell)$/i,
        json: /^json$/i,
        xml: /^xml$/i,
        yaml: /^(yaml|yml)$/i,
        markdown: /^(markdown|md)$/i
    },

    // Language-specific Prism.js components mapping
    prismComponents: {
        javascript: ['clike', 'javascript'],
        typescript: ['clike', 'javascript', 'typescript'],
        python: ['python'],
        java: ['clike', 'java'],
        cpp: ['clike', 'cpp'],
        c: ['clike', 'c'],
        csharp: ['clike', 'csharp'],
        html: ['markup'],
        css: ['css'],
        sql: ['sql'],
        php: ['markup', 'php'],
        ruby: ['ruby'],
        go: ['go'],
        rust: ['rust'],
        kotlin: ['clike', 'java', 'kotlin'],
        swift: ['swift'],
        dart: ['dart'],
        bash: ['bash'],
        json: ['json'],
        xml: ['markup'],
        yaml: ['yaml'],
        markdown: ['markdown']
    },

    // Loaded components cache
    loadedComponents: new Set(['core', 'markup']),

    // Parse code blocks from AI response
    parseCodeBlocks: function(text) {
        const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
        const inlineCodeRegex = /`([^`]+)`/g;
        let result = text;
        
        // Replace code blocks
        result = result.replace(codeBlockRegex, (match, language, code) => {
            const lang = language || 'text';
            const placeholder = `__CODE_BLOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}__`;
            
            // Store for later processing
            this.queueCodeBlock({
                placeholder,
                language: lang,
                code: code.trim(),
                isBlock: true
            });
            
            return placeholder;
        });

        // Replace inline code
        result = result.replace(inlineCodeRegex, (match, code) => {
            return `<code class="inline-code bg-gray-700 px-2 py-1 rounded text-sm font-mono">${this.escapeHtml(code)}</code>`;
        });

        return result;
    },

    // Queue for processing code blocks
    codeBlockQueue: [],

    // Add code block to processing queue
    queueCodeBlock: function(blockData) {
        this.codeBlockQueue.push(blockData);
    },

    // Process queued code blocks
    processQueuedCodeBlocks: async function(container) {
        for (const blockData of this.codeBlockQueue) {
            await this.replaceCodeBlockPlaceholder(container, blockData);
        }
        this.codeBlockQueue = [];
    },

    // Replace placeholder with formatted code block
    replaceCodeBlockPlaceholder: async function(container, blockData) {
        const placeholder = container.querySelector(`*:contains("${blockData.placeholder}")`);
        if (!placeholder) return;

        // Load required Prism components
        await this.loadPrismLanguage(blockData.language);

        // Create code block HTML
        const codeBlockHTML = this.createCodeBlock(
            blockData.code, 
            blockData.language, 
            blockData.isBlock
        );

        // Replace placeholder
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = placeholder.innerHTML.replace(blockData.placeholder, codeBlockHTML);
        placeholder.innerHTML = tempDiv.innerHTML;

        // Highlight syntax
        this.highlightCodeBlock(placeholder);
    },

    // Create formatted code block HTML
    createCodeBlock: function(code, language, isBlock = true) {
        if (!isBlock) {
            return `<code class="inline-code">${this.escapeHtml(code)}</code>`;
        }

        const escapedCode = this.escapeHtml(code);
        const detectedLang = this.detectLanguage(language);
        const displayLang = this.getLanguageDisplayName(detectedLang);
        const uniqueId = `code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        return `
            <div class="code-container" data-code-id="${uniqueId}">
                <div class="code-header">
                    <span class="code-language">${displayLang}</span>
                    <button class="copy-code-btn" onclick="CodeFormatter.copyCode('${uniqueId}')">
                        📋 Copy
                    </button>
                </div>
                <div class="code-content">
                    <pre class="line-numbers"><code class="language-${detectedLang}" data-code="${uniqueId}">${escapedCode}</code></pre>
                </div>
            </div>
        `;
    },

    // Detect programming language
    detectLanguage: function(lang) {
        const normalized = lang.toLowerCase().trim();
        
        for (const [key, pattern] of Object.entries(this.languagePatterns)) {
            if (pattern.test(normalized)) {
                return key;
            }
        }

        // Check for common variations
        const commonMappings = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'cpp': 'cpp',
            'c++': 'cpp',
            'cs': 'csharp',
            'c#': 'csharp',
            'sh': 'bash',
            'yml': 'yaml',
            'md': 'markdown'
        };

        return commonMappings[normalized] || 'text';
    },

    // Get display name for language
    getLanguageDisplayName: function(lang) {
        const displayNames = {
            javascript: 'JavaScript',
            typescript: 'TypeScript',
            python: 'Python',
            java: 'Java',
            cpp: 'C++',
            c: 'C',
            csharp: 'C#',
            html: 'HTML',
            css: 'CSS',
            sql: 'SQL',
            php: 'PHP',
            ruby: 'Ruby',
            go: 'Go',
            rust: 'Rust',
            kotlin: 'Kotlin',
            swift: 'Swift',
            dart: 'Dart',
            bash: 'Bash',
            json: 'JSON',
            xml: 'XML',
            yaml: 'YAML',
            markdown: 'Markdown',
            text: 'Text'
        };

        return displayNames[lang] || lang.toUpperCase();
    },

    // Load Prism.js language components
    loadPrismLanguage: async function(language) {
        const components = this.prismComponents[language] || [];
        
        for (const component of components) {
            if (!this.loadedComponents.has(component)) {
                await this.loadPrismComponent(component);
                this.loadedComponents.add(component);
            }
        }
    },

    // Load individual Prism component
    loadPrismComponent: function(component) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://cdnjs.cloudflare.com/ajax/libs/prism/9000.0.1/components/prism-${component}.min.js`;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    // Highlight code blocks in container
    highlightCodeBlock: function(container) {
        const codeElements = container.querySelectorAll('code[class*="language-"]');
        codeElements.forEach(codeElement => {
            if (typeof Prism !== 'undefined') {
                Prism.highlightElement(codeElement);
            }
        });
    },

    // Copy code to clipboard
    copyCode: async function(codeId) {
        const codeContainer = document.querySelector(`[data-code-id="${codeId}"]`);
        if (!codeContainer) return;

        const codeElement = codeContainer.querySelector('code');
        if (!codeElement) return;

        const code = codeElement.textContent;
        const copyBtn = codeContainer.querySelector('.copy-code-btn');

        try {
            await navigator.clipboard.writeText(code);
            
            // Visual feedback
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '✅ Copied!';
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.classList.remove('copied');
            }, 2000);
            
        } catch (err) {
            console.error('Failed to copy code:', err);
            
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            copyBtn.innerHTML = '✅ Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = '📋 Copy';
            }, 2000);
        }
    },

    // Escape HTML entities
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Format text with enhanced markdown-like parsing
    formatText: function(text) {
        // Parse code blocks first
        text = this.parseCodeBlocks(text);

        // Bold text
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Italic text  
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        // Headers
        text = text.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
        text = text.replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>');
        text = text.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>');

        // Lists
        text = text.replace(/^\- (.+)$/gm, '<li class="ml-4">• $1</li>');
        text = text.replace(/^\d+\. (.+)$/gm, '<li class="ml-4">$1</li>');

        // Line breaks and paragraphs
        text = text.replace(/\n\s*\n/g, '</p><hr class="my-4 opacity-30"><p>');
        text = text.replace(/\n/g, '<br>');

        // Wrap in paragraph if not already wrapped
        if (!text.includes('<p>') && !text.includes('<h') && !text.includes('<div>')) {
            text = '<p>' + text + '</p>';
        }

        return text;
    },

    // Check if text contains code blocks
    hasCodeBlocks: function(text) {
        return /```[\s\S]*?```/.test(text) || /`[^`]+`/.test(text);
    },

    // Initialize code formatter
    initialize: function() {
        // Ensure Prism is available
        if (typeof Prism !== 'undefined') {
            console.log('Code formatter initialized with Prism.js');
        } else {
            console.warn('Prism.js not loaded, code highlighting disabled');
        }
    }
};

// Global function for copying code (called from HTML)
window.CodeFormatter = CodeFormatter;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    CodeFormatter.initialize();
});

// Utility function to find text content
Element.prototype.contains = function(text) {
    return this.textContent.includes(text);
};
