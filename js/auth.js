// Authentication Management

const AuthManager = {
    // Check authentication state
    checkAuthState: function() {
        auth.onAuthStateChanged(user => {
            if (user) {
                AppState.currentUser = user;
                this.showMainApp();
                this.loadUserData();
            } else {
                this.showAuthModal();
            }
        });
    },
    
    // Show authentication modal
    showAuthModal: function() {
        Utils.show(Elements.authModal);
        Utils.hide(Elements.mainApp);
    },
    
    // Show main application
    showMainApp: function() {
        Utils.hide(Elements.authModal);
        Utils.show(Elements.mainApp);
        ChatManager.loadChatHistory();
        PluginManager.updateEnabledPluginsUI();
        ChatManager.startNewChat();
    },
    
    // Handle login
    handleLogin: async function() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            alert('Login failed: ' + error.message);
        }
    },
    
    // Handle signup
    handleSignUp: async function() {
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
    },
    
    // Handle Google sign in
    handleGoogleSignIn: async function() {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await auth.signInWithPopup(provider);
        } catch (error) {
            alert('Google sign in failed: ' + error.message);
        }
    },
    
    // Handle sign out
    handleSignOut: async function() {
        try {
            await auth.signOut();
            AppState.currentUser = null;
            AppState.resetChatState();
            AppState.chatHistoryData = {};
            UIManager.closeMobileSidebar();
        } catch (error) {
            alert('Sign out failed: ' + error.message);
        }
    },
    
    // Load user data and update UI
    loadUserData: function() {
        if (AppState.currentUser) {
            const displayName = AppState.currentUser.displayName || AppState.currentUser.email;
            const photoURL = AppState.currentUser.photoURL;
            
            // Desktop user info
            Elements.userName.textContent = displayName;
            Elements.userInitial.textContent = Utils.getUserInitials(displayName);
            
            // Mobile user info
            Elements.mobileUserName.textContent = displayName;
            Elements.mobileUserInitial.textContent = Utils.getUserInitials(displayName);
            
            if (photoURL) {
                Elements.userPhoto.src = photoURL;
                Utils.show(Elements.userPhoto);
                Elements.userInitial.style.display = 'none';
                
                Elements.mobileUserPhoto.src = photoURL;
                Utils.show(Elements.mobileUserPhoto);
                Elements.mobileUserInitial.style.display = 'none';
            } else {
                Utils.hide(Elements.userPhoto);
                Elements.userInitial.style.display = 'flex';
                
                Utils.hide(Elements.mobileUserPhoto);
                Elements.mobileUserInitial.style.display = 'flex';
            }
        }
    },
    
    // Toggle between login and signup forms
    toggleAuthForms: function() {
        Utils.toggleClass(Elements.loginForm, 'hidden');
        Utils.toggleClass(Elements.signUpForm, 'hidden');
    },
    
    // Initialize authentication event listeners
    initEventListeners: function() {
        // Form toggles
        const showSignUp = document.getElementById('showSignUp');
        const showSignIn = document.getElementById('showSignIn');
        
        if (showSignUp) {
            showSignUp.addEventListener('click', () => {
                Utils.hide(Elements.loginForm);
                Utils.show(Elements.signUpForm);
            });
        }
        
        if (showSignIn) {
            showSignIn.addEventListener('click', () => {
                Utils.hide(Elements.signUpForm);
                Utils.show(Elements.loginForm);
            });
        }
        
        // Auth buttons
        const loginBtn = document.getElementById('loginBtn');
        const signUpBtn = document.getElementById('signUpBtn');
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        const googleSignUpBtn = document.getElementById('googleSignUpBtn');
        const signOutBtn = document.getElementById('signOutBtn');
        
        if (loginBtn) loginBtn.addEventListener('click', this.handleLogin.bind(this));
        if (signUpBtn) signUpBtn.addEventListener('click', this.handleSignUp.bind(this));
        if (googleSignInBtn) googleSignInBtn.addEventListener('click', this.handleGoogleSignIn.bind(this));
        if (googleSignUpBtn) googleSignUpBtn.addEventListener('click', this.handleGoogleSignIn.bind(this));
        if (signOutBtn) signOutBtn.addEventListener('click', this.handleSignOut.bind(this));
    }
};
