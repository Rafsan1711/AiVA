// Admin Plugin for User Management

const AdminPlugin = {
    // Admin email (only this user can see admin panel)
    ADMIN_EMAIL: '123@gmail.com',
    
    // Check if current user is admin
    isAdmin: function() {
        return AppState.currentUser && AppState.currentUser.email === this.ADMIN_EMAIL;
    },

    // Initialize admin panel
    initialize: function() {
        if (this.isAdmin()) {
            this.showAdminPanel();
            this.loadUserLimits();
            this.setupEventListeners();
        }
    },

    // Show admin panel in settings
    showAdminPanel: function() {
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) {
            adminPanel.classList.remove('hidden');
        }
    },

    // Setup admin event listeners
    setupEventListeners: function() {
        const updateBtn = document.getElementById('updateUserLimits');
        if (updateBtn) {
            updateBtn.addEventListener('click', this.updateUserLimits.bind(this));
        }
    },

    // Update user limits
    updateUserLimits: async function() {
        const email = document.getElementById('adminUserEmail').value.trim();
        const responseLimit = parseInt(document.getElementById('adminResponseLimit').value) || 0;
        const chatLimit = parseInt(document.getElementById('adminChatLimit').value) || 0;
        const customMessage = document.getElementById('adminCustomMessage').value.trim();

        if (!email) {
            alert('Please enter a user email');
            return;
        }

        try {
            const userLimitsRef = database.ref(`userLimits/${this.sanitizeEmail(email)}`);
            await userLimitsRef.set({
                email: email,
                responseLimit: responseLimit,
                dailyChatLimit: chatLimit,
                customMessage: customMessage || 'You have reached your usage limit. Please contact support.',
                updatedAt: Date.now(),
                updatedBy: this.ADMIN_EMAIL
            });

            alert('User limits updated successfully!');
            this.clearAdminForm();
            this.loadUserLimits();
        } catch (error) {
            console.error('Error updating user limits:', error);
            alert('Failed to update user limits');
        }
    },

    // Load and display user limits
    loadUserLimits: function() {
        const userLimitsList = document.getElementById('userLimitsList');
        if (!userLimitsList) return;

        database.ref('userLimits').on('value', (snapshot) => {
            const limits = snapshot.val() || {};
            this.displayUserLimits(limits);
        });
    },

    // Display user limits in UI
    displayUserLimits: function(limits) {
        const userLimitsList = document.getElementById('userLimitsList');
        if (!userLimitsList) return;

        userLimitsList.innerHTML = '';

        if (Object.keys(limits).length === 0) {
            userLimitsList.innerHTML = '<p class="text-gray-400 text-sm">No user limits set</p>';
            return;
        }

        Object.entries(limits).forEach(([key, limit]) => {
            const limitItem = document.createElement('div');
            limitItem.className = 'user-limit-item';
            limitItem.innerHTML = `
                <div class="user-email">${limit.email}</div>
                <div class="limits">
                    Responses: ${limit.responseLimit} | Daily Chats: ${limit.dailyChatLimit}
                </div>
                <div class="text-xs text-gray-300 mt-1">
                    Message: "${limit.customMessage}"
                </div>
                <button onclick="AdminPlugin.removeUserLimit('${key}')" class="text-red-400 text-xs mt-1 hover:text-red-300">
                    Remove Limit
                </button>
            `;
            userLimitsList.appendChild(limitItem);
        });
    },

    // Remove user limit
    removeUserLimit: async function(userKey) {
        if (confirm('Are you sure you want to remove this user limit?')) {
            try {
                await database.ref(`userLimits/${userKey}`).remove();
                alert('User limit removed successfully!');
            } catch (error) {
                console.error('Error removing user limit:', error);
                alert('Failed to remove user limit');
            }
        }
    },

    // Clear admin form
    clearAdminForm: function() {
        document.getElementById('adminUserEmail').value = '';
        document.getElementById('adminResponseLimit').value = '';
        document.getElementById('adminChatLimit').value = '';
        document.getElementById('adminCustomMessage').value = '';
    },

    // Sanitize email for Firebase key
    sanitizeEmail: function(email) {
        return email.replace(/[.#$[\]]/g, '_');
    },

    // Check user limits before sending message
    checkUserLimits: async function(userEmail) {
        if (!userEmail) return { allowed: true };

        try {
            const userLimitsRef = database.ref(`userLimits/${this.sanitizeEmail(userEmail)}`);
            const snapshot = await userLimitsRef.once('value');
            const limits = snapshot.val();

            if (!limits) {
                return { allowed: true }; // No limits set
            }

            // Check current usage
            const usage = await this.getUserUsage(userEmail);
            
            // Check response limit
            if (limits.responseLimit > 0 && usage.responses >= limits.responseLimit) {
                return {
                    allowed: false,
                    message: limits.customMessage,
                    reason: 'response_limit'
                };
            }

            // Check daily chat limit
            if (limits.dailyChatLimit > 0 && usage.dailyChats >= limits.dailyChatLimit) {
                return {
                    allowed: false,
                    message: limits.customMessage,
                    reason: 'daily_chat_limit'
                };
            }

            return { allowed: true };
        } catch (error) {
            console.error('Error checking user limits:', error);
            return { allowed: true }; // Allow if error checking limits
        }
    },

    // Get user usage statistics
    getUserUsage: async function(userEmail) {
        try {
            const sanitizedEmail = this.sanitizeEmail(userEmail);
            const today = new Date().toDateString();

            // Get user usage from Firebase
            const usageRef = database.ref(`userUsage/${sanitizedEmail}`);
            const snapshot = await usageRef.once('value');
            const usage = snapshot.val() || {};

            const todayUsage = usage[today] || { responses: 0, chats: 0 };

            return {
                responses: todayUsage.responses || 0,
                dailyChats: todayUsage.chats || 0
            };
        } catch (error) {
            console.error('Error getting user usage:', error);
            return { responses: 0, dailyChats: 0 };
        }
    },

    // Track user usage
    trackUserUsage: async function(userEmail, type = 'response') {
        if (!userEmail) return;

        try {
            const sanitizedEmail = this.sanitizeEmail(userEmail);
            const today = new Date().toDateString();
            const usageRef = database.ref(`userUsage/${sanitizedEmail}/${today}`);

            const snapshot = await usageRef.once('value');
            const currentUsage = snapshot.val() || { responses: 0, chats: 0 };

            if (type === 'response') {
                currentUsage.responses = (currentUsage.responses || 0) + 1;
            } else if (type === 'chat') {
                currentUsage.chats = (currentUsage.chats || 0) + 1;
            }

            await usageRef.set(currentUsage);
        } catch (error) {
            console.error('Error tracking user usage:', error);
        }
    },

    // Show custom limit message
    showCustomLimitMessage: function(message) {
        const customBanner = document.getElementById('customLimitBanner');
        const customMessage = document.getElementById('customLimitMessage');
        
        if (customBanner && customMessage) {
            customMessage.textContent = message;
            customBanner.classList.remove('hidden');
            
            // Hide after 5 seconds
            setTimeout(() => {
                customBanner.classList.add('hidden');
            }, 5000);
        }
    },

    // Check limits before chat creation
    checkChatCreationLimits: async function(userEmail) {
        const limits = await this.checkUserLimits(userEmail);
        
        if (!limits.allowed && limits.reason === 'daily_chat_limit') {
            this.showCustomLimitMessage(limits.message);
            return false;
        }
        
        return true;
    },

    // Check limits before message sending
    checkMessageLimits: async function(userEmail) {
        const limits = await this.checkUserLimits(userEmail);
        
        if (!limits.allowed) {
            this.showCustomLimitMessage(limits.message);
            return false;
        }
        
        return true;
    }
};

// Initialize admin plugin when user is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth state to load
    setTimeout(() => {
        AdminPlugin.initialize();
    }, 1000);
});

// Make admin plugin globally available
window.AdminPlugin = AdminPlugin;
