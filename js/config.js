// Firebase Configuration and Initialization
const firebaseConfig = {
    apiKey: "AIzaSyD9QkbeIywF3HN1bS0A0g2uIRVXOC6q1wM",
    authDomain: "aiva-9abbb.firebaseapp.com",
    projectId: "aiva-9abbb",
    storageBucket: "aiva-9abbb.firebasestorage.app",
    messagingSenderId: "565052629821",
    appId: "1:565052629821:web:4a0083611ff11011da1b54"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Server configuration
const SERVER_BASE = "https://aiva-gwm9.onrender.com";
