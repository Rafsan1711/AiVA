    // Firebase Configuration
        const firebaseConfig = {
          apiKey: "AIzaSyD9QkbeIywF3HN1bS0A0g2uIRVXOC6q1wM",
          authDomain: "aiva-9abbb.firebaseapp.com",
         projectId: "aiva-9abbb",
         storageBucket: "aiva-9abbb.firebasestorage.app",
         messagingSenderId: "565052629821",
         appId: "1:565052629821:web:4a0083611ff11011da1b54"
        };

        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const database = firebase.database();

        // Global state
        let currentUser = null;
        let currentChatId = null;
        let conversationHistory = [];
        let chatHistoryData = {};
        let messageCount = 0;
        let archivedChats = {};
        let hasAcceptedTerms = false;

        // Server configuration
        const SERVER_BASE = "https://aiva-gwm9.onrender.com"; // Change for production

        // DOM Elements
        const elements = {
            termsModal: document.getElementById('termsModal'),
            authModal: document.getElementById('authModal'),
            settingsModal: document.getElementById('settingsModal'),
            archiveModal: document.getElementById('archiveModal'),
            warningBanner: document.getElementById('warningBanner'),
            mainApp: document.getElementById('mainApp'),
            loginForm: document.getElementById('loginForm'),
            signUpForm: document.getElementById('signUpForm'),
            messagesContainer: document.getElementById('messagesContainer'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            chatHistory: document.getElementById('chatHistory'),
            chatHistoryMobile: document.getElementById('chatHistoryMobile'),
            userInfo: document.getElementById('userInfo'),
            userName: document.getElementById('userName'),
            userAvatar: document.getElementById('userAvatar'),
            userNameMobile: document.getElementById('userNameMobile'),
            userAvatarMobile: document.getElementById('userAvatarMobile'),
            statusIndicator: document.getElementById('statusIndicator'),
            messageCount: document.getElementById('messageCount'),
            messageCountMobile: document.getElementById('messageCountMobile'),
            chatDropdown: document.getElementById('chatDropdown'),
            chatDropdownMobile: document.getElementById('chatDropdownMobile'),
            archivedChats: document.getElementById('archivedChats'),
            mobileSidebar: document.getElementById('mobileSidebar'),
            mobileOverlay: document.getElementById('mobileOverlay')
        };

        // Initialize app
        function initApp() {
            loadUserPreferences();
            setupEventListeners();
            if (hasAcceptedTerms) {
                elements.termsModal.classList.add('hidden');
                checkAuthState();
            } else {
                showTermsModal();
            }
        }

        // Load user preferences from localStorage
        function loadUserPreferences() {
            hasAcceptedTerms = localStorage.getItem('aivaTermsAccepted') === 'true';
            const savedArchived = localStorage.getItem('aivaArchivedChats');
            if (savedArchived) {
                try {
                    archivedChats = JSON.parse(savedArchived);
                } catch (e) {
                    archivedChats = {};
                }
            }
        }

        // Save user preferences
        function saveUserPreferences() {
            localStorage.setItem('aivaTermsAccepted', 'true');
            localStorage.setItem('aivaArchivedChats', JSON.stringify(archivedChats));
        }

        // Terms Modal
        function showTermsModal() {
            elements.termsModal.classList.remove('hidden');
        }

        document.getElementById('acceptTerms').addEventListener('click', () => {
            hasAcceptedTerms = true;
            saveUserPreferences();
            elements.termsModal.classList.add('hidden');
            checkAuthState();
        });

        document.getElementById('declineTerms').addEventListener('click', () => {
            alert('You must accept terms to use AiVA');
        });

        // Mobile sidebar controls
        function openMobileSidebar() {
            elements.mobileSidebar.classList.add('active');
            elements.mobileOverlay.classList.add('active');
        }

        function closeMobileSidebar() {
            elements.mobileSidebar.classList.remove('active');
            elements.mobileOverlay.classList.remove('active');
        }

        // Auth state management
        function checkAuthState() {
            auth.onAuthStateChanged(user => {
                if (user) {
                    currentUser = user;
                    showMainApp();
                    loadUserData();
                    loadChatHistory();
                } else {
                    showAuthModal();
                }
            });
        }

        function showAuthModal() {
            elements.authModal.classList.remove('hidden');
            elements.mainApp.classList.add('hidden');
        }

        function showMainApp() {
            elements.authModal.classList.add('hidden');
            elements.mainApp.classList.remove('hidden');
            startNewChat();
        }

        // Event Listeners
        function setupEventListeners() {
            // Mobile sidebar events
            document.getElementById('openMobileSidebar').addEventListener('click', openMobileSidebar);
            document.getElementById('closeMobileSidebar').addEventListener('click', closeMobileSidebar);
            elements.mobileOverlay.addEventListener('click', closeMobileSidebar);

            // Auth form toggles
            document.getElementById('showSignUp').addEventListener('click', () => {
                elements.loginForm.classList.add('hidden');
                elements.signUpForm.classList.remove('hidden');
            });

            document.getElementById('showSignIn').addEventListener('click', () => {
                elements.signUpForm.classList.add('hidden');
                elements.loginForm.classList.remove('hidden');
            });

            // Auth buttons
            document.getElementById('loginBtn').addEventListener('click', handleLogin);
            document.getElementById('signUpBtn').addEventListener('click', handleSignUp);
            document.getElementById('googleSignInBtn').addEventListener('click', handleGoogleSignIn);
            document.getElementById('googleSignUpBtn').addEventListener('click', handleGoogleSignIn);
            document.getElementById('signOutBtn').addEventListener('click', handleSignOut);

            // Main app buttons (desktop)
            document.getElementById('newChatBtn').addEventListener('click', startNewChat);
            document.getElementById('settingsBtn').addEventListener('click', showSettings);
            document.getElementById('archiveBtn').addEventListener('click', showArchive);

            // Mobile app buttons
            document.getElementById('newChatBtnMobile').addEventListener('click', () => {
                startNewChat();
                closeMobileSidebar();
            });
            document.getElementById('settingsBtnMobile').addEventListener('click', showSettings);
            document.getElementById('archiveBtnMobile').addEventListener('click', showArchive);

            // Modal close buttons
            document.getElementById('closeSettings').addEventListener('click', hideSettings);
            document.getElementById('closeArchive').addEventListener('click', hideArchive);
            document.getElementById('clearHistory').addEventListener('click', clearChatHistory);
            
            // Chat menu (desktop and mobile)
            document.getElementById('chatMenuBtn')?.addEventListener('click', toggleChatDropdown);
            document.getElementById('chatMenuBtnMobile')?.addEventListener('click', toggleChatDropdownMobile);
            document.getElementById('archiveChat').addEventListener('click', archiveCurrentChat);
            document.getElementById('deleteChat').addEventListener('click', deleteCurrentChat);
            document.getElementById('archiveChatMobile').addEventListener('click', archiveCurrentChat);
            document.getElementById('deleteChatMobile').addEventListener('click', deleteCurrentChat);
            
            // Message input
            elements.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
            
            elements.messageInput.addEventListener('input', autoResize);
            elements.sendBtn.addEventListener('click', sendMessage);

            // Search chats (desktop and mobile)
            document.getElementById('searchChats')?.addEventListener('input', filterChats);
            document.getElementById('searchChatsMobile')?.addEventListener('input', filterChatsMobile);

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#chatMenuBtn') && !e.target.closest('#chatDropdown')) {
                    elements.chatDropdown?.classList.remove('active');
                }
                if (!e.target.closest('#chatMenuBtnMobile') && !e.target.closest('#chatDropdownMobile')) {
                    elements.chatDropdownMobile?.classList.remove('active');
                }
            });
        }

        // Auth functions
        async function handleLogin() {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            try {
                await auth.signInWithEmailAndPassword(email, password);
            } catch (error) {
                alert('Login failed: ' + error.message);
            }
        }

        async function handleSignUp() {
            const email = document.getElementById('signUpEmail').value;
            const password = document.getElementById('signUpPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }

            try {
                await auth.createUserWithEmailAndPassword(email, password);
            } catch (error) {
                alert('Sign up failed: ' + error.message);
            }
        }

        async function handleGoogleSignIn() {
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                await auth.signInWithPopup(provider);
            } catch (error) {
                alert('Google sign in failed: ' + error.message);
            }
        }

        async function handleSignOut() {
            try {
                await auth.signOut();
                currentUser = null;
                currentChatId = null;
                conversationHistory = [];
                chatHistoryData = {};
                messageCount = 0;
            } catch (error) {
                alert('Sign out failed: ' + error.message);
            }
        }

        // User data management
        function loadUserData() {
            if (currentUser) {
                const displayName = currentUser.displayName || currentUser.email;
                const initial = displayName.charAt(0).toUpperCase();
                
                // Update desktop elements
                if (elements.userName) elements.userName.textContent = displayName;
                if (elements.userAvatar) elements.userAvatar.textContent = initial;
                
                // Update mobile elements
                if (elements.userNameMobile) elements.userNameMobile.textContent = displayName;
                if (elements.userAvatarMobile) elements.userAvatarMobile.textContent = initial;
            }
        }

        // Chat management
        function startNewChat() {
            currentChatId = generateChatId();
            conversationHistory = [];
            messageCount = 0;
            updateMessageCount();
            hideWarningBanner();
            elements.messagesContainer.innerHTML = `
                <div class="text-center text-gray-500 mt-8">
                    <div class="logo-placeholder mx-auto mb-4 pulse">AI</div>
                    <h3 class="text-lg font-medium mb-1">New Conversation</h3>
                    <p class="text-sm">How can I help you today?</p>
                    <p class="text-xs text-gray-600 mt-2">You can send up to 12 messages per chat</p>
                </div>
            `;
            elements.messageInput.focus();
            elements.sendBtn.disabled = false;
            elements.messageInput.disabled = false;
            updateChatHistoryUI();
        }

        function generateChatId() {
            return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        function updateMessageCount() {
            const countText = `${messageCount}/12`;
            if (elements.messageCount) elements.messageCount.textContent = countText;
            if (elements.messageCountMobile) elements.messageCountMobile.textContent = countText;
            
            if (messageCount >= 12) {
                showWarningBanner();
                elements.sendBtn.disabled = true;
                elements.messageInput.disabled = true;
            }
        }

        function showWarningBanner() {
            elements.warningBanner.classList.remove('hidden');
        }

        function hideWarningBanner() {
            elements.warningBanner.classList.add('hidden');
        }

        // Message handling with conversational context and Firebase save
        async function sendMessage() {
            const message = elements.messageInput.value.trim();
            if (!message || messageCount >= 12) return;

            // Disable input
            elements.messageInput.disabled = true;
            elements.sendBtn.disabled = true;

            // Add user message
            addMessage(message, 'user');
            elements.messageInput.value = '';
            messageCount++;
            updateMessageCount();

            // Add to conversation history with proper context
            conversationHistory.push({ role: 'user', content: message });

            // Save to Firebase immediately after user message
            await saveChatToHistory();

            // Show typing indicator
            showTypingIndicator();

            try {
                // Prepare messages with system prompt for context
                const systemPrompt = {
                    role: "system",
                    content: "You are AiVA, a helpful AI assistant. Maintain conversational context and provide detailed, helpful responses. Remember previous messages in this conversation."
                };

                const messagesToSend = [systemPrompt, ...conversationHistory];

                // Send to AI with full conversation context
                const response = await fetch(`${SERVER_BASE}/api/query`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messages: messagesToSend,
                        model: document.getElementById('modelSelect')?.value || 'openai/gpt-oss-120b:together',
                        max_tokens: 2048,
                        temperature: 0.7
                    })
                });

                const data = await response.json();
                hideTypingIndicator();

                if (data.replyText) {
                    // Add AI response
                    addMessage(data.replyText, 'assistant');
                    
                    // Add to conversation history to maintain context
                    conversationHistory.push({ role: 'assistant', content: data.replyText });
                    
                    // Save conversation to Firebase after AI response
                    await saveChatToHistory();
                } else {
                    addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
                }
            } catch (error) {
                hideTypingIndicator();
                addMessage('Sorry, I cannot connect to the AI service right now. Please check your connection and try again.', 'assistant');
                console.error('AI query error:', error);
            }

            // Re-enable input if under limit
            if (messageCount < 12) {
                elements.messageInput.disabled = false;
                elements.sendBtn.disabled = false;
                elements.messageInput.focus();
            }
            autoResize();
        }

        function addMessage(content, sender) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `fade-in ${sender === 'user' ? 'flex justify-end' : 'flex justify-start'}`;
            
            const isUser = sender === 'user';
            const bgColor = isUser ? 'bg-blue-600' : 'bg-gray-700';
            const alignment = isUser ? 'ml-12' : 'mr-12';

            // Process content for code blocks and formatting
            const processedContent = formatMessage(content);

            messageDiv.innerHTML = `
                <div class="${bgColor} ${alignment} p-3 rounded-lg max-w-full">
                    <div class="text-sm">${processedContent}</div>
                    <div class="text-xs opacity-70 mt-1">${new Date().toLocaleTimeString()}</div>
                </div>
            `;

            // Clear welcome message if it exists
            const welcomeMsg = elements.messagesContainer.querySelector('.text-center');
            if (welcomeMsg) welcomeMsg.remove();

            elements.messagesContainer.appendChild(messageDiv);
            elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
        }

        function formatMessage(content) {
            // Simple formatting for code blocks and text styling
            content = content.replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-2 py-1 rounded text-sm">$1</code>');
            content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
            content = content.replace(/\n/g, '<br>');
            
            // Handle code blocks
            content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
                return `<div class="code-block"><pre><code>${escapeHtml(code.trim())}</code></pre></div>`;
            });

            return content;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function showTypingIndicator() {
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
            elements.messagesContainer.appendChild(typingDiv);
            elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
        }

        function hideTypingIndicator() {
            const typing = document.getElementById('typingIndicator');
            if (typing) typing.remove();
        }

        // Auto-resize textarea
        function autoResize() {
            elements.messageInput.style.height = 'auto';
            elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 128) + 'px';
        }

        // Enhanced Chat history management with Firebase integration
        async function saveChatToHistory() {
            if (!currentUser || !currentChatId) return;

            const chatTitle = conversationHistory.find(msg => msg.role === 'user')?.content?.substring(0, 50) || 'New Chat';
            const chatData = {
                id: currentChatId,
                title: chatTitle,
                messages: conversationHistory,
                timestamp: Date.now(),
                userId: currentUser.uid,
                messageCount: messageCount,
                lastUpdated: Date.now()
            };

            chatHistoryData[currentChatId] = chatData;
            
            try {
                // Save to Firebase with better error handling
                await database.ref(`chats/${currentUser.uid}/${currentChatId}`).set(chatData);
                console.log('Chat saved to Firebase successfully');
            } catch (error) {
                console.error('Error saving chat to Firebase:', error);
                // Still update local UI even if Firebase save fails
            }
            
            // Update UI
            updateChatHistoryUI();
        }

        function loadChatHistory() {
            if (!currentUser) return;

            database.ref(`chats/${currentUser.uid}`).on('value', (snapshot) => {
                const firebaseData = snapshot.val() || {};
                chatHistoryData = firebaseData;
                console.log('Loaded chat history from Firebase:', Object.keys(chatHistoryData).length, 'chats');
                updateChatHistoryUI();
            });
        }

        function updateChatHistoryUI() {
            updateChatList(elements.chatHistory);
            updateChatList(elements.chatHistoryMobile);
        }

        function updateChatList(container) {
            if (!container) return;
            
            container.innerHTML = '';

            const chats = Object.values(chatHistoryData)
                .filter(chat => !archivedChats[chat.id])
                .sort((a, b) => (b.lastUpdated || b.timestamp) - (a.lastUpdated || a.timestamp));

            chats.forEach(chat => {
                const chatItem = document.createElement('div');
                chatItem.className = `p-3 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors ${
                    chat.id === currentChatId ? 'bg-gray-700' : 'bg-gray-800'
                }`;
                
                chatItem.innerHTML = `
                    <div class="font-medium text-sm truncate">${chat.title}</div>
                    <div class="text-xs text-gray-400 flex justify-between">
                        <span>${new Date(chat.timestamp).toLocaleDateString()}</span>
                        <span>${chat.messageCount || 0}/12</span>
                    </div>
                `;
                
                chatItem.addEventListener('click', () => {
                    loadChat(chat);
                    closeMobileSidebar(); // Close mobile sidebar when chat is selected
                });
                container.appendChild(chatItem);
            });

            if (chats.length === 0) {
                container.innerHTML = '<p class="text-gray-400 text-center p-4">No chats yet</p>';
            }
        }

        function loadChat(chat) {
            currentChatId = chat.id;
            conversationHistory = chat.messages || [];
            messageCount = conversationHistory.filter(msg => msg.role === 'user').length;
            updateMessageCount();
            hideWarningBanner();
            
            // Clear messages and rebuild
            elements.messagesContainer.innerHTML = '';
            
            // Rebuild conversation display in chronological order
            conversationHistory.forEach(msg => {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    addMessage(msg.content, msg.role);
                }
            });
            
            // Enable/disable input based on message count
            if (messageCount >= 12) {
                elements.sendBtn.disabled = true;
                elements.messageInput.disabled = true;
                showWarningBanner();
            } else {
                elements.sendBtn.disabled = false;
                elements.messageInput.disabled = false;
                elements.messageInput.focus();
            }
            
            updateChatHistoryUI();
        }

        function clearChatHistory() {
            if (!currentUser) return;
            
            if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
                database.ref(`chats/${currentUser.uid}`).remove();
                chatHistoryData = {};
                archivedChats = {};
                saveUserPreferences();
                updateChatHistoryUI();
                updateArchivedChatsUI();
                startNewChat();
            }
        }

        function filterChats() {
            const searchTerm = document.getElementById('searchChats').value.toLowerCase();
            filterChatList(elements.chatHistory, searchTerm);
        }

        function filterChatsMobile() {
            const searchTerm = document.getElementById('searchChatsMobile').value.toLowerCase();
            filterChatList(elements.chatHistoryMobile, searchTerm);
        }

        function filterChatList(container, searchTerm) {
            if (!container) return;
            
            const chatItems = container.querySelectorAll('div');
            chatItems.forEach(item => {
                const title = item.querySelector('.font-medium')?.textContent?.toLowerCase() || '';
                item.style.display = title.includes(searchTerm) ? 'block' : 'none';
            });
        }

        // Chat dropdown menu functions
        function toggleChatDropdown() {
            elements.chatDropdown?.classList.toggle('active');
        }

        function toggleChatDropdownMobile() {
            elements.chatDropdownMobile?.classList.toggle('active');
        }

        function archiveCurrentChat() {
            if (!currentChatId || !chatHistoryData[currentChatId]) return;
            
            archivedChats[currentChatId] = chatHistoryData[currentChatId];
            saveUserPreferences();
            
            // Remove from Firebase active chats
            if (currentUser) {
                database.ref(`chats/${currentUser.uid}/${currentChatId}`).remove();
            }
            
            delete chatHistoryData[currentChatId];
            updateChatHistoryUI();
            updateArchivedChatsUI();
            elements.chatDropdown?.classList.remove('active');
            elements.chatDropdownMobile?.classList.remove('active');
            startNewChat();
        }

        function deleteCurrentChat() {
            if (!currentChatId) return;
            
            if (confirm('Are you sure you want to delete this chat? This cannot be undone.')) {
                if (currentUser && chatHistoryData[currentChatId]) {
                    database.ref(`chats/${currentUser.uid}/${currentChatId}`).remove();
                }
                delete chatHistoryData[currentChatId];
                delete archivedChats[currentChatId];
                saveUserPreferences();
                updateChatHistoryUI();
                updateArchivedChatsUI();
                elements.chatDropdown?.classList.remove('active');
                elements.chatDropdownMobile?.classList.remove('active');
                startNewChat();
            }
        }

        // Archive modal functions
        function showArchive() {
            updateArchivedChatsUI();
            elements.archiveModal.classList.remove('hidden');
        }

        function hideArchive() {
            elements.archiveModal.classList.add('hidden');
        }

        function updateArchivedChatsUI() {
            const archivedContainer = elements.archivedChats;
            if (!archivedContainer) return;
            
            archivedContainer.innerHTML = '';

            const archived = Object.values(archivedChats)
                .sort((a, b) => (b.lastUpdated || b.timestamp) - (a.lastUpdated || a.timestamp));

            if (archived.length === 0) {
                archivedContainer.innerHTML = '<p class="text-gray-400 text-center">No archived chats</p>';
                return;
            }

            archived.forEach(chat => {
                const chatItem = document.createElement('div');
                chatItem.className = 'p-3 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors bg-gray-800';
                
                chatItem.innerHTML = `
                    <div class="font-medium text-sm truncate">${chat.title}</div>
                    <div class="text-xs text-gray-400 flex justify-between">
                        <span>${new Date(chat.timestamp).toLocaleDateString()}</span>
                        <div class="flex gap-2">
                            <button onclick="unarchiveChat('${chat.id}')" class="text-blue-400 hover:text-blue-300">Restore</button>
                            <button onclick="deleteArchivedChat('${chat.id}')" class="text-red-400 hover:text-red-300">Delete</button>
                        </div>
                    </div>
                `;
                
                archivedContainer.appendChild(chatItem);
            });
        }

        function unarchiveChat(chatId) {
            if (archivedChats[chatId]) {
                chatHistoryData[chatId] = archivedChats[chatId];
                delete archivedChats[chatId];
                saveUserPreferences();
                updateChatHistoryUI();
                updateArchivedChatsUI();
                
                // Save to Firebase if user is logged in
                if (currentUser) {
                    database.ref(`chats/${currentUser.uid}/${chatId}`).set(chatHistoryData[chatId]);
                }
            }
        }

        function deleteArchivedChat(chatId) {
            if (confirm('Are you sure you want to permanently delete this chat?')) {
                delete archivedChats[chatId];
                saveUserPreferences();
                updateArchivedChatsUI();
            }
        }

        // Settings functions
        function showSettings() {
            elements.settingsModal.classList.remove('hidden');
        }

        function hideSettings() {
            elements.settingsModal.classList.add('hidden');
        }

        // Make functions global for onclick handlers
        window.unarchiveChat = unarchiveChat;
        window.deleteArchivedChat = deleteArchivedChat;

        // Initialize app when DOM is loaded
        document.addEventListener('DOMContentLoaded', initApp);
