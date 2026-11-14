// Chess Engine using Minimax with Alpha-Beta Pruning & Positional Evaluation Tables

class ChessEngine {
  constructor() {
    this.pieceValues = {
      p: 100,
      n: 320,
      b: 330,
      r: 500,
      q: 900,
      k: 20000
    };

    // Positional evaluation tables (from White's perspective)
    this.pawnTable = [
      [0,  0,  0,  0,  0,  0,  0,  0],
      [50, 50, 50, 50, 50, 50, 50, 50],
      [10, 10, 20, 30, 30, 20, 10, 10],
      [5,  5, 10, 25, 25, 10,  5,  5],
      [0,  0,  0, 20, 20,  0,  0,  0],
      [5, -5,-10,  0,  0,-10, -5,  5],
      [5, 10, 10,-20,-20, 10, 10,  5],
      [0,  0,  0,  0,  0,  0,  0,  0]
    ];

    this.knightTable = [
      [-50,-40,-30,-30,-30,-30,-40,-50],
      [-40,-20,  0,  0,  0,  0,-20,-40],
      [-30,  0, 10, 15, 15, 10,  0,-30],
      [-30,  5, 15, 20, 20, 15,  5,-30],
      [-30,  0, 15, 20, 20, 15,  0,-30],
      [-30,  5, 10, 15, 15, 10,  5,-30],
      [-40,-20,  0,  5,  5,  0,-20,-40],
      [-50,-40,-30,-30,-30,-30,-40,-50]
    ];

    this.bishopTable = [
      [-20,-10,-10,-10,-10,-10,-10,-20],
      [-10,  0,  0,  0,  0,  0,  0,-10],
      [-10,  0,  5, 10, 10,  5,  0,-10],
      [-10,  5,  5, 10, 10,  5,  5,-10],
      [-10,  0, 10, 10, 10, 10,  0,-10],
      [-10, 10, 10, 10, 10, 10, 10,-10],
      [-10,  5,  0,  0,  0,  0,  5,-10],
      [-20,-10,-10,-10,-10,-10,-10,-20]
    ];

    this.rookTable = [
      [0,  0,  0,  0,  0,  0,  0,  0],
      [5, 10, 10, 10, 10, 10, 10,  5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [0,  0,  0,  5,  5,  0,  0,  0]
    ];

    this.queenTable = [
      [-20,-10,-10, -5, -5,-10,-10,-20],
      [-10,  0,  0,  0,  0,  0,  0,-10],
      [-10,  0,  5,  5,  5,  5,  0,-10],
      [-5,  0,  5,  5,  5,  5,  0, -5],
      [0,  0,  5,  5,  5,  5,  0, -5],
      [-10,  5,  5,  5,  5,  5,  0,-10],
      [-10,  0,  5,  0,  0,  0,  0,-10],
      [-20,-10,-10, -5, -5,-10,-10,-20]
    ];

    this.kingTableMid = [
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-20,-30,-30,-40,-40,-30,-30,-20],
      [-10,-20,-20,-20,-20,-20,-20,-10],
      [20, 20,  0,  0,  0,  0, 20, 20],
      [20, 30, 10,  0,  0, 10, 30, 20]
    ];
  }

  evaluateBoard(game) {
    let totalEvaluation = 0;
    const board = game.board();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece) {
          const val = this.getPieceValue(piece, r, c);
          totalEvaluation += piece.color === 'w' ? val : -val;
        }
      }
    }
    return totalEvaluation;
  }

  getPieceValue(piece, row, col) {
    const pType = piece.type;
    const baseValue = this.pieceValues[pType] || 0;
    const r = piece.color === 'w' ? row : 7 - row;
    const c = col;

    let positionValue = 0;
    switch (pType) {
      case 'p': positionValue = this.pawnTable[r][c]; break;
      case 'n': positionValue = this.knightTable[r][c]; break;
      case 'b': positionValue = this.bishopTable[r][c]; break;
      case 'r': positionValue = this.rookTable[r][c]; break;
      case 'q': positionValue = this.queenTable[r][c]; break;
      case 'k': positionValue = this.kingTableMid[r][c]; break;
    }

    return baseValue + positionValue;
  }

  minimax(game, depth, alpha, beta, isMaximizing) {
    if (depth === 0 || game.game_over()) {
      return this.evaluateBoard(game);
    }

    const moves = game.moves({ verbose: true });
    // Move ordering: captures first
    moves.sort((a, b) => (b.captured ? 10 : 0) - (a.captured ? 10 : 0));

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let i = 0; i < moves.length; i++) {
        game.move(moves[i]);
        const evaluation = this.minimax(game, depth - 1, alpha, beta, false);
        game.undo();
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let i = 0; i < moves.length; i++) {
        game.move(moves[i]);
        const evaluation = this.minimax(game, depth - 1, alpha, beta, true);
        game.undo();
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  /**
   * Find the best move for current turn
   * @param {Chess} game 
   * @param {number} difficulty 1: Novice, 2: Intermediate, 3: Advanced
   * @returns {Object|null}
   */
  getBestMove(game, difficulty = 2) {
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return null;

    // Difficulty 1: Easy/Novice (random with 30% chance of best move)
    if (difficulty === 1) {
      if (Math.random() < 0.6) {
        return moves[Math.floor(Math.random() * moves.length)];
      }
    }

    const depth = difficulty === 1 ? 1 : difficulty === 2 ? 2 : 3;
    const isWhite = game.turn() === 'w';

    let bestMove = null;
    let bestValue = isWhite ? -Infinity : Infinity;

    // Shuffle moves slightly to avoid deterministic repetitive openings
    moves.sort(() => Math.random() - 0.5);
    // Prioritize captures and checks
    moves.sort((a, b) => (b.captured ? 10 : 0) - (a.captured ? 10 : 0));

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      game.move(move);
      const boardVal = this.minimax(game, depth - 1, -Infinity, Infinity, !isWhite);
      game.undo();

      if (isWhite) {
        if (boardVal > bestValue) {
          bestValue = boardVal;
          bestMove = move;
        }
      } else {
        if (boardVal < bestValue) {
          bestValue = boardVal;
          bestMove = move;
        }
      }
    }

    return bestMove || moves[0];
  }
}

const chessEngine = new ChessEngine();
