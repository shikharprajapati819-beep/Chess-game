import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Color,
  GameState,
  Move,
  PromotionPiece,
  Square,
  findKing,
  getLegalMovesForSquare,
} from '../engine/chess';
import { BoardTheme } from '../types/game';
import { ChessPiece } from './ChessPiece';

interface ChessBoardProps {
  gameState: GameState;
  theme: BoardTheme;
  flipped: boolean;
  interactiveColor: Color | 'both' | null;
  selectedSquare: Square | null;
  legalMovesForSelected: Move[];
  hintMove: Move | null;
  pendingPromotion: { from: Square; to: Square; options: Move[] } | null;
  onSelectSquare: (sq: Square) => void;
  onExecuteMove: (move: Move) => void;
  onSelectPromotion: (piece: PromotionPiece) => void;
  onCancelPromotion: () => void;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export const ChessBoard: React.FC<ChessBoardProps> = ({
  gameState,
  theme,
  flipped,
  interactiveColor,
  selectedSquare,
  legalMovesForSelected,
  hintMove,
  pendingPromotion,
  onSelectSquare,
  onExecuteMove,
  onSelectPromotion,
  onCancelPromotion,
}) => {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<{
    from: Square;
    piece: { color: Color; type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k' };
    x: number;
    y: number;
    squareSize: number;
    hasMoved: boolean;
  } | null>(null);

  const lastMove =
    gameState.history.length > 0
      ? gameState.history[gameState.history.length - 1].move
      : null;

  const checkedKingSq = gameState.inCheck
    ? findKing(gameState.board, gameState.turn)
    : null;

  const canInteractWithColor = useCallback(
    (pieceColor: Color): boolean => {
      if (gameState.status !== 'playing' || pendingPromotion) return false;
      if (interactiveColor === 'both') return pieceColor === gameState.turn;
      if (interactiveColor === pieceColor) return pieceColor === gameState.turn;
      return false;
    },
    [gameState.status, gameState.turn, interactiveColor, pendingPromotion]
  );

  const clientPointToSquare = useCallback(
    (clientX: number, clientY: number): Square | null => {
      const el = boardRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return null;
      }
      const visualCol = Math.min(7, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * 8)));
      const visualRow = Math.min(7, Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * 8)));
      return {
        row: flipped ? 7 - visualRow : visualRow,
        col: flipped ? 7 - visualCol : visualCol,
      };
    },
    [flipped]
  );

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      setDragState((prev) =>
        prev
          ? {
              ...prev,
              x: e.clientX,
              y: e.clientY,
              hasMoved:
                prev.hasMoved ||
                Math.hypot(e.clientX - prev.x, e.clientY - prev.y) > 4,
            }
          : null
      );
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dropSq = clientPointToSquare(e.clientX, e.clientY);
      if (dropSq && dragState.hasMoved) {
        const movesFromOrigin = getLegalMovesForSquare(gameState, dragState.from);
        const matchingMoves = movesFromOrigin.filter(
          (m) => m.to.row === dropSq.row && m.to.col === dropSq.col
        );
        if (matchingMoves.length > 0) {
          onExecuteMove(matchingMoves[0]);
        }
      }
      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragState, clientPointToSquare, gameState, onExecuteMove]);

  const visualRows = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const visualCols = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="relative w-full aspect-square select-none">
      <div
        ref={boardRef}
        className="w-full h-full rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 grid grid-cols-8 grid-rows-8 touch-none"
      >
        {visualRows.map((r, visualRIdx) =>
          visualCols.map((c, visualCIdx) => {
            const isLight = (r + c) % 2 === 0;
            const piece = gameState.board[r][c];
            const isSelected =
              selectedSquare?.row === r && selectedSquare?.col === c;
            const isLastMoveFrom =
              lastMove?.from.row === r && lastMove?.from.col === c;
            const isLastMoveTo =
              lastMove?.to.row === r && lastMove?.to.col === c;
            const isHintFrom =
              hintMove?.from.row === r && hintMove?.from.col === c;
            const isHintTo =
              hintMove?.to.row === r && hintMove?.to.col === c;
            const isCheckSq =
              checkedKingSq?.row === r && checkedKingSq?.col === c;

            const legalTarget = legalMovesForSelected.find(
              (m) => m.to.row === r && m.to.col === c
            );

            const isBeingDragged =
              dragState?.hasMoved &&
              dragState.from.row === r &&
              dragState.from.col === c;

            let bg = isLight ? theme.lightSquare : theme.darkSquare;
            if (isLastMoveFrom || isLastMoveTo) {
              bg = isLight ? theme.lastMoveLight : theme.lastMoveDark;
            }
            if (isSelected) {
              bg = theme.selected;
            }

            const coordColor = isLight ? theme.lightCoord : theme.darkCoord;

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                aria-label={`${FILES[c]}${8 - r}${piece ? ` ${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}` : ''}`}
                onPointerDown={(e) => {
                  if (piece && canInteractWithColor(piece.color)) {
                    const rect = boardRef.current?.getBoundingClientRect();
                    const squareSize = rect ? rect.width / 8 : 56;
                    onSelectSquare({ row: r, col: c });
                    setDragState({
                      from: { row: r, col: c },
                      piece,
                      x: e.clientX,
                      y: e.clientY,
                      squareSize,
                      hasMoved: false,
                    });
                  } else {
                    onSelectSquare({ row: r, col: c });
                  }
                }}
                className="relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400 cursor-pointer"
                style={{ backgroundColor: bg }}
              >
                {/* Check warning glow */}
                {isCheckSq && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(circle, rgba(239,68,68,0.85) 0%, rgba(220,38,38,0.45) 55%, rgba(220,38,38,0) 80%)',
                    }}
                  />
                )}

                {/* Hint square border */}
                {(isHintFrom || isHintTo) && (
                  <div className="absolute inset-1 rounded-md border-2 border-emerald-400 bg-emerald-400/20 pointer-events-none animate-pulse" />
                )}

                {/* Coordinate Labels */}
                {visualCIdx === 0 && (
                  <span
                    className="absolute top-0.5 left-1 text-[10px] sm:text-[11px] font-bold leading-none pointer-events-none opacity-85"
                    style={{ color: coordColor }}
                  >
                    {8 - r}
                  </span>
                )}
                {visualRIdx === 7 && (
                  <span
                    className="absolute bottom-0.5 right-1 text-[10px] sm:text-[11px] font-bold leading-none pointer-events-none opacity-85"
                    style={{ color: coordColor }}
                  >
                    {FILES[c]}
                  </span>
                )}

                {/* Legal Move Target Indicator */}
                {legalTarget && !piece && !legalTarget.isEnPassant && (
                  <span className="w-[28%] h-[28%] rounded-full bg-black/22 pointer-events-none transition-transform duration-150" />
                )}
                {legalTarget && (piece || legalTarget.isEnPassant) && (
                  <span className="absolute inset-[6%] rounded-full border-[3.5px] sm:border-[4px] border-black/24 pointer-events-none" />
                )}

                {/* Chess Piece */}
                {piece && !isBeingDragged && (
                  <div
                    className={`w-[84%] h-[84%] transition-transform duration-150 ${
                      isSelected ? 'scale-108 -translate-y-0.5' : ''
                    }`}
                  >
                    <ChessPiece type={piece.type} color={piece.color} />
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Floating Dragged Piece */}
      {dragState && dragState.hasMoved && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragState.x - dragState.squareSize * 0.52,
            top: dragState.y - dragState.squareSize * 0.58,
            width: dragState.squareSize * 1.04,
            height: dragState.squareSize * 1.04,
          }}
        >
          <ChessPiece type={dragState.piece.type} color={dragState.piece.color} />
        </div>
      )}

      {/* Pawn Promotion Overlay */}
      {pendingPromotion && (
        <div
          className="absolute inset-0 z-30 bg-black/60 rounded-xl sm:rounded-2xl flex items-center justify-center p-4"
          onClick={onCancelPromotion}
        >
          <div
            className="bg-[#1E232B] border border-white/15 rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm font-medium text-slate-200">
              Choose promotion piece
            </span>
            <div className="grid grid-cols-4 gap-2">
              {(['q', 'r', 'b', 'n'] as PromotionPiece[]).map((promo) => (
                <button
                  key={promo}
                  type="button"
                  onClick={() => onSelectPromotion(promo)}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#2A303B] hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-400/60 p-2 transition-colors cursor-pointer flex items-center justify-center"
                >
                  <ChessPiece
                    type={promo}
                    color={gameState.turn}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
