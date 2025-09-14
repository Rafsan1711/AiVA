// Chess Plugin

const ChessPlugin = {
    // Initialize chess plugin
    initialize: function() {
        if (typeof Chess === 'undefined') {
            console.warn('Chess library not loaded');
            return;
        }
        this.resolveAllPieces().then(() => {
            this.initStockfish();
        });
    },

    // Load image helper function
    loadImage: function(url) {
        return new Promise(function(resolve, reject) {
            const img = new Image();
            img.onload = function() { resolve(url) };
            img.onerror = function() { reject(url) };
            img.src = url;
        });
    },

    // Resolve piece images
    resolvePiece: async function(key, candidates) {
        for (let i = 0; i < candidates.length; i++) {
            try {
                const ok = await this.loadImage(candidates[i]);
                console.log('Loaded piece', key, '->', candidates[i]);
                return candidates[i];
            } catch(e) {}
        }
        console.warn('No image found for', key, candidates);
        return null;
    },

    // Resolve all piece images
    resolveAllPieces: async function() {
        const keys = Object.keys(pieceCandidates);
        for (let i = 0; i < keys.length; i++) {
            ChessState.pieceImgResolved[keys[i]] = await this.resolvePiece(keys[i], pieceCandidates[keys[i]]);
        }
        if (!ChessState.pieceImgResolved['bN']) {
            if (ChessState.pieceImgResolved['wN']) ChessState.pieceImgResolved['bN'] = ChessState.pieceImgResolved['wN'];
            else {
                for (const p in ChessState.pieceImgResolved)
                    if (ChessState.pieceImgResolved[p]) {
                        ChessState.pieceImgResolved['bN'] = ChessState.pieceImgResolved[p];
                        break;
                    }
            }
        }
        let defaultAny = null;
        for (const k in ChessState.pieceImgResolved)
            if (ChessState.pieceImgResolved[k]) {
                defaultAny = ChessState.pieceImgResolved[k];
                break;
            }
        for (const k2 in ChessState.pieceImgResolved)
            if (!ChessState.pieceImgResolved[k2])
                ChessState.pieceImgResolved[k2] = defaultAny;
        console.log('Resolved pieces:', ChessState.pieceImgResolved);
        return ChessState.pieceImgResolved;
    },

    // Compute engine options
    computeEngineOptions: function() {
        const hwc = Utils.getHardwareConcurrency();
        const isMobile = Utils.isMobile();
        const threads = isMobile ? 1 : Math.min(4, Math.max(1, Math.floor(hwc)));
        const hash = isMobile ? 16 : 64;
        const movetime = isMobile ? 350 : (hwc >= 8 ? 1200 : 800);
        const skill = 20;
        ChessState.engineOpts = { threads, hash, movetime, skill, isMobile, hwc };
        ChessState.stockfishMovetime = movetime;
        return ChessState.engineOpts;
    },

    // Create Stockfish blob worker
    createStockfishBlobWorker: function(cdnUrl) {
        try {
            const blobCode = "importScripts('" + cdnUrl + "');";
            const blob = new Blob([blobCode], { type: 'application/javascript' });
            const blobURL = URL.createObjectURL(blob);
            const w = new Worker(blobURL);
            setTimeout(() => { URL.revokeObjectURL(blobURL); }, 5000);
            return w;
        } catch (e) {
            console.error('createStockfishBlobWorker failed', e);
            return null;
        }
    },

    // Initialize Stockfish engine
    initStockfish: function() {
        const opts = this.computeEngineOptions();
        console.log('Engine options:', opts);

        try {
            if (typeof STOCKFISH === 'function') {
                ChessState.stockfishEngine = STOCKFISH();
            } else {
                const cdn = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';
                ChessState.stockfishEngine = this.createStockfishBlobWorker(cdn);
            }
        } catch (e) {
            console.warn('Stockfish init attempt failed:', e);
            ChessState.stockfishEngine = null;
        }

        if (!ChessState.stockfishEngine) {
            ChessState.engineReady = false;
            console.warn('Stockfish not available; using minimax fallback.');
            return;
        }

        ChessState.engineDefaultHandler = (ev) => {
            const line = Utils.textFromEvent(ev).trim();
            if (!line) return;
            console.log('stockfish:', line);
            if (line.indexOf('readyok') !== -1) {
                ChessState.engineReady = true;
            }
        };

        try {
            ChessState.stockfishEngine.onmessage = ChessState.engineDefaultHandler;
            ChessState.stockfishEngine.postMessage('uci');
            ChessState.stockfishEngine.postMessage('setoption name Threads value ' + (ChessState.engineOpts.threads || this.computeEngineOptions().threads));
            ChessState.stockfishEngine.postMessage('setoption name Hash value ' + (ChessState.engineOpts.hash || this.computeEngineOptions().hash));
            ChessState.stockfishEngine.postMessage('setoption name Skill Level value ' + (ChessState.engineOpts.skill || this.computeEngineOptions().skill));
            ChessState.stockfishEngine.postMessage('setoption name UCI_LimitStrength value false');
            ChessState.stockfishEngine.postMessage('isready');
        } catch (e) {
            console.error('Error configuring stockfish:', e);
        }
    },

    // Get best move from Stockfish
    stockfishBestMove: function(fen, movetimeMs) {
        return new Promise((resolve, reject) => {
            if (!ChessState.stockfishEngine || !ChessState.engineReady) return reject('engine not ready');
            if (ChessState.engineBusy) return reject('engine busy');
            ChessState.engineBusy = true;

            const prevHandler = ChessState.stockfishEngine.onmessage;
            let timeoutId = null;

            const capture = (ev) => {
                const line = Utils.textFromEvent(ev).trim();
                if (!line) return;
                if (line.indexOf('bestmove') === 0) {
                    try {
                        const parts = line.split(/\s+/);
                        const best = parts[1];
                        try { ChessState.stockfishEngine.onmessage = prevHandler; } catch (e) { }
                        if (timeoutId) clearTimeout(timeoutId);
                        ChessState.engineBusy = false;
                        resolve(best);
                    } catch (err) {
                        try { ChessState.stockfishEngine.onmessage = prevHandler; } catch (e) { }
                        if (timeoutId) clearTimeout(timeoutId);
                        ChessState.engineBusy = false;
                        reject(err);
                    }
                }
            };

            try {
                ChessState.stockfishEngine.onmessage = capture;
                ChessState.stockfishEngine.postMessage('position fen ' + fen);
                ChessState.stockfishEngine.postMessage('go movetime ' + parseInt(movetimeMs, 10));
            } catch (e) {
                try { ChessState.stockfishEngine.onmessage = prevHandler; } catch (ignore) { }
                ChessState.engineBusy = false;
                return reject(e);
            }

            timeoutId = setTimeout(() => {
                try { ChessState.stockfishEngine.onmessage = prevHandler; } catch (e) { }
                ChessState.engineBusy = false;
                reject('timeout');
            }, Math.max(8000, movetimeMs + 4000));
        });
    },

    // Evaluate board position
    evaluateBoard: function(game, move, prevSum, color) {
        if (game.in_checkmate()) {
            if (move.color === color) return 1e10;
            else return -1e10;
        }
        if (game.in_draw() || game.in_threefold_repetition() || game.in_stalemate()) return 0;
        if (game.in_check()) {
            if (move.color === color) prevSum += 50;
            else prevSum -= 50;
        }
        const from = [8 - parseInt(move.from[1]), move.from.charCodeAt(0) - 'a'.charCodeAt(0)];
        const to = [8 - parseInt(move.to[1]), move.to.charCodeAt(0) - 'a'.charCodeAt(0)];
        if (prevSum < -1500 && move.piece === 'k') move.piece = 'k_e';
        if ('captured' in move) {
            if (move.color === color) prevSum += weights[move.captured] + pstOpponent[move.color][move.captured][to[0]][to[1]];
            else prevSum -= weights[move.captured] + pstSelf[move.color][move.captured][to[0]][to[1]];
        }
        if (move.flags && move.flags.includes('p')) {
            move.promotion = 'q';
            if (move.color === color) {
                prevSum -= weights[move.piece] + pstSelf[move.color][move.piece][from[0]][from[1]];
                prevSum += weights[move.promotion] + pstSelf[move.color][move.promotion][to[0]][to[1]];
            } else {
                prevSum += weights[move.piece] + pstSelf[move.color][move.piece][from[0]][from[1]];
                prevSum -= weights[move.promotion] + pstSelf[move.color][move.promotion][to[0]][to[1]];
            }
        } else {
            if (move.color !== color) {
                prevSum += pstSelf[move.color][move.piece][from[0]][from[1]];
                prevSum -= pstSelf[move.color][move.piece][to[0]][to[1]];
            } else {
                prevSum -= pstSelf[move.color][move.piece][from[0]][from[1]];
                prevSum += pstSelf[move.color][move.piece][to[0]][to[1]];
            }
        }
        return prevSum;
    },

    // Minimax algorithm
    minimax: function(game, depth, alpha, beta, isMax, sum, color) {
        const children = game.ugly_moves({ verbose: true });
        children.sort(() => 0.5 - Math.random());
        if (depth === 0 || children.length === 0) return [null, sum];
        let maxV = Number.NEGATIVE_INFINITY, minV = Number.POSITIVE_INFINITY, best = null;
        for (let i = 0; i < children.length; i++) {
            const m = children[i];
            const pm = game.ugly_move(m);
            const newSum = this.evaluateBoard(game, pm, sum, color);
            const [, childVal] = this.minimax(game, depth - 1, alpha, beta, !isMax, newSum, color);
            game.undo();
            if (isMax) {
                if (childVal > maxV) { maxV = childVal; best = pm; }
                if (childVal > alpha) alpha = childVal;
            } else {
                if (childVal < minV) { minV = childVal; best = pm; }
                if (childVal < beta) beta = childVal;
            }
            if (alpha >= beta) break;
        }
        return isMax ? [best, maxV] : [best, minV];
    },

    // Get best move using minimax
    getBestMoveMinimax: function(game, color, currSum) {
        const depth = 2;
        return this.minimax(game, depth, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, true, currSum, color)[0];
    },

    // Create chess board HTML
    createChessBoard: function() {
        const boardId = 'chessBoard_' + Date.now();
        const pgnId = 'pgnMoves_' + Date.now();
        
        // Initialize new chess game
        ChessState.chessGame = new Chess();
        ChessState.globalSum = 0;
        ChessState.pgn_moves = [];
        ChessState.inputLocked = false;
        ChessState.processingMove = false;
        ChessState.selectedSquare = null;
        ChessState.legalTargets = [];

        const chessHTML = `
            <div class="chess-container">
                <div id="${boardId}" class="chess-board"></div>
                <div class="pgn-table">
                    <h4 class="font-semibold mb-2">Game Moves</h4>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>White</th>
                                <th>Black</th>
                            </tr>
                        </thead>
                        <tbody id="${pgnId}">
                            <tr><td colspan="3" class="text-center text-gray-400">Game will start soon...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Initialize board after DOM update
        setTimeout(() => {
            this.initChessBoard(boardId, pgnId);
        }, 100);

        return chessHTML;
    },

    // Initialize chess board
    initChessBoard: function(boardId, pgnId) {
        const pieceTheme = (piece) => {
            if (ChessState.pieceImgResolved && ChessState.pieceImgResolved[piece]) return ChessState.pieceImgResolved[piece];
            return 'pieces/wP.svg'; // fallback
        };

        const config = {
            draggable: true,
            position: 'start',
            pieceTheme: pieceTheme,
            moveSpeed: 250,
            snapbackSpeed: 200,
            snapSpeed: 100,
            onDragStart: (source, piece) => {
                if (ChessState.inputLocked) return false;
                try {
                    if (ChessState.chessGame.game_over()) return false;
                    if (!piece) return false;
                    if ((ChessState.chessGame.turn() === 'w' && piece.search(/^b/) !== -1) || 
                        (ChessState.chessGame.turn() === 'b' && piece.search(/^w/) !== -1)) return false;
                } catch (e) {
                    console.warn('onDragStart guard triggered', e);
                    return false;
                }
            },
            onDrop: (source, target) => {
                if (ChessState.inputLocked) return 'snapback';
                const move = ChessState.chessGame.move({ from: source, to: target, promotion: 'q' });
                if (move === null) {
                    this.playChessSound(CHESS_SOUNDS.INCORRECT);
                    return 'snapback';
                }
                ChessState.inputLocked = true;
                this.doMoveLogic(move, source, target, true, boardId, pgnId);
                return;
            },
            onSnapEnd: () => {
                ChessState.chessBoard.position(ChessState.chessGame.fen());
            }
        };

        ChessState.chessBoard = Chessboard(boardId, config);
        
        setTimeout(() => {
            $(`#${boardId} .chessboard-js-piece`).css('transition', 'top 0.25s, left 0.25s');
        }, 1000);

        // Add click handlers
        this.setupChessClickHandlers(boardId, pgnId);
    },

    // Setup chess click handlers
    setupChessClickHandlers: function(boardId, pgnId) {
        $(`#${boardId}`).on('click', '.square-55d63', (event) => {
            if (ChessState.inputLocked) return;
            const square = $(event.currentTarget).attr('data-square');
            if (ChessState.chessGame.game_over()) return;
            if (!ChessState.selectedSquare) {
                const piece = ChessState.chessGame.get(square);
                if (!piece || piece.color !== ChessState.chessGame.turn()) return;
                ChessState.selectedSquare = square;
                this.clearChessHighlights(boardId);
                $(`#${boardId} .square-` + square).addClass('highlight-click');
                const moves = ChessState.chessGame.moves({ square: square, verbose: true });
                ChessState.legalTargets = moves.map(m => m.to);
                this.highlightChessSquares(ChessState.legalTargets, 'highlight-target', boardId);
            } else {
                if (square === ChessState.selectedSquare) {
                    ChessState.selectedSquare = null;
                    ChessState.legalTargets = [];
                    this.clearChessHighlights(boardId);
                    return;
                }
                if (ChessState.legalTargets.includes(square)) {
                    const move = ChessState.chessGame.move({ from: ChessState.selectedSquare, to: square, promotion: 'q' });
                    if (move === null) {
                        this.playChessSound(CHESS_SOUNDS.INCORRECT);
                        this.clearChessHighlights(boardId);
                        ChessState.selectedSquare = null;
                        ChessState.legalTargets = [];
                        ChessState.chessBoard.position(ChessState.chessGame.fen());
                        return;
                    }
                    ChessState.inputLocked = true;
                    this.doMoveLogic(move, ChessState.selectedSquare, square, false, boardId, pgnId);
                    return;
                }
                const piece2 = ChessState.chessGame.get(square);
                if (piece2 && piece2.color === ChessState.chessGame.turn()) {
                    ChessState.selectedSquare = square;
                    this.clearChessHighlights(boardId);
                    $(`#${boardId} .square-` + square).addClass('highlight-click');
                    const moves = ChessState.chessGame.moves({ square: square, verbose: true });
                    ChessState.legalTargets = moves.map(m => m.to);
                    this.highlightChessSquares(ChessState.legalTargets, 'highlight-target', boardId);
                    return;
                }
                ChessState.selectedSquare = null;
                ChessState.legalTargets = [];
                this.clearChessHighlights(boardId);
            }
        });

        $(document).on('click', (e) => {
            if ($(e.target).closest(`#${boardId}`).length === 0) {
                this.clearChessHighlights(boardId);
                ChessState.selectedSquare = null;
                ChessState.legalTargets = [];
            }
        });

        $(`#${boardId}`).on('mousedown', '.square-55d63', () => {
            this.clearChessHighlights(boardId);
            ChessState.selectedSquare = null;
            ChessState.legalTargets = [];
        });
    },

    // Handle move logic
    doMoveLogic: async function(move, source, target, isDrag, boardId, pgnId) {
        if (ChessState.processingMove) {
            console.warn('doMoveLogic re-entry blocked');
            return;
        }
        ChessState.processingMove = true;
        try {
            this.playChessMoveEffectAndSound(move);
            this.boardChessMoveEffect(source, boardId);
            this.boardChessMoveEffect(target, boardId);
            ChessState.globalSum = this.evaluateBoard(ChessState.chessGame, move, ChessState.globalSum, 'b');

            if (!isDrag) ChessState.chessBoard.position(ChessState.chessGame.fen());

            this.clearChessHighlights(boardId);
            ChessState.selectedSquare = null;

            // Update PGN table
            this.updatePGNTable(move, pgnId);

            await Utils.sleep(300);

            if (ChessState.chessGame.game_over() || ChessState.chessGame.turn() !== 'b') {
                ChessState.inputLocked = false;
                ChessState.processingMove = false;
                
                if (ChessState.chessGame.game_over()) {
                    this.handleGameEnd(pgnId);
                }
                return;
            }

            // AI move
            if (ChessState.aiMode === AI_MODES.STOCKFISH && ChessState.stockfishEngine && ChessState.engineReady) {
                try {
                    const fen = ChessState.chessGame.fen();
                    console.log('Requesting SF bestmove for fen:', fen);
                    const best = await this.stockfishBestMove(fen, ChessState.stockfishMovetime).catch(e => {
                        console.warn('SF query failed:', e);
                        return null;
                    });
                    console.log('Stockfish answered bestmove:', best);

                    if (best && best !== '(none)') {
                        const from = best.slice(0, 2);
                        const to = best.slice(2, 4);
                        const promotion = (best.length > 4) ? best[4] : null;

                        const legals = ChessState.chessGame.moves({ verbose: true });
                        let matched = null;
                        for (let i = 0; i < legals.length; i++) {
                            const m = legals[i];
                            if (m.from === from && m.to === to) {
                                if (promotion) {
                                    if (m.promotion && m.promotion === promotion.toLowerCase()) {
                                        matched = m;
                                        break;
                                    }
                                } else {
                                    matched = m;
                                    break;
                                }
                            }
                        }

                        if (matched) {
                            console.log('Applying SF move (validated):', matched);
                            const botMove = ChessState.chessGame.move({
                                from: matched.from,
                                to: matched.to,
                                promotion: matched.promotion || 'q'
                            });
                            if (botMove) {
                                this.playChessMoveEffectAndSound(botMove);
                                this.boardChessMoveEffect(botMove.from, boardId);
                                this.boardChessMoveEffect(botMove.to, boardId);
                                ChessState.globalSum = this.evaluateBoard(ChessState.chessGame, botMove, ChessState.globalSum, 'b');
                                ChessState.chessBoard.position(ChessState.chessGame.fen());
                                this.updatePGNTable(botMove, pgnId);
                                ChessState.inputLocked = false;
                                ChessState.processingMove = false;
                                
                                if (ChessState.chessGame.game_over()) {
                                    this.handleGameEnd(pgnId);
                                }
                                return;
                            } else {
                                console.warn('game.move returned null despite matched legal move:', matched);
                            }
                        } else {
                            console.warn('Stockfish suggested move not found in legal moves:', best);
                        }
                    } else {
                        console.warn('Stockfish returned no usable bestmove:', best);
                    }
                } catch (e) {
                    console.warn('Stockfish error during move apply -> fallback to minimax', e);
                }
            }

            // Fallback minimax
            if (!ChessState.chessGame.game_over() && ChessState.chessGame.turn() === 'b') {
                const botMove = this.getBestMoveMinimax(ChessState.chessGame, 'b', ChessState.globalSum);
                if (botMove) {
                    ChessState.chessGame.move(botMove);
                    this.playChessMoveEffectAndSound(botMove);
                    this.boardChessMoveEffect(botMove.from, boardId);
                    this.boardChessMoveEffect(botMove.to, boardId);
                    ChessState.globalSum = this.evaluateBoard(ChessState.chessGame, botMove, ChessState.globalSum, 'b');
                    ChessState.chessBoard.position(ChessState.chessGame.fen());
                    this.updatePGNTable(botMove, pgnId);
                    
                    if (ChessState.chessGame.game_over()) {
                        this.handleGameEnd(pgnId);
                    }
                } else {
                    console.warn('Minimax did not return move — position may be terminal.');
                }
            }

            ChessState.inputLocked = false;
        } finally {
            ChessState.processingMove = false;
        }
    },

    // Update PGN table
    updatePGNTable: function(move, pgnId) {
        ChessState.pgn_moves.push(move);
        const pgnBody = document.getElementById(pgnId);
        if (!pgnBody) return;

        // Clear existing content
        pgnBody.innerHTML = '';

        // Group moves in pairs (white, black)
        for (let i = 0; i < ChessState.pgn_moves.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = ChessState.pgn_moves[i];
            const blackMove = ChessState.pgn_moves[i + 1];

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="text-center">${moveNumber}</td>
                <td>${whiteMove ? whiteMove.san : ''}</td>
                <td>${blackMove ? blackMove.san : ''}</td>
            `;
            pgnBody.appendChild(row);
        }
    },

    // Handle game end
    handleGameEnd: function(pgnId) {
        setTimeout(() => {
            let gameResult = '';
            let analysis = '';
            
            if (ChessState.chessGame.in_checkmate()) {
                const winner = ChessState.chessGame.turn() === 'w' ? 'Black' : 'White';
                gameResult = `Game Over - ${winner} wins by checkmate!`;
                
                if (winner === 'White') {
                    analysis = "Congratulations! You played brilliantly and achieved checkmate. That was a fantastic game! Your strategic thinking really showed in those final moves. I was impressed by your tactical awareness.";
                } else {
                    analysis = "Great game! Even though I managed to get checkmate this time, you played very well and put up strong resistance. I particularly liked some of your middle game moves - they really made me think carefully about my strategy.";
                }
            } else if (ChessState.chessGame.in_stalemate()) {
                gameResult = 'Game Over - Stalemate! It\'s a draw.';
                analysis = "What an interesting game that ended in stalemate! That's actually quite a sophisticated outcome. You managed the endgame well to achieve this draw. Stalemate can be a great defensive resource!";
            } else if (ChessState.chessGame.in_draw()) {
                gameResult = 'Game Over - Draw!';
                analysis = "A well-fought draw! Both sides played solidly. These kinds of balanced games really show good positional understanding from both players. Well done!";
            }

            // Add result to PGN table
            const pgnBody = document.getElementById(pgnId);
            if (pgnBody) {
                const resultRow = document.createElement('tr');
                resultRow.innerHTML = `<td colspan="3" class="text-center font-bold text-green-400">${gameResult}</td>`;
                pgnBody.appendChild(resultRow);
            }

            // Send analysis message
            setTimeout(() => {
                MessageManager.addMessage(analysis, 'assistant');
                AppState.conversationHistory.push({ role: 'assistant', content: analysis });
                ChatManager.saveChatToHistory();
            }, 1500);
        }, 1000);
    },

    // Chess sound effects
    playChessSound: function(type) {
        const sounds = {
            [CHESS_SOUNDS.MOVE]: document.getElementById('moveSound'),
            [CHESS_SOUNDS.CAPTURE]: document.getElementById('captureSound'),
            [CHESS_SOUNDS.PROMOTE]: document.getElementById('promoteSound'),
            [CHESS_SOUNDS.CASTLING]: document.getElementById('castlingSound'),
            [CHESS_SOUNDS.INCORRECT]: document.getElementById('incorrectMoveSound'),
            [CHESS_SOUNDS.CHECK]: document.getElementById('checkSound'),
            [CHESS_SOUNDS.CHECKMATE]: document.getElementById('checkmateSound')
        };
        
        if (sounds[type]) {
            sounds[type].currentTime = 0;
            sounds[type].play().catch(() => {});
        }
    },

    // Board move effect
    boardChessMoveEffect: function(square, boardId) {
        const $sq = $(`#${boardId} .square-` + square);
        $sq.addClass('move-effect');
        setTimeout(() => { $sq.removeClass('move-effect'); }, 400);
    },

    // Play move effect and sound
    playChessMoveEffectAndSound: function(move) {
        if (move.flags.includes('k') || move.flags.includes('q')) this.playChessSound(CHESS_SOUNDS.CASTLING);
        else if (move.flags.includes('p')) this.playChessSound(CHESS_SOUNDS.PROMOTE);
        else if (move.flags.includes('c') || move.flags.includes('e')) this.playChessSound(CHESS_SOUNDS.CAPTURE);
        else this.playChessSound(CHESS_SOUNDS.MOVE);
        
        if (ChessState.chessGame.in_checkmate()) this.playChessSound(CHESS_SOUNDS.CHECKMATE);
        else if (ChessState.chessGame.in_check()) this.playChessSound(CHESS_SOUNDS.CHECK);
    },

    // Clear chess highlights
    clearChessHighlights: function(boardId) {
        $(`#${boardId} .square-55d63`).removeClass('highlight-click highlight-target');
    },

    // Highlight chess squares
    highlightChessSquares: function(squares, cls, boardId) {
        squares.forEach(sq => {
            $(`#${boardId} .square-` + sq).addClass(cls);
        });
    }
};
