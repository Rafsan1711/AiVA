# AiVA - AI Virtual Assistant

A modern, feature-rich AI chatbot application with chess gameplay functionality, built with Express.js backend and vanilla JavaScript frontend.

## Overview

AiVA is an intelligent virtual assistant that provides conversational AI capabilities along with interactive chess gameplay. The application features a modular architecture, Firebase authentication, real-time messaging, and a sophisticated chess engine powered by Stockfish with minimax fallback.

## Features

- **Conversational AI**: Powered by HuggingFace's GPT OSS 120B model
- **Chess Plugin**: Interactive chess gameplay with Stockfish AI engine
- **User Authentication**: Firebase Auth with Google Sign-In support
- **Real-time Chat**: Message history with Firebase Realtime Database
- **Mobile Responsive**: Professional mobile-first design
- **Plugin System**: Extensible architecture for additional features
- **Archive System**: Save and restore chat conversations
- **Message Limits**: 7 messages per chat session for fair usage
- **Error Handling**: Comprehensive error handling with retry logic
- **Sound Effects**: Audio feedback for chess moves and game events

## Technology Stack

### Backend
- **Node.js** with Express.js
- **HuggingFace API** for AI responses
- **CORS** enabled for cross-origin requests
- **Body Parser** for request handling
- **dotenv** for environment configuration

### Frontend
- **Vanilla JavaScript** (ES6+) with modular architecture
- **Tailwind CSS** for styling
- **Firebase SDK** for authentication and database
- **Chess.js** for chess logic
- **Chessboard.js** for chess board UI
- **jQuery** for DOM manipulation (chess components)

### External Services
- **Firebase Authentication** for user management
- **Firebase Realtime Database** for data storage
- **HuggingFace Inference API** for AI responses
- **Stockfish.js** for chess AI engine

## File Structure

```
project/
├── package.json                    # Node.js dependencies and scripts
├── server.js                       # Express.js backend server
├── index.html                      # Main HTML file with all modals and UI
├── css/
│   └── styles.css                  # Complete CSS styling and animations
├── js/
│   ├── config.js                   # Firebase configuration and server settings
│   ├── constants.js                # Application constants and chess evaluation tables
│   ├── state.js                    # Global state management (AppState, ChessState)
│   ├── utils.js                    # Utility functions and helpers
│   ├── auth.js                     # Authentication management (login/signup/Google)
│   ├── ui.js                       # UI management and DOM element handling
│   ├── chat.js                     # Chat management and history
│   ├── messages.js                 # Message handling and AI communication
│   ├── storage.js                  # Local storage and archive management
│   ├── plugins/
│   │   └── chess-plugin.js         # Complete chess plugin with Stockfish integration
│   └── app.js                      # Main application entry point and initialization
├── sounds/                         # Audio files for chess sound effects
│   ├── move.mp3
│   ├── capture.mp3
│   ├── promote.mp3
│   ├── castling.mp3
│   ├── incorrect-move.mp3
│   ├── check.mp3
│   └── checkmate.mp3
├── pieces/                         # Chess piece SVG images
│   ├── wK.svg, wQ.svg, wR.svg, wB.svg, wN.svg, wP.svg
│   └── bK.svg, bQ.svg, bR.svg, bB.svg, bN.svg, bP.svg
└── README.md                       # This file
```

## Detailed File Descriptions

### Backend Files

#### `package.json`
Contains all Node.js dependencies, scripts, and project metadata:
- **Dependencies**: express, cors, body-parser, node-fetch, dotenv
- **Dev Dependencies**: nodemon for development
- **Scripts**: start, dev, build, test commands

#### `server.js`
Main Express.js server with comprehensive API endpoints:
- **AI Query Endpoint** (`/api/query`): Handles conversational AI with context awareness
- **Chess Support**: Special handling for chess conversations with Chess Master persona
- **Error Handling**: Retry logic, timeout handling, and graceful error responses
- **Plugin System**: Endpoints for plugin management and chess analysis
- **CORS Configuration**: Proper cross-origin setup for frontend integration
- **Health Checks**: Status endpoints for monitoring server health

### Frontend Files

#### `index.html`
Complete HTML structure with all UI components:
- **Modals**: Terms, Authentication, Settings, Archive, Plugins
- **Chat Interface**: Messages container, input area, mobile-responsive design
- **Sidebars**: Desktop and mobile navigation with chat history
- **Chess Integration**: Audio elements for sound effects
- **CDN Links**: All external dependencies (Tailwind, Firebase, Chess libraries)

#### `css/styles.css`
Comprehensive styling for the entire application:
- **Responsive Design**: Mobile-first approach with desktop adaptations
- **Animations**: Fade-in effects, typing indicators, pulse animations
- **Chess Styling**: Board highlights, move effects, piece transitions
- **Plugin Cards**: Interactive plugin interface styling
- **Modal Styling**: All modal windows and overlays

### JavaScript Modules

#### `js/config.js`
Firebase and server configuration:
- **Firebase Config**: API keys, project ID, authentication domain
- **Server Settings**: Backend URL configuration
- **Initialization**: Firebase app initialization

#### `js/constants.js`
Application constants and chess engine data:
- **Chess Pieces**: Image path candidates for piece resolution
- **Evaluation Tables**: Position-based piece values for chess AI
- **Game Constants**: Message limits, sound types, AI modes

#### `js/state.js`
Global state management:
- **AppState**: User authentication, chat data, message counts, plugin states
- **ChessState**: Chess game state, engine configuration, board state
- **Storage Integration**: localStorage load/save functionality

#### `js/utils.js`
Utility functions and helpers:
- **Message Formatting**: Markdown parsing, HTML escaping
- **DOM Manipulation**: Element show/hide, class management
- **Date/Time**: Formatting functions for timestamps
- **Chess Utilities**: Text parsing, image loading, hardware detection

#### `js/auth.js`
Authentication management:
- **Login/Signup**: Email/password authentication
- **Google Auth**: Google Sign-In integration
- **User Data**: Profile loading and UI updates
- **Session Management**: Sign-out and state cleanup

#### `js/ui.js`
UI management and DOM interactions:
- **Modal Control**: Show/hide all application modals
- **Mobile Interface**: Sidebar management, responsive behavior
- **Message Display**: Chat UI updates, welcome messages
- **Plugin UI**: Enabled plugin display and interaction

#### `js/chat.js`
Chat management and conversation handling:
- **Chat Creation**: New regular and chess conversations
- **History Management**: Firebase integration for chat storage
- **Chat Loading**: Restore previous conversations with context
- **Archive System**: Chat archiving and restoration

#### `js/messages.js`
Message handling and AI communication:
- **Message Sending**: User input processing and validation
- **AI Integration**: HuggingFace API communication with context
- **Chess Messages**: Special handling for chess conversation flow
- **UI Updates**: Message display, typing indicators, error handling

#### `js/storage.js`
Storage management and data persistence:
- **Local Storage**: Terms, plugins, archived chats
- **Archive Management**: Chat archiving and restoration functionality
- **Plugin Management**: Plugin state management and UI updates
- **Data Validation**: Storage error handling and recovery

#### `js/plugins/chess-plugin.js`
Complete chess plugin implementation:
- **Engine Integration**: Stockfish.js setup and communication
- **Board Management**: Chessboard.js integration and event handling
- **Game Logic**: Move validation, AI opponent, game state tracking
- **Sound System**: Audio feedback for all chess actions
- **PGN Generation**: Move notation and game recording
- **Evaluation**: Position analysis and minimax algorithm fallback

#### `js/app.js`
Main application initialization:
- **App Bootstrap**: Manager initialization and event setup
- **Error Handling**: Global error catching and user notification
- **Lifecycle Management**: Window events, cleanup, graceful shutdown
- **Debug Tools**: Development helpers and state inspection

## Installation and Setup

### Prerequisites
- Node.js 16+ and npm 8+
- HuggingFace API token
- Firebase project with Authentication and Realtime Database enabled

### Environment Variables
Create a `.env` file in the root directory:
```env
HF_TOKEN=your_huggingface_api_token
FRONTEND_ORIGIN=http://localhost:3000
NODE_ENV=development
```

### Installation Steps
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure Firebase in `js/config.js`
4. Add chess piece images to `pieces/` directory
5. Add sound files to `sounds/` directory
6. Start development server: `npm run dev`
7. Open browser to `http://localhost:3000`

### Production Deployment
1. Set environment variables on your hosting platform
2. Update Firebase config for production domain
3. Run `npm start` for production mode
4. Ensure all static assets are properly served

## Usage

### Basic Chat
1. Accept terms of service
2. Sign in with email/password or Google
3. Start typing messages (7 message limit per chat)
4. Create new chats as needed

### Chess Plugin
1. Enable Chess Master plugin in settings
2. Start a chess conversation
3. Say "yes" or "let's play" to begin a game
4. Use drag-and-drop or click-to-move interaction
5. Enjoy AI analysis and post-game insights

### Mobile Usage
- Fully responsive design works on all screen sizes
- Touch-friendly chess board interaction
- Mobile-optimized sidebar and navigation

## Development

### Architecture Principles
- **Modular Design**: Each file has a single responsibility
- **State Management**: Centralized state with proper encapsulation
- **Error Handling**: Comprehensive error catching and user feedback
- **Plugin System**: Extensible architecture for new features

### Adding New Features
1. Create new module in `js/` directory
2. Add to `index.html` script loading order
3. Initialize in `app.js`
4. Update documentation

### Plugin Development
1. Create plugin file in `js/plugins/`
2. Implement plugin interface
3. Add plugin metadata to server
4. Update UI plugin management

## API Endpoints

### Main Endpoints
- `GET /` - Health check and service info
- `POST /api/query` - AI conversation endpoint
- `GET /api/status` - Server status and configuration
- `GET /api/models` - Available AI models
- `GET /api/plugins` - Plugin information
- `POST /api/plugins/:id/toggle` - Toggle plugin state

### Chess Endpoints
- `POST /api/chess/analyze` - Position analysis
- `GET /api/chess/validate` - Asset validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the modular architecture patterns
4. Add comprehensive error handling
5. Test on both desktop and mobile
6. Submit a pull request



## Support

For issues and questions:
1. Check the browser console for errors
2. Verify all environment variables are set
3. Ensure Firebase is properly configured
4. Check that all asset files are present

## Version History

- **v1.0.0**: Initial release with basic chat functionality
- **v2.0.0**: Added chess plugin and modular architecture
- **v2.1.0**: Enhanced mobile support and error handling

## Acknowledgments

- HuggingFace for AI model access
- Firebase for backend services
- Chess.js and Chessboard.js for chess functionality
- Stockfish for chess engine
- Tailwind CSS for styling framework
