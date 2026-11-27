import {
  Color,
  GameState,
  Move,
  PieceType,
  applyMoveToBoard,
  getLegalMoves,
  isKingInCheck,
  oppositeColor,
} from './chess';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

const EVAL_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables from White's perspective (row 0 = rank 8, row 7 = rank 1)
const PAWN_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 27, 27, 10, 5, 5],
  [0, 0, 0, 24, 24, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -22, -22, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_PST = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 12, 16, 16, 12, 0, -30],
  [-30, 5, 16, 22, 22, 16, 5, -30],
  [-30, 0, 16, 22, 22, 16, 0, -30],
  [-30, 5, 12, 16, 16, 12, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_PST = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 8, 12, 12, 8, 0, -10],
  [-10, 6, 6, 12, 12, 6, 6, -10],
  [-10, 0, 12, 12, 12, 12, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 6, 0, 0, 0, 0, 6, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [6, 12, 12, 12, 12, 12, 12, 6],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 6, 6, 0, 0, 0],
];

const QUEEN_PST = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 6, 6, 6, 6, 0, -10],
  [-5, 0, 6, 6, 6, 6, 0, -5],
  [0, 0, 6, 6, 6, 6, 0, -5],
  [-10, 5, 6, 6, 6, 6, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_MID_PST = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

const PST_MAP: Record<PieceType, number[][]> = {
  p: PAWN_PST,
  n: KNIGHT_PST,
  b: BISHOP_PST,
  r: ROOK_PST,
  q: QUEEN_PST,
  k: KING_MID_PST,
};

function evaluateBoard(board: GameState['board'], perspective: Color): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const pstRow = p.color === 'w' ? r : 7 - r;
      const val = EVAL_VALUES[p.type] + PST_MAP[p.type][pstRow][c];
      score += p.color === perspective ? val : -val;
    }
  }
  return score;
}

function scoreMoveForOrdering(move: Move): number {
  let score = 0;
  if (move.captured) {
    score += 10 * EVAL_VALUES[move.captured.type] - EVAL_VALUES[move.piece.type];
  }
  if (move.promotion) {
    score += EVAL_VALUES[move.promotion];
  }
  if (move.isCastle) {
    score += 60;
  }
  return score;
}

function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => scoreMoveForOrdering(b) - scoreMoveForOrdering(a));
}

function generateFastLegalMoves(board: GameState['board'], turn: Color): Move[] {
  const moves: Move[] = [];
  const enemy = oppositeColor(turn);

  const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== turn) continue;
      const from = { row: r, col: c };

      if (piece.type === 'p') {
        const dir = turn === 'w' ? -1 : 1;
        const startRow = turn === 'w' ? 6 : 1;
        const promoRow = turn === 'w' ? 0 : 7;
        const oneR = r + dir;
        if (inBounds(oneR, c) && !board[oneR][c]) {
          if (oneR === promoRow) {
            moves.push({ from, to: { row: oneR, col: c }, piece, promotion: 'q' });
          } else {
            moves.push({ from, to: { row: oneR, col: c }, piece });
            const twoR = r + dir * 2;
            if (r === startRow && !board[twoR][c]) {
              moves.push({ from, to: { row: twoR, col: c }, piece });
            }
          }
        }
        for (const dc of [-1, 1]) {
          const nc = c + dc;
          if (!inBounds(oneR, nc)) continue;
          const target = board[oneR][nc];
          if (target && target.color === enemy) {
            if (oneR === promoRow) {
              moves.push({
                from,
                to: { row: oneR, col: nc },
                piece,
                captured: target,
                promotion: 'q',
              });
            } else {
              moves.push({ from, to: { row: oneR, col: nc }, piece, captured: target });
            }
          }
        }
      } else if (piece.type === 'n') {
        const offsets = [
          [-2, -1],
          [-2, 1],
          [-1, -2],
          [-1, 2],
          [1, -2],
          [1, 2],
          [2, -1],
          [2, 1],
        ];
        for (const [dr, dc] of offsets) {
          const nr = r + dr;
          const nc = c + dc;
          if (!inBounds(nr, nc)) continue;
          const target = board[nr][nc];
          if (!target || target.color === enemy) {
            moves.push({ from, to: { row: nr, col: nc }, piece, captured: target ?? undefined });
          }
        }
      } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
        const dirs: number[][] = [];
        if (piece.type === 'b' || piece.type === 'q') dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
        if (piece.type === 'r' || piece.type === 'q') dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
        for (const [dr, dc] of dirs) {
          let nr = r + dr;
          let nc = c + dc;
          while (inBounds(nr, nc)) {
            const target = board[nr][nc];
            if (!target) {
              moves.push({ from, to: { row: nr, col: nc }, piece });
            } else {
              if (target.color === enemy) {
                moves.push({ from, to: { row: nr, col: nc }, piece, captured: target });
              }
              break;
            }
            nr += dr;
            nc += dc;
          }
        }
      } else if (piece.type === 'k') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (!inBounds(nr, nc)) continue;
            const target = board[nr][nc];
            if (!target || target.color === enemy) {
              moves.push({ from, to: { row: nr, col: nc }, piece, captured: target ?? undefined });
            }
          }
        }
      }
    }
  }

  return moves.filter((m) => !isKingInCheck(applyMoveToBoard(board, m), turn));
}

function negamax(
  board: GameState['board'],
  depth: number,
  alpha: number,
  beta: number,
  turn: Color
): number {
  if (depth === 0) {
    return evaluateBoard(board, turn);
  }

  const moves = orderMoves(generateFastLegalMoves(board, turn));
  if (moves.length === 0) {
    if (isKingInCheck(board, turn)) {
      return -100000 - depth * 100;
    }
    return 0;
  }

  let best = -Infinity;
  const nextTurn = oppositeColor(turn);

  for (const move of moves) {
    const nextBoard = applyMoveToBoard(board, move);
    const val = -negamax(nextBoard, depth - 1, -beta, -alpha, nextTurn);
    if (val > best) best = val;
    if (val > alpha) alpha = val;
    if (alpha >= beta) break;
  }

  return best;
}

export function chooseBotMove(state: GameState, difficulty: BotDifficulty): Move | null {
  const legalMoves = orderMoves(getLegalMoves(state));
  if (legalMoves.length === 0) return null;

  const depth = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
  const nextTurn = oppositeColor(state.turn);

  const scored: { move: Move; score: number }[] = [];

  for (const move of legalMoves) {
    const nextBoard = applyMoveToBoard(state.board, move);
    const score = -negamax(nextBoard, depth - 1, -Infinity, Infinity, nextTurn);
    scored.push({ move, score });
  }

  scored.sort((a, b) => b.score - a.score);

  if (difficulty === 'easy') {
    // Pick randomly among top 3 moves within 150cp of best for a forgiving casual match
    const bestScore = scored[0].score;
    const pool = scored.filter((s) => bestScore - s.score <= 150).slice(0, 3);
    return pool[Math.floor(Math.random() * pool.length)].move;
  }

  if (difficulty === 'medium') {
    const bestScore = scored[0].score;
    const pool = scored.filter((s) => bestScore - s.score <= 25).slice(0, 2);
    return pool[Math.floor(Math.random() * pool.length)].move;
  }

  // Hard: pick highest-scoring move (with tiny tie-breaker among identical scores)
  const bestScore = scored[0].score;
  const ties = scored.filter((s) => s.score === bestScore);
  return ties[Math.floor(Math.random() * ties.length)].move;
}

export function getHintMove(state: GameState): Move | null {
  return chooseBotMove(state, 'hard');
}
