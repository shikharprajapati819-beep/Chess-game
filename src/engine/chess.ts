export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export interface Piece {
  color: Color;
  type: PieceType;
}

export interface Square {
  row: number; // 0 = rank 8, 7 = rank 1
  col: number; // 0 = file a, 7 = file h
}

export interface CastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

export interface Move {
  from: Square;
  to: Square;
  piece: Piece;
  captured?: Piece;
  promotion?: PromotionPiece;
  isEnPassant?: boolean;
  isCastle?: 'K' | 'Q';
}

export interface MoveRecord {
  move: Move;
  san: string;
  fenKey: string;
  prevCastling: CastlingRights;
  prevEnPassant: Square | null;
  prevHalfmoveClock: number;
}

export type GameStatus =
  | 'playing'
  | 'checkmate'
  | 'stalemate'
  | 'draw_repetition'
  | 'draw_fifty_move'
  | 'draw_insufficient';

export interface GameState {
  board: (Piece | null)[][];
  turn: Color;
  castling: CastlingRights;
  enPassant: Square | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  history: MoveRecord[];
  positionCounts: Record<string, number>;
  status: GameStatus;
  winner: Color | null;
  inCheck: boolean;
}

export const PIECE_VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export function squareToAlgebraic(sq: Square): string {
  return `${FILES[sq.col]}${8 - sq.row}`;
}

export function oppositeColor(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}

export function cloneBoard(board: (Piece | null)[][]): (Piece | null)[][] {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function getPositionKey(
  board: (Piece | null)[][],
  turn: Color,
  castling: CastlingRights,
  enPassant: Square | null
): string {
  let rows = '';
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) {
        empty++;
      } else {
        if (empty > 0) {
          rows += empty;
          empty = 0;
        }
        rows += p.color === 'w' ? p.type.toUpperCase() : p.type;
      }
    }
    if (empty > 0) rows += empty;
    if (r < 7) rows += '/';
  }
  const castleStr =
    (castling.wK ? 'K' : '') +
      (castling.wQ ? 'Q' : '') +
      (castling.bK ? 'k' : '') +
      (castling.bQ ? 'q' : '') || '-';
  const epStr = enPassant ? squareToAlgebraic(enPassant) : '-';
  return `${rows} ${turn} ${castleStr} ${epStr}`;
}

export function createInitialBoard(): (Piece | null)[][] {
  const backRank: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  const board: (Piece | null)[][] = Array.from({ length: 8 }, () =>
    Array<Piece | null>(8).fill(null)
  );

  for (let c = 0; c < 8; c++) {
    board[0][c] = { color: 'b', type: backRank[c] };
    board[1][c] = { color: 'b', type: 'p' };
    board[6][c] = { color: 'w', type: 'p' };
    board[7][c] = { color: 'w', type: backRank[c] };
  }
  return board;
}

export function createInitialGameState(): GameState {
  const board = createInitialBoard();
  const castling: CastlingRights = { wK: true, wQ: true, bK: true, bQ: true };
  const fenKey = getPositionKey(board, 'w', castling, null);
  return {
    board,
    turn: 'w',
    castling,
    enPassant: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    history: [],
    positionCounts: { [fenKey]: 1 },
    status: 'playing',
    winner: null,
    inCheck: false,
  };
}

export function findKing(board: (Piece | null)[][], color: Color): Square | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color && p.type === 'k') {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

export function isSquareAttacked(
  board: (Piece | null)[][],
  target: Square,
  attackerColor: Color
): boolean {
  const { row, col } = target;

  // Pawn attacks
  const pawnDir = attackerColor === 'w' ? 1 : -1;
  const pawnRow = row + pawnDir;
  if (inBounds(pawnRow, col - 1)) {
    const p = board[pawnRow][col - 1];
    if (p && p.color === attackerColor && p.type === 'p') return true;
  }
  if (inBounds(pawnRow, col + 1)) {
    const p = board[pawnRow][col + 1];
    if (p && p.color === attackerColor && p.type === 'p') return true;
  }

  // Knight attacks
  const knightOffsets = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];
  for (const [dr, dc] of knightOffsets) {
    const nr = row + dr;
    const nc = col + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === attackerColor && p.type === 'n') return true;
    }
  }

  // King attacks
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p && p.color === attackerColor && p.type === 'k') return true;
      }
    }
  }

  // Orthogonal rays (Rook / Queen)
  const orthoDirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of orthoDirs) {
    let nr = row + dr;
    let nc = col + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === attackerColor && (p.type === 'r' || p.type === 'q')) {
          return true;
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  // Diagonal rays (Bishop / Queen)
  const diagDirs = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];
  for (const [dr, dc] of diagDirs) {
    let nr = row + dr;
    let nc = col + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === attackerColor && (p.type === 'b' || p.type === 'q')) {
          return true;
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  return false;
}

export function isKingInCheck(board: (Piece | null)[][], color: Color): boolean {
  const kingSq = findKing(board, color);
  if (!kingSq) return false;
  return isSquareAttacked(board, kingSq, oppositeColor(color));
}

function generatePseudoLegalMoves(
  board: (Piece | null)[][],
  turn: Color,
  castling: CastlingRights,
  enPassant: Square | null
): Move[] {
  const moves: Move[] = [];
  const enemy = oppositeColor(turn);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== turn) continue;
      const from: Square = { row: r, col: c };

      if (piece.type === 'p') {
        const dir = turn === 'w' ? -1 : 1;
        const startRow = turn === 'w' ? 6 : 1;
        const promoRow = turn === 'w' ? 0 : 7;

        // Forward 1
        const oneR = r + dir;
        if (inBounds(oneR, c) && !board[oneR][c]) {
          if (oneR === promoRow) {
            for (const promo of ['q', 'r', 'b', 'n'] as PromotionPiece[]) {
              moves.push({ from, to: { row: oneR, col: c }, piece, promotion: promo });
            }
          } else {
            moves.push({ from, to: { row: oneR, col: c }, piece });
            // Forward 2
            const twoR = r + dir * 2;
            if (r === startRow && !board[twoR][c]) {
              moves.push({ from, to: { row: twoR, col: c }, piece });
            }
          }
        }

        // Captures + En Passant
        for (const dc of [-1, 1]) {
          const nc = c + dc;
          if (!inBounds(oneR, nc)) continue;
          const target = board[oneR][nc];
          if (target && target.color === enemy) {
            if (oneR === promoRow) {
              for (const promo of ['q', 'r', 'b', 'n'] as PromotionPiece[]) {
                moves.push({
                  from,
                  to: { row: oneR, col: nc },
                  piece,
                  captured: target,
                  promotion: promo,
                });
              }
            } else {
              moves.push({
                from,
                to: { row: oneR, col: nc },
                piece,
                captured: target,
              });
            }
          } else if (enPassant && enPassant.row === oneR && enPassant.col === nc) {
            const epPawn = board[r][nc];
            if (epPawn && epPawn.color === enemy && epPawn.type === 'p') {
              moves.push({
                from,
                to: { row: oneR, col: nc },
                piece,
                captured: epPawn,
                isEnPassant: true,
              });
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
            moves.push({
              from,
              to: { row: nr, col: nc },
              piece,
              captured: target ?? undefined,
            });
          }
        }
      } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
        const dirs: number[][] = [];
        if (piece.type === 'b' || piece.type === 'q') {
          dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
        }
        if (piece.type === 'r' || piece.type === 'q') {
          dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
        }
        for (const [dr, dc] of dirs) {
          let nr = r + dr;
          let nc = c + dc;
          while (inBounds(nr, nc)) {
            const target = board[nr][nc];
            if (!target) {
              moves.push({ from, to: { row: nr, col: nc }, piece });
            } else {
              if (target.color === enemy) {
                moves.push({
                  from,
                  to: { row: nr, col: nc },
                  piece,
                  captured: target,
                });
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
              moves.push({
                from,
                to: { row: nr, col: nc },
                piece,
                captured: target ?? undefined,
              });
            }
          }
        }

        // Castling
        const homeRow = turn === 'w' ? 7 : 0;
        if (r === homeRow && c === 4 && !isSquareAttacked(board, from, enemy)) {
          // Kingside
          const canK = turn === 'w' ? castling.wK : castling.bK;
          if (
            canK &&
            !board[homeRow][5] &&
            !board[homeRow][6] &&
            board[homeRow][7]?.color === turn &&
            board[homeRow][7]?.type === 'r' &&
            !isSquareAttacked(board, { row: homeRow, col: 5 }, enemy) &&
            !isSquareAttacked(board, { row: homeRow, col: 6 }, enemy)
          ) {
            moves.push({
              from,
              to: { row: homeRow, col: 6 },
              piece,
              isCastle: 'K',
            });
          }

          // Queenside
          const canQ = turn === 'w' ? castling.wQ : castling.bQ;
          if (
            canQ &&
            !board[homeRow][3] &&
            !board[homeRow][2] &&
            !board[homeRow][1] &&
            board[homeRow][0]?.color === turn &&
            board[homeRow][0]?.type === 'r' &&
            !isSquareAttacked(board, { row: homeRow, col: 3 }, enemy) &&
            !isSquareAttacked(board, { row: homeRow, col: 2 }, enemy)
          ) {
            moves.push({
              from,
              to: { row: homeRow, col: 2 },
              piece,
              isCastle: 'Q',
            });
          }
        }
      }
    }
  }

  return moves;
}

export function applyMoveToBoard(board: (Piece | null)[][], move: Move): (Piece | null)[][] {
  const next = cloneBoard(board);
  next[move.from.row][move.from.col] = null;

  if (move.isEnPassant) {
    next[move.from.row][move.to.col] = null;
  }

  if (move.isCastle) {
    const row = move.from.row;
    if (move.isCastle === 'K') {
      next[row][5] = next[row][7];
      next[row][7] = null;
    } else {
      next[row][3] = next[row][0];
      next[row][0] = null;
    }
  }

  next[move.to.row][move.to.col] = move.promotion
    ? { color: move.piece.color, type: move.promotion }
    : { ...move.piece };

  return next;
}

export function getLegalMoves(state: GameState): Move[] {
  if (state.status !== 'playing') return [];
  const pseudo = generatePseudoLegalMoves(
    state.board,
    state.turn,
    state.castling,
    state.enPassant
  );
  return pseudo.filter((move) => {
    const nextBoard = applyMoveToBoard(state.board, move);
    return !isKingInCheck(nextBoard, state.turn);
  });
}

export function getLegalMovesForSquare(state: GameState, sq: Square): Move[] {
  return getLegalMoves(state).filter(
    (m) => m.from.row === sq.row && m.from.col === sq.col
  );
}

function isInsufficientMaterial(board: (Piece | null)[][]): boolean {
  const pieces: { color: Color; type: PieceType; sqColor: number }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type !== 'k') {
        pieces.push({ color: p.color, type: p.type, sqColor: (r + c) % 2 });
      }
    }
  }
  if (pieces.length === 0) return true;
  if (pieces.length === 1 && (pieces[0].type === 'n' || pieces[0].type === 'b')) {
    return true;
  }
  if (
    pieces.length === 2 &&
    pieces[0].type === 'b' &&
    pieces[1].type === 'b' &&
    pieces[0].sqColor === pieces[1].sqColor
  ) {
    return true;
  }
  return false;
}

function computeSAN(
  board: (Piece | null)[][],
  move: Move,
  allLegalMoves: Move[],
  nextBoard: (Piece | null)[][],
  opponentCheck: boolean,
  opponentHasMoves: boolean
): string {
  if (move.isCastle === 'K') {
    const suffix = opponentCheck ? (opponentHasMoves ? '+' : '#') : '';
    return `O-O${suffix}`;
  }
  if (move.isCastle === 'Q') {
    const suffix = opponentCheck ? (opponentHasMoves ? '+' : '#') : '';
    return `O-O-O${suffix}`;
  }

  let san = '';
  const targetStr = squareToAlgebraic(move.to);

  if (move.piece.type === 'p') {
    if (move.captured || move.isEnPassant) {
      san += `${FILES[move.from.col]}x${targetStr}`;
    } else {
      san += targetStr;
    }
    if (move.promotion) {
      san += `=${move.promotion.toUpperCase()}`;
    }
  } else {
    san += move.piece.type.toUpperCase();

    // Disambiguation for multiple pieces of same type moving to same target
    const peers = allLegalMoves.filter(
      (m) =>
        m.piece.type === move.piece.type &&
        m.to.row === move.to.row &&
        m.to.col === move.to.col &&
        (m.from.row !== move.from.row || m.from.col !== move.from.col)
    );
    if (peers.length > 0) {
      const sameFile = peers.some((m) => m.from.col === move.from.col);
      const sameRank = peers.some((m) => m.from.row === move.from.row);
      if (!sameFile) {
        san += FILES[move.from.col];
      } else if (!sameRank) {
        san += String(8 - move.from.row);
      } else {
        san += squareToAlgebraic(move.from);
      }
    }

    if (move.captured) {
      san += 'x';
    }
    san += targetStr;
  }

  if (opponentCheck) {
    san += opponentHasMoves ? '+' : '#';
  }
  // Ensure nextBoard param is acknowledged cleanly
  void board;
  void nextBoard;

  return san;
}

export function makeMove(state: GameState, move: Move, legalMovesCache?: Move[]): GameState {
  const allLegal = legalMovesCache ?? getLegalMoves(state);
  const nextBoard = applyMoveToBoard(state.board, move);
  const nextTurn = oppositeColor(state.turn);

  // Update castling rights
  const nextCastling: CastlingRights = { ...state.castling };
  if (move.piece.type === 'k') {
    if (state.turn === 'w') {
      nextCastling.wK = false;
      nextCastling.wQ = false;
    } else {
      nextCastling.bK = false;
      nextCastling.bQ = false;
    }
  }
  if (move.piece.type === 'r') {
    if (move.from.row === 7 && move.from.col === 7) nextCastling.wK = false;
    if (move.from.row === 7 && move.from.col === 0) nextCastling.wQ = false;
    if (move.from.row === 0 && move.from.col === 7) nextCastling.bK = false;
    if (move.from.row === 0 && move.from.col === 0) nextCastling.bQ = false;
  }
  // Rook captured on corner
  if (move.to.row === 7 && move.to.col === 7) nextCastling.wK = false;
  if (move.to.row === 7 && move.to.col === 0) nextCastling.wQ = false;
  if (move.to.row === 0 && move.to.col === 7) nextCastling.bK = false;
  if (move.to.row === 0 && move.to.col === 0) nextCastling.bQ = false;

  // Update en passant square
  let nextEnPassant: Square | null = null;
  if (move.piece.type === 'p' && Math.abs(move.to.row - move.from.row) === 2) {
    nextEnPassant = {
      row: (move.from.row + move.to.row) / 2,
      col: move.from.col,
    };
  }

  const nextHalfmove =
    move.piece.type === 'p' || move.captured || move.isEnPassant ? 0 : state.halfmoveClock + 1;
  const nextFullmove = state.turn === 'b' ? state.fullmoveNumber + 1 : state.fullmoveNumber;

  const fenKey = getPositionKey(nextBoard, nextTurn, nextCastling, nextEnPassant);
  const nextPositionCounts = {
    ...state.positionCounts,
    [fenKey]: (state.positionCounts[fenKey] || 0) + 1,
  };

  const opponentInCheck = isKingInCheck(nextBoard, nextTurn);
  const opponentLegalMoves = generatePseudoLegalMoves(
    nextBoard,
    nextTurn,
    nextCastling,
    nextEnPassant
  ).filter((m) => !isKingInCheck(applyMoveToBoard(nextBoard, m), nextTurn));

  const san = computeSAN(
    state.board,
    move,
    allLegal,
    nextBoard,
    opponentInCheck,
    opponentLegalMoves.length > 0
  );

  let status: GameStatus = 'playing';
  let winner: Color | null = null;

  if (opponentLegalMoves.length === 0) {
    if (opponentInCheck) {
      status = 'checkmate';
      winner = state.turn;
    } else {
      status = 'stalemate';
    }
  } else if (nextPositionCounts[fenKey] >= 3) {
    status = 'draw_repetition';
  } else if (nextHalfmove >= 100) {
    status = 'draw_fifty_move';
  } else if (isInsufficientMaterial(nextBoard)) {
    status = 'draw_insufficient';
  }

  const record: MoveRecord = {
    move,
    san,
    fenKey,
    prevCastling: { ...state.castling },
    prevEnPassant: state.enPassant ? { ...state.enPassant } : null,
    prevHalfmoveClock: state.halfmoveClock,
  };

  return {
    board: nextBoard,
    turn: nextTurn,
    castling: nextCastling,
    enPassant: nextEnPassant,
    halfmoveClock: nextHalfmove,
    fullmoveNumber: nextFullmove,
    history: [...state.history, record],
    positionCounts: nextPositionCounts,
    status,
    winner,
    inCheck: opponentInCheck,
  };
}

export function undoMoves(state: GameState, count = 1): GameState {
  if (state.history.length === 0 || count <= 0) return state;
  const targetLen = Math.max(0, state.history.length - count);
  let rebuilt = createInitialGameState();
  for (let i = 0; i < targetLen; i++) {
    rebuilt = makeMove(rebuilt, state.history[i].move);
  }
  return rebuilt;
}

export function getCapturedAndAdvantage(history: MoveRecord[]) {
  const capturedByWhite: PieceType[] = [];
  const capturedByBlack: PieceType[] = [];
  let whiteScore = 0;
  let blackScore = 0;

  for (const rec of history) {
    if (rec.move.captured) {
      const val = PIECE_VALUES[rec.move.captured.type];
      if (rec.move.piece.color === 'w') {
        capturedByWhite.push(rec.move.captured.type);
        whiteScore += val;
      } else {
        capturedByBlack.push(rec.move.captured.type);
        blackScore += val;
      }
    }
  }

  const sortOrder: Record<PieceType, number> = { q: 0, r: 1, b: 2, n: 3, p: 4, k: 5 };
  capturedByWhite.sort((a, b) => sortOrder[a] - sortOrder[b]);
  capturedByBlack.sort((a, b) => sortOrder[a] - sortOrder[b]);

  return {
    capturedByWhite,
    capturedByBlack,
    advantage: whiteScore - blackScore, // >0 means White is ahead
  };
}
