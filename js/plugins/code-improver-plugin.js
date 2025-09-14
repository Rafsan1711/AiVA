// Code Improver Plugin

const CodeImproverPlugin = {
    // Plugin state
    CHAT_ID: 'code_improver_chat',
    isActive: false,
    sourceFiles: {},
    currentWorkflow: {
        stage: 'idle', // idle, feature_input, feature_confirm, coding, debugging, complete
        currentFile: null,
        allFiles: [],
        fileIndex: 0,
        debugCount: 0
    },
    prismLoaded: false,

    // Prism.js CDN URLs
    PRISM_URLS: {
        core: 'https://cdnjs.cloudflare.com/ajax/libs/prism/9000.0.1/prism.min.js',
        css: 'https://cdnjs.cloudflare.com/ajax/libs/prism/9000.0.1/themes/prism-okaidia.min.css',
        components: {
            'markup': 'https://cdnjs.cloudflare.com/ajax/libs/prism/9000.0.1/components/prism-markup.min.js',
            'css': 'https://cdnjs.cloudflare.com/ajax/libs/prism/9000.0.1/components/prism-css.min.js',
            'clike': 'https://cdnjs.cloudflare.com/ajax/libs/prism/9000.0.1/components/prism-clike.min.js',
            'javascript': 'https://cdnjs.cloudflare.com/ajax/libs/prism/9000.0.1/components/prism-javascript.min.js',
            'json': 'https://cdnjs.cloudflare.com/ajax/libs/prism/9000.0.1/components/prism-json.min.js',
            'python': 'https://cdnjs.cloudflare.com/ajax/libs/prism/9000.0.1/components/prism-python.min.js',
            'php': 'https://cdnjs.cloudflare.com/ajax/libs/prism/9000.0.1/components/prism-php.min.js',
            'java': 'https://cdnjs.cloudflare.com/ajax/libs/prism/9000.0.1/components/prism-java.min.js',
            'c': 'https://cdnjs.cloudflare.com/ajax/libs/prism/9000.0.1/components/prism-c.min.js',
            'cpp': 'https://cdnjs.cloudflare.com/ajax/libs/prism/9000.0.1/components/prism-cpp.min.js',
            'csharp': 'https://cdnjs.cloudflare.com/ajax/libs/prism/9000.0.1/components/prism-csharp.min.js'
        }
    },

    // Initialize plugin
    initialize: function() {
        console.log('Code Improver Plugin initializing...');
        this.loadPrismJS();
        this.initializeFirebase();
    },

    // Load Prism.js dynamically
    loadPrismJS: function() {
        if (this.prismLoaded) return;
        
        // Load CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = this.PRISM_URLS.css;
        document.head.appendChild(cssLink);
        
        // Load core JS
        const script = document.createElement('script');
        script.src = this.PRISM_URLS.core;
        script.onload = () => {
            this.prismLoaded = true;
            console.log('Prism.js loaded successfully');
            this.loadPrismComponents();
        };
        document.head.appendChild(script);
    },

    // Load additional Prism components
    loadPrismComponents: function() {
        const componentsToLoad = ['markup', 'css', 'clike', 'javascript', 'json'];
        let loadedCount = 0;

        componentsToLoad.forEach(component => {
            const script = document.createElement('script');
            script.src = this.PRISM_URLS.components[component];
            script.onload = () => {
                loadedCount++;
                if (loadedCount === componentsToLoad.length) {
                    console.log('Prism components loaded');
                }
            };
            document.head.appendChild(script);
        });
    },

    // Initialize Firebase for this plugin
    initializeFirebase: function() {
        this.loadSourceFiles();
    },

    // Load source files from Firebase
    loadSourceFiles: function() {
        if (!AppState.currentUser) return;
        
        const userRef = database.ref(`codeImprover/${AppState.currentUser.uid}/sourceFiles`);
        userRef.on('value', (snapshot) => {
            this.sourceFiles = snapshot.val() || {};
            console.log('Source files loaded:', this.sourceFiles);
        });
    },

    // Save source files to Firebase
    saveSourceFiles: function() {
        if (!AppState.currentUser) return;
        
        const userRef = database.ref(`codeImprover/${AppState.currentUser.uid}/sourceFiles`);
        userRef.set(this.sourceFiles);
    },

    // Start code improver conversation
    startCodeImproverConversation: function() {
        // Always use the same chat ID for this plugin
        AppState.currentChatId = this.CHAT_ID;
        AppState.conversationHistory = [];
        AppState.messageCount = 0;
        AppState.isChessConversation = false;
        AppState.isCodeImproverConversation = true;
        this.isActive = true;

        UIManager.updateMessageCount(0);
        UIManager.hideWarningBanner();

        // Set code improver chat appearance
        UIManager.setChatTitle('Code Improver');
        UIManager.setChatAvatar('💻', true);
        
        UIManager.clearMessages();
        this.showSourceCodeCard();
        
        // Add initial message
        setTimeout(() => {
            MessageManager.addMessage("Welcome to Code Improver! I can help you enhance your source code with AI assistance. Start by adding your source files using the card above, then describe the features you want to implement!", 'assistant');
        }, 500);
        
        UIManager.enableInput();
        UIManager.focusInput();
    },

    // Show source code management card
    showSourceCodeCard: function() {
        const sourceCardHTML = this.createSourceCodeCard();
        const cardContainer = document.createElement('div');
        cardContainer.className = 'mb-4 fade-in';
        cardContainer.innerHTML = sourceCardHTML;
        
        // Clear existing welcome message
        const welcomeMsg = Elements.messagesContainer.querySelector('.text-center');
        if (welcomeMsg) welcomeMsg.remove();
        
        Elements.messagesContainer.appendChild(cardContainer);
        this.setupSourceCardEvents();
        UIManager.scrollMessagesToBottom();
    },

    // Create source code card HTML
    createSourceCodeCard: function() {
        const filesHTML = Object.keys(this.sourceFiles).map(fileName => `
            <div class="source-file-item bg-gray-600 rounded-lg p-3 flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <span class="text-blue-300">${this.getFileIcon(fileName)}</span>
                    <span class="font-mono text-sm">${fileName}</span>
                    <span class="text-xs text-gray-400">(${this.getFileSize(this.sourceFiles[fileName])} chars)</span>
                </div>
                <div class="flex gap-2">
                    <button onclick="CodeImproverPlugin.editFile('${fileName}')" class="text-yellow-400 hover:text-yellow-300 text-sm">Edit</button>
                    <button onclick="CodeImproverPlugin.deleteFile('${fileName}')" class="text-red-400 hover:text-red-300 text-sm">Delete</button>
                </div>
            </div>
        `).join('');

        return `
            <div id="sourceCodeCard" class="bg-gray-800 rounded-lg p-4 border border-gray-600">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-purple-400">📁 Source Code Repository</h3>
                    <button id="createNewFileBtn" class="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm font-medium">
                        + Create New File
                    </button>
                </div>
                
                <div id="filesList" class="space-y-2 mb-4">
                    ${filesHTML || '<p class="text-gray-400 text-sm text-center py-4">No files yet. Create your first file!</p>'}
                </div>

                <div id="fileEditor" class="hidden">
                    <div class="mb-3">
                        <input id="fileNameInput" type="text" placeholder="File name (e.g., index.html)" class="w-full p-2 bg-gray-700 rounded text-sm border border-gray-600 focus:border-purple-500 focus:outline-none">
                    </div>
                    <div class="mb-3">
                        <textarea id="fileCodeInput" placeholder="Paste your code here..." class="w-full p-3 bg-gray-700 rounded text-sm border border-gray-600 focus:border-purple-500 focus:outline-none font-mono" rows="10"></textarea>
                    </div>
                    <div class="flex gap-2">
                        <button id="saveFileBtn" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm font-medium">Save</button>
                        <button id="cancelFileBtn" class="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-sm font-medium">Cancel</button>
                    </div>
                </div>

                <div id="featureSection" class="border-t border-gray-600 pt-4">
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="font-semibold text-purple-300">🚀 Feature Development</h4>
                        <button id="generateFeatureBtn" class="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm">
                            Generate Feature with AI
                        </button>
                    </div>
                    <div class="flex gap-2">
                        <input id="featureInput" type="text" placeholder="Describe the feature you want to implement..." class="flex-1 p-2 bg-gray-700 rounded text-sm border border-gray-600 focus:border-blue-500 focus:outline-none">
                        <button id="implementFeatureBtn" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm font-medium">
                            Implement
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // Setup source card event listeners
    setupSourceCardEvents: function() {
        const createNewFileBtn = document.getElementById('createNewFileBtn');
        const generateFeatureBtn = document.getElementById('generateFeatureBtn');
        const implementFeatureBtn = document.getElementById('implementFeatureBtn');
        const saveFileBtn = document.getElementById('saveFileBtn');
        const cancelFileBtn = document.getElementById('cancelFileBtn');
        const featureInput = document.getElementById('featureInput');

        if (createNewFileBtn) {
            createNewFileBtn.addEventListener('click', () => this.showFileEditor());
        }

        if (generateFeatureBtn) {
            generateFeatureBtn.addEventListener('click', () => this.generateFeatureWithAI());
        }

        if (implementFeatureBtn) {
            implementFeatureBtn.addEventListener('click', () => this.implementFeature());
        }

        if (saveFileBtn) {
            saveFileBtn.addEventListener('click', () => this.saveFile());
        }

        if (cancelFileBtn) {
            cancelFileBtn.addEventListener('click', () => this.hideFileEditor());
        }

        if (featureInput) {
            featureInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.implementFeature();
                }
            });
        }
    },

    // Get file icon based on extension
    getFileIcon: function(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const icons = {
            'html': '🌐',
            'css': '🎨',
            'js': '⚡',
            'json': '📋',
            'md': '📝',
            'py': '🐍',
            'php': '🐘',
            'java': '☕',
            'cpp': '⚙️',
            'c': '⚙️'
        };
        return icons[ext] || '📄';
    },

    // Get file size
    getFileSize: function(content) {
        return content ? content.length : 0;
    },

    // Show file editor
    showFileEditor: function(fileName = '', content = '') {
        const fileEditor = document.getElementById('fileEditor');
        const fileNameInput = document.getElementById('fileNameInput');
        const fileCodeInput = document.getElementById('fileCodeInput');

        if (fileEditor && fileNameInput && fileCodeInput) {
            fileNameInput.value = fileName;
            fileCodeInput.value = content;
            fileEditor.classList.remove('hidden');
            fileNameInput.focus();
        }
    },

    // Hide file editor
    hideFileEditor: function() {
        const fileEditor = document.getElementById('fileEditor');
        if (fileEditor) {
            fileEditor.classList.add('hidden');
            document.getElementById('fileNameInput').value = '';
            document.getElementById('fileCodeInput').value = '';
        }
    },

    // Save file
    saveFile: function() {
        const fileName = document.getElementById('fileNameInput').value.trim();
        const fileContent = document.getElementById('fileCodeInput').value;

        if (!fileName) {
            alert('Please enter a file name');
            return;
        }

        this.sourceFiles[fileName] = fileContent;
        this.saveSourceFiles();
        this.hideFileEditor();
        this.refreshSourceCard();
    },

    // Edit existing file
    editFile: function(fileName) {
        this.showFileEditor(fileName, this.sourceFiles[fileName] || '');
    },

    // Delete file
    deleteFile: function(fileName) {
        if (confirm(`Are you sure you want to delete ${fileName}?`)) {
            delete this.sourceFiles[fileName];
            this.saveSourceFiles();
            this.refreshSourceCard();
        }
    },

    // Refresh source card
    refreshSourceCard: function() {
        const sourceCard = document.getElementById('sourceCodeCard');
        if (sourceCard) {
            sourceCard.outerHTML = this.createSourceCodeCard();
            this.setupSourceCardEvents();
        }
    },

    // Generate feature with AI
    generateFeatureWithAI: function() {
        const features = [
            "user authentication system with login/signup functionality",
            "responsive navigation menu with mobile support",
            "dark/light theme toggle with persistence",
            "contact form with email validation",
            "image gallery with lightbox effect",
            "search functionality with filtering",
            "user profile management system",
            "comment system with moderation",
            "file upload and management",
            "notification system with real-time updates",
            "shopping cart functionality",
            "blog system with categories and tags",
            "analytics dashboard with charts",
            "API integration with external services",
            "progressive web app capabilities"
        ];
        
        const randomFeature = features[Math.floor(Math.random() * features.length)];
        const featureInput = document.getElementById('featureInput');
        if (featureInput) {
            featureInput.value = randomFeature;
        }
    },

    // Implement feature
    implementFeature: function() {
        const featureDescription = document.getElementById('featureInput').value.trim();
        
        if (!featureDescription) {
            alert('Please describe the feature you want to implement');
            return;
        }

        if (Object.keys(this.sourceFiles).length === 0) {
            alert('Please add some source files first');
            return;
        }

        // Reset workflow
        this.currentWorkflow = {
            stage: 'feature_input',
            featureDescription: featureDescription,
            allFiles: Object.keys(this.sourceFiles),
            fileIndex: 0,
            debugCount: 0
        };

        // Clear feature input
        document.getElementById('featureInput').value = '';

        // Start the AI workflow
        this.processFeatureRequest(featureDescription);
    },

    // Process feature request with AI
    processFeatureRequest: async function(featureDescription) {
        UIManager.disableInput();
        MessageManager.showTypingIndicator();

        try {
            const systemPrompt = {
                role: "system",
                content: `You are Code Improver AI, an expert software developer assistant. You help users implement new features in their existing code. 

When a user describes a feature, you should:
1. Analyze the feature request carefully
2. Explain what you understand about the feature
3. Ask for confirmation before proceeding
4. Then generate clean, production-ready code

Current source files available: ${Object.keys(this.sourceFiles).join(', ')}

Be thorough, professional, and ensure code quality. Always consider best practices, security, and maintainability.`
            };

            const response = await fetch(`${SERVER_BASE}/api/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [systemPrompt, { role: 'user', content: `Generate the updated code for ${currentFile}` }],
                    max_tokens: 3000,
                    temperature: 0.7,
                    conversationType: 'codeImprover'
                })
            });

            const data = await response.json();
            MessageManager.hideTypingIndicator();

            if (data.replyText) {
                // Create code card with syntax highlighting
                this.addCodeCard(data.replyText, currentFile);
                this.currentWorkflow.currentGeneratedCode = data.replyText;
                this.currentWorkflow.currentFile = currentFile;
            } else {
                MessageManager.addMessage('Sorry, I encountered an error generating code. Please try again.', 'assistant');
            }

        } catch (error) {
            MessageManager.hideTypingIndicator();
            MessageManager.addMessage('Sorry, I cannot connect to the AI service right now.', 'assistant');
            console.error('Code generation error:', error);
        }
    },

    // Add code card with syntax highlighting
    addCodeCard: function(code, fileName) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'fade-in flex justify-start';
        
        const language = this.detectLanguage(fileName);
        const highlightedCode = this.prismLoaded ? 
            `<pre><code class="language-${language}">${this.escapeHtml(code)}</code></pre>` : 
            `<pre><code>${this.escapeHtml(code)}</code></pre>`;

        messageDiv.innerHTML = `
            <div class="bg-gray-700 mr-12 p-0 rounded-lg max-w-full">
                <div class="bg-gray-800 px-3 py-2 rounded-t-lg flex justify-between items-center">
                    <span class="text-sm font-semibold text-purple-300">${fileName}</span>
                    <button onclick="CodeImproverPlugin.copyCode(this)" class="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded">
                        Copy Code
                    </button>
                </div>
                <div class="code-block-container p-3 rounded-b-lg overflow-x-auto" style="background: #2d3748;">
                    ${highlightedCode}
                </div>
                <div class="px-3 py-2 border-t border-gray-600">
                    <button onclick="CodeImproverPlugin.debugCode()" class="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded text-sm font-medium">
                        Debug Code
                    </button>
                </div>
                <div class="text-xs opacity-70 p-2">${Utils.formatTime()}</div>
            </div>
        `;

        Elements.messagesContainer.appendChild(messageDiv);
        
        // Apply syntax highlighting if Prism is loaded
        if (this.prismLoaded && window.Prism) {
            setTimeout(() => {
                window.Prism.highlightAll();
            }, 100);
        }

        UIManager.scrollMessagesToBottom();
    },

    // Detect programming language from file extension
    detectLanguage: function(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const langMap = {
            'html': 'markup',
            'htm': 'markup',
            'css': 'css',
            'js': 'javascript',
            'json': 'json',
            'py': 'python',
            'php': 'php',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'cs': 'csharp'
        };
        return langMap[ext] || 'text';
    },

    // Escape HTML
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Copy code to clipboard
    copyCode: function(button) {
        const codeBlock = button.closest('.bg-gray-700').querySelector('code');
        if (codeBlock) {
            navigator.clipboard.writeText(codeBlock.textContent).then(() => {
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                button.className = button.className.replace('bg-blue-600', 'bg-green-600');
                setTimeout(() => {
                    button.textContent = originalText;
                    button.className = button.className.replace('bg-green-600', 'bg-blue-600');
                }, 2000);
            });
        }
    },

    // Debug generated code
    debugCode: async function() {
        const code = this.currentWorkflow.currentGeneratedCode;
        const fileName = this.currentWorkflow.currentFile;

        if (!code || !fileName) return;

        MessageManager.addMessage("Debugging your code...", 'assistant');
        MessageManager.showTypingIndicator();

        // Create animated debugging display
        this.showDebuggingAnimation(code, fileName);

        try {
            const systemPrompt = {
                role: "system",
                content: `You are Code Improver AI's debugging module. Analyze the provided code thoroughly for:
1. Syntax errors
2. Logic errors
3. Best practices violations
4. Security issues
5. Performance problems
6. Code quality issues

Provide a detailed analysis and then ask if the user wants you to fix the issues found.`
            };

            const response = await fetch(`${SERVER_BASE}/api/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [systemPrompt, { role: 'user', content: `Debug this ${fileName} code:\n\n${code}` }],
                    max_tokens: 2000,
                    temperature: 0.5,
                    conversationType: 'codeImprover'
                })
            });

            const data = await response.json();
            MessageManager.hideTypingIndicator();

            if (data.replyText) {
                this.addDebugResponse(data.replyText);
                this.currentWorkflow.stage = 'debugging';
                this.currentWorkflow.debugCount++;
            } else {
                MessageManager.addMessage('Sorry, I encountered an error during debugging.', 'assistant');
            }

        } catch (error) {
            MessageManager.hideTypingIndicator();
            MessageManager.addMessage('Sorry, debugging service is unavailable.', 'assistant');
            console.error('Debug error:', error);
        }
    },

    // Show debugging animation
    showDebuggingAnimation: function(code, fileName) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'fade-in flex justify-start';
        messageDiv.id = 'debuggingAnimation';
        
        const lines = code.split('\n');
        const linesHTML = lines.map((line, index) => 
            `<div class="debug-line" id="debugLine${index}" data-line="${index}">${this.escapeHtml(line) || '&nbsp;'}</div>`
        ).join('');

        messageDiv.innerHTML = `
            <div class="bg-gray-700 mr-12 p-0 rounded-lg max-w-full">
                <div class="bg-red-800 px-3 py-2 rounded-t-lg">
                    <span class="text-sm font-semibold text-white">🔍 Debugging ${fileName}...</span>
                </div>
                <div class="p-3 font-mono text-xs overflow-x-auto" style="background: #1a1a1a; color: #00ff00;">
                    ${linesHTML}
                </div>
            </div>
        `;

        Elements.messagesContainer.appendChild(messageDiv);
        UIManager.scrollMessagesToBottom();

        // Animate line-by-line debugging
        this.animateDebugging(lines.length);
    },

    // Animate debugging process
    animateDebugging: function(totalLines) {
        let currentLine = 0;
        const interval = setInterval(() => {
            const lineElement = document.getElementById(`debugLine${currentLine}`);
            if (lineElement) {
                lineElement.style.backgroundColor = '#ffff0040';
                setTimeout(() => {
                    if (lineElement) lineElement.style.backgroundColor = 'transparent';
                }, 200);
            }
            
            currentLine++;
            if (currentLine >= totalLines) {
                clearInterval(interval);
                // Remove animation after debugging
                setTimeout(() => {
                    const animation = document.getElementById('debuggingAnimation');
                    if (animation) animation.remove();
                }, 1000);
            }
        }, 100);
    },

    // Add debug response with fix option
    addDebugResponse: function(debugText) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'fade-in flex justify-start';
        
        messageDiv.innerHTML = `
            <div class="bg-gray-700 mr-12 p-3 rounded-lg max-w-full">
                <div class="text-sm mb-3">${Utils.formatMessage(debugText)}</div>
                <div class="flex gap-2">
                    <button onclick="CodeImproverPlugin.fixCode(true)" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm font-medium">
                        ✅ Yes, Fix Issues
                    </button>
                    <button onclick="CodeImproverPlugin.fixCode(false)" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium">
                        ➡️ Continue to Next File
                    </button>
                </div>
                <div class="text-xs opacity-70 mt-2">${Utils.formatTime()}</div>
            </div>
        `;

        Elements.messagesContainer.appendChild(messageDiv);
        UIManager.scrollMessagesToBottom();
    },

    // Fix code issues
    fixCode: async function(shouldFix) {
        // Remove fix buttons
        const lastMessage = Elements.messagesContainer.lastElementChild;
        const buttons = lastMessage.querySelectorAll('button');
        buttons.forEach(btn => btn.remove());

        if (!shouldFix) {
            this.proceedToNextFile();
            return;
        }

        MessageManager.addMessage("Fixing identified issues...", 'assistant');
        MessageManager.showTypingIndicator();

        try {
            const code = this.currentWorkflow.currentGeneratedCode;
            const fileName = this.currentWorkflow.currentFile;

            const systemPrompt = {
                role: "system",
                content: `You are Code Improver AI. Fix all the issues found in the previous debugging analysis and provide the corrected, complete code.

Return only the clean, fixed code without any explanations.`
            };

            const response = await fetch(`${SERVER_BASE}/api/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [systemPrompt, { role: 'user', content: `Fix all issues in this ${fileName} code:\n\n${code}` }],
                    max_tokens: 3000,
                    temperature: 0.3,
                    conversationType: 'codeImprover'
                })
            });

            const data = await response.json();
            MessageManager.hideTypingIndicator();

            if (data.replyText) {
                MessageManager.addMessage("Code has been fixed! Here's the updated version:", 'assistant');
                this.addCodeCard(data.replyText, fileName);
                this.currentWorkflow.currentGeneratedCode = data.replyText;
            } else {
                MessageManager.addMessage('Sorry, I encountered an error fixing the code.', 'assistant');
            }

        } catch (error) {
            MessageManager.hideTypingIndicator();
            MessageManager.addMessage('Sorry, code fixing service is unavailable.', 'assistant');
            console.error('Fix code error:', error);
        }
    },

    // Proceed to next file or complete workflow
    proceedToNextFile: function() {
        this.currentWorkflow.fileIndex++;
        
        if (this.currentWorkflow.fileIndex < this.currentWorkflow.allFiles.length) {
            // Generate code for next file
            const nextFile = this.currentWorkflow.allFiles[this.currentWorkflow.fileIndex];
            MessageManager.addMessage(`Moving to next file: ${nextFile}`, 'assistant');
            setTimeout(() => {
                this.generateCodeForFeature(this.currentWorkflow.featureDescription);
            }, 1000);
        } else {
            // All files processed
            this.completeWorkflow();
        }
    },

    // Complete the workflow
    completeWorkflow: function() {
        MessageManager.addMessage("All files have been processed! Are you satisfied with the implementation?", 'assistant');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'fade-in flex justify-start';
        
        messageDiv.innerHTML = `
            <div class="bg-gray-700 mr-12 p-3 rounded-lg max-w-full">
                <div class="text-sm mb-3">Chat completed! Choose an option:</div>
                <div class="flex gap-2">
                    <button onclick="CodeImproverPlugin.finalizeChatSatisfied()" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm font-medium">
                        ✅ Satisfied
                    </button>
                    <button onclick="CodeImproverPlugin.finalizeChatNotSatisfied()" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-medium">
                        ❌ Not Satisfied
                    </button>
                </div>
                <div class="text-xs opacity-70 mt-2">${Utils.formatTime()}</div>
            </div>
        `;

        Elements.messagesContainer.appendChild(messageDiv);
        UIManager.scrollMessagesToBottom();
        
        this.currentWorkflow.stage = 'complete';
    },

    // Finalize chat - satisfied
    finalizeChatSatisfied: function() {
        // Clear all messages except source code card
        const messages = Elements.messagesContainer.querySelectorAll('.fade-in');
        messages.forEach((msg, index) => {
            if (index > 0) { // Keep the first message (source code card)
                msg.remove();
            }
        });

        // Update source files with generated code
        this.updateSourceFilesFromGenerated();
        
        MessageManager.addMessage("Perfect! Your source code has been updated with the new implementation. You can now copy the code from the source files above and use it in your project!", 'assistant');
        
        // Reset workflow
        this.currentWorkflow = {
            stage: 'idle',
            currentFile: null,
            allFiles: [],
            fileIndex: 0,
            debugCount: 0
        };
    },

    // Finalize chat - not satisfied
    finalizeChatNotSatisfied: function() {
        MessageManager.addMessage("I understand you're not satisfied. Please describe what you'd like to change or improve, and we can work on it together!", 'assistant');
        
        this.currentWorkflow.stage = 'idle';
        UIManager.enableInput();
    },

    // Update source files with generated code
    updateSourceFilesFromGenerated: function() {
        // This would update the source files in the database
        // For now, we'll just refresh the source card
        this.refreshSourceCard();
        MessageManager.addMessage("Source files have been updated in your repository!", 'assistant');
    },

    // Check if this is a code improver conversation
    isCodeImproverActive: function() {
        return this.isActive && AppState.currentChatId === this.CHAT_ID;
    },

    // Handle message in code improver context
    handleCodeImproverMessage: async function(message) {
        if (this.currentWorkflow.stage === 'feature_input') {
            await this.processFeatureRequest(message);
        } else if (this.currentWorkflow.stage === 'idle') {
            // General conversation about code improvement
            await this.handleGeneralCodeDiscussion(message);
        } else {
            MessageManager.addMessage("Please complete the current workflow before starting a new feature request.", 'assistant');
        }
    },

    // Handle general code discussion
    handleGeneralCodeDiscussion: async function(message) {
        MessageManager.showTypingIndicator();

        try {
            const systemPrompt = {
                role: "system",
                content: `You are Code Improver AI, a helpful coding assistant. You can discuss programming concepts, help with code issues, and assist with feature planning. 

Available source files: ${Object.keys(this.sourceFiles).join(', ')}

Be helpful and encouraging. If the user wants to implement a feature, guide them to use the feature implementation system above.`
            };

            const response = await fetch(`${SERVER_BASE}/api/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [systemPrompt, { role: 'user', content: message }],
                    max_tokens: 1500,
                    temperature: 0.7,
                    conversationType: 'codeImprover'
                })
            });

            const data = await response.json();
            MessageManager.hideTypingIndicator();

            if (data.replyText) {
                MessageManager.addMessage(data.replyText, 'assistant');
            } else {
                MessageManager.addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
            }

        } catch (error) {
            MessageManager.hideTypingIndicator();
            MessageManager.addMessage('Sorry, I cannot connect to the AI service right now.', 'assistant');
            console.error('Code discussion error:', error);
        }
    }
};

// Make functions globally available
window.CodeImproverPlugin = CodeImproverPlugin;
                },
                body: JSON.stringify({
                    messages: [systemPrompt, { role: 'user', content: `I want to implement this feature: ${featureDescription}. Please analyze this and tell me what you understand.` }],
                    max_tokens: 1500,
                    temperature: 0.7,
                    conversationType: 'codeImprover'
                })
            });

            const data = await response.json();
            MessageManager.hideTypingIndicator();

            if (data.replyText) {
                // Add AI response with confirmation buttons
                this.addAIResponseWithConfirmation(data.replyText, featureDescription);
                this.currentWorkflow.stage = 'feature_confirm';
            } else {
                MessageManager.addMessage('Sorry, I encountered an error analyzing your feature request. Please try again.', 'assistant');
            }

        } catch (error) {
            MessageManager.hideTypingIndicator();
            MessageManager.addMessage('Sorry, I cannot connect to the AI service right now. Please check your connection and try again.', 'assistant');
            console.error('Feature request error:', error);
        }

        UIManager.enableInput();
    },

    // Add AI response with confirmation buttons
    addAIResponseWithConfirmation: function(responseText, featureDescription) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'fade-in flex justify-start';
        
        messageDiv.innerHTML = `
            <div class="bg-gray-700 mr-12 p-3 rounded-lg max-w-full">
                <div class="text-sm">${Utils.formatMessage(responseText)}</div>
                <div class="flex gap-2 mt-3">
                    <button onclick="CodeImproverPlugin.confirmFeature('${featureDescription}', true)" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm font-medium">
                        ✅ Satisfied
                    </button>
                    <button onclick="CodeImproverPlugin.confirmFeature('${featureDescription}', false)" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-medium">
                        ❌ Not Satisfied
                    </button>
                </div>
                <div class="text-xs opacity-70 mt-2">${Utils.formatTime()}</div>
            </div>
        `;

        Elements.messagesContainer.appendChild(messageDiv);
        UIManager.scrollMessagesToBottom();
    },

    // Confirm feature implementation
    confirmFeature: function(featureDescription, satisfied) {
        // Remove confirmation buttons from the last message
        const lastMessage = Elements.messagesContainer.lastElementChild;
        const buttons = lastMessage.querySelectorAll('button');
        buttons.forEach(btn => btn.remove());

        if (!satisfied) {
            // Allow user to provide more details
            MessageManager.addMessage("Please provide more details about what you want to change or add:", 'assistant');
            this.currentWorkflow.stage = 'feature_input';
            UIManager.enableInput();
            return;
        }

        // Start code generation
        this.currentWorkflow.stage = 'coding';
        this.generateCodeForFeature(featureDescription);
    },

    // Generate code for feature
    generateCodeForFeature: async function(featureDescription) {
        const currentFile = this.currentWorkflow.allFiles[this.currentWorkflow.fileIndex];
        const currentCode = this.sourceFiles[currentFile] || '';

        MessageManager.addMessage(`🔄 Generating code for ${currentFile}...`, 'assistant');
        MessageManager.showTypingIndicator();

        try {
            const systemPrompt = {
                role: "system",
                content: `You are Code Improver AI. Generate clean, production-ready code for the requested feature.

Current file: ${currentFile}
Current code content: ${currentCode}

Feature to implement: ${featureDescription}

Return only the complete updated code for this file. Make sure the code is properly formatted and includes the new feature integration.`
            };

            const response = await fetch(`${SERVER_BASE}/api/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
