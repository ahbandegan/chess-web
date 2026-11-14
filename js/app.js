// Main Chess Application Controller

class ChessApp {
  constructor() {
    this.game = new Chess();
    this.boardElement = document.getElementById('chess-board');
    this.flipped = false; // false: White bottom, true: Black bottom
    this.playerColor = 'w'; // In online or vs AI: your color
    this.gameMode = 'local'; // 'local', 'ai', 'online'
    this.aiDifficulty = 2; // 1: Easy, 2: Medium, 3: Hard

    // Selection & Drag state
    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.draggedSquare = null;
    this.dragClone = null;

    // Promotion pending state
    this.pendingMove = null;

    // Clocks
    this.timeControl = 10 * 60; // default 10 mins (seconds)
    this.whiteTime = this.timeControl;
    this.blackTime = this.timeControl;
    this.timerInterval = null;
    this.timerActive = false;

    // UI elements
    this.initElements();
    this.initEventListeners();
    this.initAudioContextTriggers();
    this.checkUrlParams();
    this.renderBoard();
    this.updateStatus();
  }

  initElements() {
    this.statusTextEl = document.getElementById('status-text');
    this.movesListEl = document.getElementById('moves-list');
    this.whiteClockEl = document.getElementById('white-clock');
    this.blackClockEl = document.getElementById('black-clock');
    this.whitePlayerCard = document.getElementById('player-card-white');
    this.blackPlayerCard = document.getElementById('player-card-black');
    this.whiteCapturedEl = document.getElementById('white-captured');
    this.blackCapturedEl = document.getElementById('black-captured');
    this.whiteDiffEl = document.getElementById('white-material-diff');
    this.blackDiffEl = document.getElementById('black-material-diff');
    this.modeBadgeEl = document.getElementById('mode-badge');

    // Modals
    this.modeModal = document.getElementById('mode-modal');
    this.onlineModal = document.getElementById('online-modal');
    this.promotionModal = document.getElementById('promotion-modal');
    this.gameOverModal = document.getElementById('game-over-modal');
    this.settingsModal = document.getElementById('settings-modal');

    // Online panel
    this.onlineBox = document.getElementById('online-chat-box');
    this.chatMessagesEl = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
  }

  initEventListeners() {
    // Top Bar Buttons
    document.getElementById('btn-new-game').addEventListener('click', () => this.showModal(this.modeModal));
    document.getElementById('btn-settings').addEventListener('click', () => this.showModal(this.settingsModal));
    document.getElementById('btn-sound-toggle').addEventListener('click', (e) => this.toggleSound(e.currentTarget));

    // Side Actions
    document.getElementById('btn-flip-board').addEventListener('click', () => this.flipBoard());
    document.getElementById('btn-resign').addEventListener('click', () => this.handleResign());
    document.getElementById('btn-draw').addEventListener('click', () => this.handleDrawOffer());
    document.getElementById('btn-copy-pgn').addEventListener('click', () => this.copyPgn());

    // Chat / Online Actions
    document.getElementById('btn-send-chat').addEventListener('click', () => this.sendChatMessage());
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendChatMessage();
    });

    // Reaction emojis
    document.querySelectorAll('.btn-reaction').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.getAttribute('data-emoji');
        this.sendReaction(emoji);
      });
    });

    // Modal Close buttons
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-overlay');
        this.hideModal(modal);
      });
    });

    // Settings
    document.getElementById('theme-select').addEventListener('change', (e) => {
      document.body.setAttribute('data-theme', e.target.value);
    });

    // Promotion Options
    document.querySelectorAll('.promotion-piece-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pieceType = btn.getAttribute('data-piece');
        this.finalizePromotion(pieceType);
      });
    });

    // Window Resize / Orientation
    window.addEventListener('resize', () => this.renderBoard());
  }

  initAudioContextTriggers() {
    // Audio is initialized automatically via audio.js user gestures
  }

  toggleSound(btn) {
    const isEnabled = chessAudio.toggleSound();
    btn.style.opacity = isEnabled ? '1' : '0.4';
    this.showToast(isEnabled ? 'صدا فعال شد 🔊' : 'صدا قطع شد 🔇');
  }

  checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      this.showOnlineJoinModal(room);
    }
  }

  showOnlineJoinModal(prefilledCode = '') {
    this.showModal(this.onlineModal);
    const joinInput = document.getElementById('join-room-code');
    if (prefilledCode && joinInput) {
      joinInput.value = prefilledCode;
    }
  }

  /* ------------------- MODAL CONTROLLERS ------------------- */
  showModal(modal) {
    if (modal) modal.classList.add('active');
  }

  hideModal(modal) {
    if (modal) modal.classList.remove('active');
  }

  showToast(message, duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /* ------------------- BOARD RENDERING ------------------- */
  renderBoard() {
    this.boardElement.innerHTML = '';
    const boardState = this.game.board();
    const isFlipped = this.flipped;

    const inCheckSquare = this.game.in_check() ? this.getKingSquare(this.game.turn()) : null;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const rankIdx = isFlipped ? r : 7 - r;
        const fileIdx = isFlipped ? 7 - c : c;
        const squareName = String.fromCharCode(97 + fileIdx) + (rankIdx + 1);

        const squareEl = document.createElement('div');
        const isLight = (rankIdx + fileIdx) % 2 !== 0;
        squareEl.className = `square ${isLight ? 'light' : 'dark'}`;
        squareEl.dataset.square = squareName;

        // Last move highlight
        if (this.lastMove && (this.lastMove.from === squareName || this.lastMove.to === squareName)) {
          squareEl.classList.add('last-move');
        }

        // Selection highlight
        if (this.selectedSquare === squareName) {
          squareEl.classList.add('selected');
        }

        // Check highlight
        if (inCheckSquare === squareName) {
          squareEl.classList.add('in-check');
        }

        // Rank / File Coordinate Labels
        if (c === (isFlipped ? 7 : 0)) {
          const rankCoord = document.createElement('span');
          rankCoord.className = 'coord coord-rank';
          rankCoord.textContent = rankIdx + 1;
          squareEl.appendChild(rankCoord);
        }
        if (r === (isFlipped ? 0 : 7)) {
          const fileCoord = document.createElement('span');
          fileCoord.className = 'coord coord-file';
          fileCoord.textContent = String.fromCharCode(97 + fileIdx);
          squareEl.appendChild(fileCoord);
        }

        // Legal move indicators
        const legalMove = this.legalMovesForSelected.find(m => m.to === squareName);
        if (legalMove) {
          const indicator = document.createElement('div');
          if (legalMove.captured || this.game.get(squareName)) {
            indicator.className = 'legal-capture';
          } else {
            indicator.className = 'legal-dot';
          }
          squareEl.appendChild(indicator);
        }

        // Piece
        const piece = boardState[7 - rankIdx][fileIdx];
        if (piece) {
          const pieceEl = document.createElement('div');
          pieceEl.className = 'piece';
          pieceEl.innerHTML = getPieceSvg(piece.color, piece.type);
          pieceEl.dataset.color = piece.color;
          pieceEl.dataset.type = piece.type;
          pieceEl.dataset.square = squareName;

          this.attachPieceInteractions(pieceEl, squareName);
          squareEl.appendChild(pieceEl);
        }

        // Square click
        squareEl.addEventListener('click', (e) => this.handleSquareClick(squareName, e));
        this.boardElement.appendChild(squareEl);
      }
    }

    this.updateCapturedPieces();
    this.updateTurnIndicators();
  }

  getKingSquare(color) {
    const board = this.game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === color) {
          return String.fromCharCode(97 + c) + (8 - r);
        }
      }
    }
    return null;
  }

  /* ------------------- PIECE INTERACTIONS (DRAG & CLICK) ------------------- */
  attachPieceInteractions(pieceEl, squareName) {
    // Touch & Pointer Drag
    pieceEl.addEventListener('pointerdown', (e) => this.handlePointerDown(e, squareName, pieceEl));
  }

  handlePointerDown(e, squareName, pieceEl) {
    if (this.isInteractionLocked()) return;

    const piece = this.game.get(squareName);
    if (!piece) return;

    // Check turn permission
    if (this.gameMode === 'online' && piece.color !== this.playerColor) return;
    if (this.gameMode === 'ai' && piece.color !== this.playerColor) return;
    if (piece.color !== this.game.turn()) return;

    this.draggedSquare = squareName;
    this.selectSquare(squareName);

    // Create floating clone
    const rect = pieceEl.getBoundingClientRect();
    this.dragClone = pieceEl.cloneNode(true);
    this.dragClone.className = 'drag-clone';
    this.dragClone.style.left = `${e.clientX}px`;
    this.dragClone.style.top = `${e.clientY}px`;
    document.body.appendChild(this.dragClone);

    pieceEl.classList.add('dragging');

    const onPointerMove = (moveEvent) => {
      if (this.dragClone) {
        this.dragClone.style.left = `${moveEvent.clientX}px`;
        this.dragClone.style.top = `${moveEvent.clientY}px`;
      }
    };

    const onPointerUp = (upEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      if (this.dragClone) {
        this.dragClone.remove();
        this.dragClone = null;
      }
      pieceEl.classList.remove('dragging');

      // Identify target square
      const dropTarget = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
      const targetSquareEl = dropTarget ? dropTarget.closest('.square') : null;

      if (targetSquareEl && targetSquareEl.dataset.square) {
        const targetSquare = targetSquareEl.dataset.square;
        if (targetSquare !== this.draggedSquare) {
          this.attemptMove(this.draggedSquare, targetSquare);
        }
      }
      this.draggedSquare = null;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  handleSquareClick(squareName, e) {
    if (this.isInteractionLocked()) return;

    // If already selected and clicked a legal target square:
    if (this.selectedSquare) {
      const isLegal = this.legalMovesForSelected.some(m => m.to === squareName);
      if (isLegal) {
        this.attemptMove(this.selectedSquare, squareName);
        return;
      }
    }

    // Otherwise select square if it's the current player's piece
    const piece = this.game.get(squareName);
    if (piece && piece.color === this.game.turn()) {
      if (this.gameMode === 'online' && piece.color !== this.playerColor) return;
      if (this.gameMode === 'ai' && piece.color !== this.playerColor) return;
      this.selectSquare(squareName);
    } else {
      this.clearSelection();
      this.renderBoard();
    }
  }

  selectSquare(squareName) {
    this.selectedSquare = squareName;
    this.legalMovesForSelected = this.game.moves({
      square: squareName,
      verbose: true
    });
    this.renderBoard();
  }

  clearSelection() {
    this.selectedSquare = null;
    this.legalMovesForSelected = [];
  }

  isInteractionLocked() {
    if (this.game.game_over()) return true;
    if (this.gameMode === 'online') {
      if (!peerManager.connected) return true;
      if (this.game.turn() !== this.playerColor) return true;
    }
    if (this.gameMode === 'ai' && this.game.turn() !== this.playerColor) {
      return true;
    }
    return false;
  }

  /* ------------------- MOVE HANDLING & PROMOTION ------------------- */
  attemptMove(from, to) {
    // Check for pawn promotion
    const piece = this.game.get(from);
    const isPawn = piece && piece.type === 'p';
    const isPromotingRank = (piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1');

    if (isPawn && isPromotingRank) {
      const legalPromos = this.game.moves({ verbose: true }).filter(m => m.from === from && m.to === to);
      if (legalPromos.length > 0) {
        this.pendingMove = { from, to };
        this.showPromotionModal(piece.color);
        return;
      }
    }

    this.executeMove({ from, to });
  }

  showPromotionModal(color) {
    const modal = this.promotionModal;
    const pieces = ['q', 'r', 'b', 'n'];
    pieces.forEach(type => {
      const btn = modal.querySelector(`[data-piece="${type}"]`);
      if (btn) {
        btn.innerHTML = getPieceSvg(color, type);
      }
    });
    this.showModal(modal);
  }

  finalizePromotion(pieceType) {
    this.hideModal(this.promotionModal);
    if (this.pendingMove) {
      this.executeMove({
        from: this.pendingMove.from,
        to: this.pendingMove.to,
        promotion: pieceType
      });
      this.pendingMove = null;
    }
  }

  executeMove(moveObj, isNetworkMove = false) {
    const moveResult = this.game.move(moveObj);
    if (!moveResult) {
      this.clearSelection();
      this.renderBoard();
      return false;
    }

    this.lastMove = { from: moveResult.from, to: moveResult.to };
    this.clearSelection();

    // Sound effect
    if (this.game.in_checkmate()) {
      const userWon = this.gameMode === 'online' ? (moveResult.color === this.playerColor) : true;
      chessAudio.playGameOver(userWon);
    } else if (this.game.in_check()) {
      chessAudio.playCheck();
    } else if (moveResult.flags.includes('k') || moveResult.flags.includes('q')) {
      chessAudio.playCastle();
    } else if (moveResult.captured) {
      chessAudio.playCapture();
    } else {
      chessAudio.playMove();
    }

    // Synchronize Clocks
    this.startClock();

    // Broadcast move if Online
    if (this.gameMode === 'online' && !isNetworkMove) {
      peerManager.send({
        type: 'MOVE',
        move: moveObj,
        fen: this.game.fen(),
        whiteTime: this.whiteTime,
        blackTime: this.blackTime,
        pgn: this.game.pgn()
      });
    }

    this.renderBoard();
    this.updateStatus();
    this.appendMoveToHistory(moveResult);

    // AI Turn Trigger
    if (this.gameMode === 'ai' && !this.game.game_over() && this.game.turn() !== this.playerColor) {
      setTimeout(() => this.triggerAiMove(), 450);
    }

    return true;
  }

  /* ------------------- AI OPPONENT ------------------- */
  triggerAiMove() {
    if (this.game.game_over()) return;
    this.statusTextEl.textContent = 'هوش مصنوعی در حال تفکر... 🤖';

    setTimeout(() => {
      const bestMove = chessEngine.getBestMove(this.game, this.aiDifficulty);
      if (bestMove) {
        this.executeMove({
          from: bestMove.from,
          to: bestMove.to,
          promotion: bestMove.promotion || 'q'
        });
      }
    }, 100);
  }

  /* ------------------- CLOCKS & TIMERS ------------------- */
  startClock() {
    if (this.timeControl === 0) return; // Unlimited
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerActive = true;
    this.timerInterval = setInterval(() => {
      if (this.game.game_over()) {
        clearInterval(this.timerInterval);
        return;
      }

      if (this.game.turn() === 'w') {
        this.whiteTime = Math.max(0, this.whiteTime - 1);
        if (this.whiteTime === 0) {
          this.handleTimeout('w');
        }
      } else {
        this.blackTime = Math.max(0, this.blackTime - 1);
        if (this.blackTime === 0) {
          this.handleTimeout('b');
        }
      }
      this.updateClockDisplays();
    }, 1000);
  }

  updateClockDisplays() {
    this.whiteClockEl.textContent = this.formatTime(this.whiteTime);
    this.blackClockEl.textContent = this.formatTime(this.blackTime);

    this.whiteClockEl.classList.toggle('low-time', this.whiteTime < 30 && this.timeControl > 0);
    this.blackClockEl.classList.toggle('low-time', this.blackTime < 30 && this.timeControl > 0);
  }

  formatTime(seconds) {
    if (this.timeControl === 0) return '∞';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  handleTimeout(loserColor) {
    clearInterval(this.timerInterval);
    const winnerColor = loserColor === 'w' ? 'سیاه' : 'سفید';
    const isWinner = this.gameMode === 'online' ? (loserColor !== this.playerColor) : true;
    chessAudio.playGameOver(isWinner);
    this.showGameOverModal(`پایان زمان! ${winnerColor} با اتمام زمان حریف برنده شد.`);
  }

  /* ------------------- CAPTURED PIECES & MATERIAL ADVANTAGE ------------------- */
  updateCapturedPieces() {
    const initialCounts = { p: 8, r: 2, n: 2, b: 2, q: 1 };
    const currentCounts = {
      w: { p: 0, r: 0, n: 0, b: 0, q: 0 },
      b: { p: 0, r: 0, n: 0, b: 0, q: 0 }
    };

    const board = this.game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type !== 'k') {
          currentCounts[piece.color][piece.type]++;
        }
      }
    }

    const whiteCaptured = []; // Pieces captured by White (Black pieces lost)
    const blackCaptured = []; // Pieces captured by Black (White pieces lost)

    let whiteMaterial = 0;
    let blackMaterial = 0;
    const piecePoints = { p: 1, n: 3, b: 3, r: 5, q: 9 };

    for (const [type, count] of Object.entries(initialCounts)) {
      const lostWhite = count - currentCounts.w[type];
      for (let i = 0; i < lostWhite; i++) blackCaptured.push(type);

      const lostBlack = count - currentCounts.b[type];
      for (let i = 0; i < lostBlack; i++) whiteCaptured.push(type);

      whiteMaterial += currentCounts.w[type] * piecePoints[type];
      blackMaterial += currentCounts.b[type] * piecePoints[type];
    }

    // Render Mini SVG icons
    this.whiteCapturedEl.innerHTML = whiteCaptured.map(t => `<div class="captured-piece-mini">${getPieceSvg('b', t)}</div>`).join('');
    this.blackCapturedEl.innerHTML = blackCaptured.map(t => `<div class="captured-piece-mini">${getPieceSvg('w', t)}</div>`).join('');

    const diff = whiteMaterial - blackMaterial;
    this.whiteDiffEl.textContent = diff > 0 ? `+${diff}` : '';
    this.blackDiffEl.textContent = diff < 0 ? `+${Math.abs(diff)}` : '';
  }

  updateTurnIndicators() {
    const isWhite = this.game.turn() === 'w';
    this.whitePlayerCard.classList.toggle('active-turn', isWhite);
    this.blackPlayerCard.classList.toggle('active-turn', !isWhite);
  }

  /* ------------------- MOVE HISTORY ------------------- */
  appendMoveToHistory(move) {
    const history = this.game.history({ verbose: true });
    this.movesListEl.innerHTML = '';

    for (let i = 0; i < history.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = history[i];
      const blackMove = history[i + 1];

      const row = document.createElement('div');
      row.className = 'move-row';
      row.innerHTML = `
        <span class="move-num">${moveNum}.</span>
        <span class="move-san">${whiteMove.san}</span>
        <span class="move-san">${blackMove ? blackMove.san : ''}</span>
      `;
      this.movesListEl.appendChild(row);
    }
    this.movesListEl.scrollTop = this.movesListEl.scrollHeight;
  }

  /* ------------------- STATUS & GAME OVER ------------------- */
  updateStatus() {
    let status = '';
    const moveColor = this.game.turn() === 'w' ? 'سفید' : 'سیاه';

    if (this.game.in_checkmate()) {
      const winner = this.game.turn() === 'w' ? 'سیاه' : 'سفید';
      status = `مات! ${winner} برنده بازی شد. 🏆`;
      this.showGameOverModal(status);
    } else if (this.game.in_draw()) {
      status = 'بازی مساوی شد! 🤝 (پات یا عدم حرکت معتبر)';
      this.showGameOverModal(status);
    } else if (this.game.in_stalemate()) {
      status = 'پات! مساوی.';
      this.showGameOverModal(status);
    } else if (this.game.in_threefold_repetition()) {
      status = 'تکرار سه‌باره موقعیت! مساوی.';
      this.showGameOverModal(status);
    } else if (this.game.insufficient_material()) {
      status = 'مهره‌های ناکافی برای مات! مساوی.';
      this.showGameOverModal(status);
    } else {
      status = `نوبت حرکت: ${moveColor}`;
      if (this.game.in_check()) {
        status += ` (کیش! ⚠️)`;
      }
    }

    this.statusTextEl.textContent = status;
  }

  showGameOverModal(text) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    const modal = this.gameOverModal;
    document.getElementById('game-over-title').textContent = text;
    this.showModal(modal);
  }

  /* ------------------- GAME ACTIONS ------------------- */
  flipBoard() {
    this.flipped = !this.flipped;
    this.renderBoard();
  }

  copyPgn() {
    const pgn = this.game.pgn();
    if (!pgn) {
      this.showToast('هنوز حرکتی ثبت نشده است.');
      return;
    }
    navigator.clipboard.writeText(pgn).then(() => {
      this.showToast('متن PGN در کلیپ‌بورد کپی شد 📋');
    });
  }

  handleResign() {
    if (this.game.game_over()) return;
    if (confirm('آیا مطمئن هستید که می‌خواهید تسلیم شوید؟')) {
      const winner = this.playerColor === 'w' ? 'سیاه' : 'سفید';
      if (this.gameMode === 'online') {
        peerManager.send({ type: 'RESIGN', by: this.playerColor });
      }
      chessAudio.playGameOver(false);
      this.showGameOverModal(`${this.playerColor === 'w' ? 'سفید' : 'سیاه'} تسلیم شد. ${winner} برنده است.`);
    }
  }

  handleDrawOffer() {
    if (this.game.game_over()) return;
    if (this.gameMode === 'online') {
      peerManager.send({ type: 'OFFER_DRAW' });
      this.showToast('پیشنهاد تساوی برای حریف ارسال شد...');
    } else {
      if (confirm('آیا با تساوی دوطرفه موافقید؟')) {
        this.showGameOverModal('بازی با توافق طرفین مساوی شد. 🤝');
      }
    }
  }

  /* ------------------- START MODES ------------------- */
  startLocalGame() {
    this.gameMode = 'local';
    this.playerColor = 'w';
    this.flipped = false;
    this.modeBadgeEl.textContent = 'دو نفره محلی';
    this.onlineBox.style.display = 'none';
    this.resetGame();
  }

  startAiGame(color, difficulty, time) {
    this.gameMode = 'ai';
    this.playerColor = color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
    this.aiDifficulty = difficulty;
    this.timeControl = time * 60;
    this.flipped = (this.playerColor === 'b');
    this.modeBadgeEl.textContent = `بازی با کامپیوتر (${difficulty === 1 ? 'مبتدی' : difficulty === 2 ? 'متوسط' : 'استاد'})`;
    this.onlineBox.style.display = 'none';
    this.resetGame();

    if (this.playerColor === 'b') {
      setTimeout(() => this.triggerAiMove(), 500);
    }
  }

  startOnlineGame(isHost, roomCode, color = 'w', time = 10) {
    this.gameMode = 'online';
    this.timeControl = time * 60;
    this.modeBadgeEl.textContent = `آنلاین (${roomCode})`;
    this.onlineBox.style.display = 'flex';

    if (isHost) {
      this.playerColor = color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
      this.flipped = (this.playerColor === 'b');
      this.initHostNetwork(roomCode);
    } else {
      this.initGuestNetwork(roomCode);
    }
  }

  resetGame() {
    this.game.reset();
    this.lastMove = null;
    this.clearSelection();
    this.whiteTime = this.timeControl;
    this.blackTime = this.timeControl;
    this.updateClockDisplays();
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.renderBoard();
    this.updateStatus();
    this.movesListEl.innerHTML = '';
  }

  /* ------------------- PEERJS WEBRTC NETWORKING ------------------- */
  initHostNetwork(roomCode) {
    this.showToast('در حال ایجاد اتاق و ارتباط با شبکه...');

    peerManager.createRoom(roomCode, {
      onConnected: () => {
        this.showToast('حریف متصل شد! بازی آغاز شد 🎉');
        chessAudio.playNotify();
        // Send initial game settings
        const guestColor = this.playerColor === 'w' ? 'b' : 'w';
        peerManager.send({
          type: 'GAME_INIT',
          hostColor: this.playerColor,
          guestColor: guestColor,
          timeControl: this.timeControl
        });
        this.resetGame();
      },
      onDisconnected: () => {
        this.showToast('حریف از بازی خارج شد ⚠️');
      },
      onMessage: (data) => this.handleNetworkMessage(data),
      onError: (msg) => this.showToast(msg)
    });
  }

  initGuestNetwork(roomCode) {
    this.showToast('در حال اتصال به اتاق میزبان...');

    peerManager.joinRoom(roomCode, {
      onConnected: () => {
        this.showToast('با موفقیت به میزبان متصل شدید! منتظر شروع...');
        chessAudio.playNotify();
      },
      onDisconnected: () => {
        this.showToast('ارتباط با میزبان قطع شد ⚠️');
      },
      onMessage: (data) => this.handleNetworkMessage(data),
      onError: (msg) => this.showToast(msg)
    });
  }

  handleNetworkMessage(data) {
    console.log('Network message:', data.type, data);

    switch (data.type) {
      case 'GAME_INIT':
        this.playerColor = data.guestColor;
        this.flipped = (this.playerColor === 'b');
        this.timeControl = data.timeControl;
        this.resetGame();
        this.showToast(`بازی شروع شد! شما مهره ${this.playerColor === 'w' ? 'سفید' : 'سیاه'} هستید.`);
        break;

      case 'MOVE':
        this.whiteTime = data.whiteTime;
        this.blackTime = data.blackTime;
        this.updateClockDisplays();
        this.executeMove(data.move, true);
        break;

      case 'OFFER_DRAW':
        if (confirm('حریف پیشنهاد تساوی داده است. آیا قبول می‌کنید؟')) {
          peerManager.send({ type: 'ACCEPT_DRAW' });
          this.showGameOverModal('بازی با توافق طرفین مساوی شد. 🤝');
        } else {
          peerManager.send({ type: 'DECLINE_DRAW' });
        }
        break;

      case 'ACCEPT_DRAW':
        this.showGameOverModal('پیشنهاد مساوی توسط حریف پذیرفته شد. 🤝');
        break;

      case 'DECLINE_DRAW':
        this.showToast('حریف پیشنهاد مساوی را رد کرد.');
        break;

      case 'RESIGN':
        const winner = data.by === 'w' ? 'سیاه' : 'سفید';
        chessAudio.playGameOver(true);
        this.showGameOverModal(`حریف تسلیم شد! شما برنده شدید. 🏆`);
        break;

      case 'CHAT':
        this.appendChatMessage(data.sender, data.text, false);
        break;

      case 'REACTION':
        this.showFloatingReaction(data.emoji);
        break;
    }
  }

  /* ------------------- CHAT & EMOJI REACTIONS ------------------- */
  sendChatMessage() {
    const text = this.chatInput.value.trim();
    if (!text) return;
    this.chatInput.value = '';

    this.appendChatMessage('شما', text, true);
    if (this.gameMode === 'online') {
      peerManager.send({
        type: 'CHAT',
        sender: 'حریف',
        text: text
      });
    }
  }

  appendChatMessage(sender, text, isMine) {
    const msgEl = document.createElement('div');
    msgEl.className = `chat-msg ${isMine ? 'mine' : ''}`;
    msgEl.textContent = `${sender}: ${text}`;
    this.chatMessagesEl.appendChild(msgEl);
    this.chatMessagesEl.scrollTop = this.chatMessagesEl.scrollHeight;
  }

  sendReaction(emoji) {
    this.showFloatingReaction(emoji);
    if (this.gameMode === 'online') {
      peerManager.send({ type: 'REACTION', emoji: emoji });
    }
  }

  showFloatingReaction(emoji) {
    const floatEl = document.createElement('div');
    floatEl.textContent = emoji;
    floatEl.style.position = 'fixed';
    floatEl.style.fontSize = '3rem';
    floatEl.style.left = `${50 + (Math.random() * 20 - 10)}%`;
    floatEl.style.bottom = '20%';
    floatEl.style.zIndex = '3000';
    floatEl.style.pointerEvents = 'none';
    floatEl.style.transition = 'all 1.2s cubic-bezier(0.1, 0.8, 0.3, 1)';
    floatEl.style.transform = 'translate(-50%, 0) scale(0.5)';
    floatEl.style.opacity = '1';

    document.body.appendChild(floatEl);

    requestAnimationFrame(() => {
      floatEl.style.transform = 'translate(-50%, -180px) scale(1.4)';
      floatEl.style.opacity = '0';
    });

    setTimeout(() => floatEl.remove(), 1300);
  }
}

// Global App Instance
let chessApp = null;
window.addEventListener('DOMContentLoaded', () => {
  chessApp = new ChessApp();

  // Setup Start Game Dialog Buttons
  document.getElementById('btn-start-local').addEventListener('click', () => {
    chessApp.hideModal(chessApp.modeModal);
    chessApp.startLocalGame();
  });

  document.getElementById('btn-open-ai-setup').addEventListener('click', () => {
    chessApp.hideModal(chessApp.modeModal);
    document.getElementById('ai-setup-dialog').classList.add('active');
  });

  document.getElementById('btn-confirm-ai-game').addEventListener('click', () => {
    const color = document.getElementById('ai-color-select').value;
    const diff = parseInt(document.getElementById('ai-diff-select').value, 10);
    const time = parseInt(document.getElementById('ai-time-select').value, 10);
    document.getElementById('ai-setup-dialog').classList.remove('active');
    chessApp.startAiGame(color, diff, time);
  });

  document.getElementById('btn-open-online-setup').addEventListener('click', () => {
    chessApp.hideModal(chessApp.modeModal);
    chessApp.showModal(chessApp.onlineModal);
  });

  // Host Create Room Button
  document.getElementById('btn-create-online-room').addEventListener('click', () => {
    const code = peerManager.generateCode();
    const color = document.getElementById('online-color-select').value;
    const time = parseInt(document.getElementById('online-time-select').value, 10);

    // Display room details
    document.getElementById('online-setup-view').style.display = 'none';
    document.getElementById('online-waiting-view').style.display = 'block';
    document.getElementById('display-room-code').textContent = code;

    // Direct link
    const roomUrl = `${window.location.origin}${window.location.pathname}?room=${code}`;
    document.getElementById('btn-copy-room-link').onclick = () => {
      navigator.clipboard.writeText(roomUrl).then(() => {
        chessApp.showToast('لینک دعوت کپی شد! برای دوست خود بفرستید 🔗');
      });
    };

    chessApp.startOnlineGame(true, code, color, time);
  });

  // Guest Join Room Button
  document.getElementById('btn-join-online-room').addEventListener('click', () => {
    const code = document.getElementById('join-room-code').value.trim();
    if (!code) {
      chessApp.showToast('لطفاً کد اتاق را وارد کنید.');
      return;
    }
    chessApp.hideModal(chessApp.onlineModal);
    chessApp.startOnlineGame(false, code);
  });

  // Rematch button in Game Over modal
  document.getElementById('btn-rematch').addEventListener('click', () => {
    chessApp.hideModal(chessApp.gameOverModal);
    chessApp.resetGame();
  });
});
