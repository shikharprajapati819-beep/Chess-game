import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Undo2,
  Lightbulb,
  ArrowUpDown,
  List,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
} from 'lucide-react';
import {
  Color,
  GameState,
  Move,
  PromotionPiece,
  Square,
  createInitialGameState,
  getCapturedAndAdvantage,
  getLegalMoves,
  getLegalMovesForSquare,
  makeMove,
  undoMoves,
} from './engine/chess';
import { chooseBotMove, getHintMove } from './engine/bot';
import { soundEngine } from './audio/sound';
import {
  BOARD_THEMES,
  BoardThemeId,
  GameOverSummary,
  GameScreenState,
  MatchSettings,
} from './types/game';
import { TitleScreen } from './components/TitleScreen';
import { ChessBoard } from './components/ChessBoard';
import { PlayerBar } from './components/PlayerBar';
import { GameOverModal, MovesDrawer, PauseModal } from './components/GameModals';

const DEFAULT_SETTINGS: MatchSettings = {
  mode: 'bot',
  difficulty: 'medium',
  playerColorChoice: 'w',
  timeMinutes: 0,
  boardTheme: 'forest',
};

function buildGameOverSummary(
  state: GameState,
  settings: MatchSettings,
  humanColor: Color,
  timeoutWinner?: Color | null,
  resignedBy?: Color | null
): GameOverSummary {
  if (resignedBy) {
    const winner = resignedBy === 'w' ? 'b' : 'w';
    if (settings.mode === 'bot') {
      return {
        title: winner === humanColor ? 'Victory' : 'Defeat',
        subtitle: winner === humanColor ? 'Bot resigned the match.' : 'You resigned the match.',
        winner,
        reason: 'Resignation',
      };
    }
    return {
      title: `${winner === 'w' ? 'White' : 'Black'} Wins`,
      subtitle: `${resignedBy === 'w' ? 'White' : 'Black'} resigned.`,
      winner,
      reason: 'Resignation',
    };
  }

  if (timeoutWinner) {
    if (settings.mode === 'bot') {
      return {
        title: timeoutWinner === humanColor ? 'Victory on Time' : 'Time Out',
        subtitle:
          timeoutWinner === humanColor
            ? 'Bot ran out of time.'
            : 'Your clock reached zero.',
        winner: timeoutWinner,
        reason: 'Time Expired',
      };
    }
    return {
      title: `${timeoutWinner === 'w' ? 'White' : 'Black'} Wins`,
      subtitle: `${timeoutWinner === 'w' ? 'Black' : 'White'} ran out of time.`,
      winner: timeoutWinner,
      reason: 'Time Expired',
    };
  }

  if (state.status === 'checkmate' && state.winner) {
    if (settings.mode === 'bot') {
      return {
        title: state.winner === humanColor ? 'Checkmate! You Win' : 'Checkmate',
        subtitle:
          state.winner === humanColor
            ? `You defeated the ${settings.difficulty} bot.`
            : `The ${settings.difficulty} bot delivered checkmate.`,
        winner: state.winner,
        reason: 'Checkmate',
      };
    }
    return {
      title: `${state.winner === 'w' ? 'White' : 'Black'} Wins`,
      subtitle: 'Checkmate delivered on the board.',
      winner: state.winner,
      reason: 'Checkmate',
    };
  }

  const reasonMap: Record<string, string> = {
    stalemate: 'Stalemate',
    draw_repetition: 'Threefold Repetition',
    draw_fifty_move: '50-Move Rule',
    draw_insufficient: 'Insufficient Material',
  };

  return {
    title: 'Draw',
    subtitle: 'The match ended evenly with no winner.',
    winner: null,
    reason: reasonMap[state.status] ?? 'Draw',
  };
}

export default function App() {
  const [screen, setScreen] = useState<GameScreenState>('TITLE_MENU');
  const [settings, setSettings] = useState<MatchSettings>(DEFAULT_SETTINGS);
  const [humanColor, setHumanColor] = useState<Color>('w');
  const [flipped, setFlipped] = useState(false);
  const [muted, setMuted] = useState(false);

  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [hintMove, setHintMove] = useState<Move | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
    options: Move[];
  } | null>(null);

  const [isBotThinking, setIsBotThinking] = useState(false);
  const [showMovesDrawer, setShowMovesDrawer] = useState(false);
  const [reviewingBoard, setReviewingBoard] = useState(false);
  const [gameOverSummary, setGameOverSummary] = useState<GameOverSummary | null>(null);

  const [clocks, setClocks] = useState<{ w: number | null; b: number | null }>({
    w: null,
    b: null,
  });

  const moveListDesktopRef = useRef<HTMLDivElement | null>(null);
  const lastTickRef = useRef<number | null>(null);

  const theme = BOARD_THEMES[settings.boardTheme];

  const updateSettings = useCallback((patch: Partial<MatchSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const startNewMatch = useCallback(
    (overrideSettings?: MatchSettings) => {
      const active = overrideSettings ?? settings;
      const resolvedHuman: Color =
        active.mode === 'local'
          ? 'w'
          : active.playerColorChoice === 'random'
          ? Math.random() < 0.5
            ? 'w'
            : 'b'
          : active.playerColorChoice;

      const initialMs = active.timeMinutes > 0 ? active.timeMinutes * 60 * 1000 : null;

      setHumanColor(resolvedHuman);
      setFlipped(active.mode === 'bot' && resolvedHuman === 'b');
      setGameState(createInitialGameState());
      setSelectedSquare(null);
      setHintMove(null);
      setPendingPromotion(null);
      setIsBotThinking(false);
      setShowMovesDrawer(false);
      setReviewingBoard(false);
      setGameOverSummary(null);
      setClocks({ w: initialMs, b: initialMs });
      lastTickRef.current = performance.now();
      setScreen('PLAYING');
    },
    [settings]
  );

  // Sound feedback & end-of-game detection on move
  const commitMove = useCallback(
    (move: Move, currentState: GameState) => {
      const allLegal = getLegalMoves(currentState);
      const nextState = makeMove(currentState, move, allLegal);

      setGameState(nextState);
      setSelectedSquare(null);
      setHintMove(null);
      setPendingPromotion(null);

      if (nextState.status !== 'playing') {
        const summary = buildGameOverSummary(nextState, settings, humanColor);
        setGameOverSummary(summary);
        setScreen('GAME_OVER');
        setReviewingBoard(false);
        soundEngine.playGameOver(
          summary.winner === null ? false : settings.mode === 'local' || summary.winner === humanColor
        );
      } else if (nextState.inCheck) {
        soundEngine.playCheck();
      } else if (move.isCastle) {
        soundEngine.playCastle();
      } else if (move.captured || move.isEnPassant) {
        soundEngine.playCapture();
      } else {
        soundEngine.playMove();
      }
    },
    [humanColor, settings]
  );

  // Bot turn automation (500ms-700ms realistic delay)
  useEffect(() => {
    if (
      screen !== 'PLAYING' ||
      settings.mode !== 'bot' ||
      gameState.status !== 'playing' ||
      gameState.turn === humanColor
    ) {
      setIsBotThinking(false);
      return;
    }

    setIsBotThinking(true);
    const delayMs = settings.difficulty === 'easy' ? 420 : settings.difficulty === 'medium' ? 540 : 620;
    const timer = window.setTimeout(() => {
      const botMove = chooseBotMove(gameState, settings.difficulty);
      setIsBotThinking(false);
      if (botMove) {
        commitMove(botMove, gameState);
      }
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [screen, settings.mode, settings.difficulty, gameState, humanColor, commitMove]);

  // Game Clock Ticker
  useEffect(() => {
    if (
      screen !== 'PLAYING' ||
      gameState.status !== 'playing' ||
      clocks.w === null ||
      clocks.b === null
    ) {
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const prev = lastTickRef.current ?? now;
      const dt = Math.min(now - prev, 500);
      lastTickRef.current = now;

      setClocks((curr) => {
        if (curr.w === null || curr.b === null) return curr;
        const activeColor = gameState.turn;
        const currentTime = activeColor === 'w' ? curr.w : curr.b;
        const updated = Math.max(0, currentTime - dt);
        return { ...curr, [activeColor]: updated };
      });
    }, 200);

    return () => window.clearInterval(interval);
  }, [screen, gameState.status, gameState.turn, clocks.w, clocks.b]);

  // Handle clock expiration cleanly
  useEffect(() => {
    if (screen !== 'PLAYING' || gameState.status !== 'playing') return;
    let winner: Color | null = null;
    if (clocks.w === 0) winner = 'b';
    else if (clocks.b === 0) winner = 'w';
    if (!winner) return;

    const summary = buildGameOverSummary(gameState, settings, humanColor, winner);
    setGameOverSummary(summary);
    setScreen('GAME_OVER');
    setReviewingBoard(false);
    soundEngine.playGameOver(settings.mode === 'local' || winner === humanColor);
  }, [screen, gameState, clocks.w, clocks.b, settings, humanColor]);

  // Auto-scroll desktop move list
  useEffect(() => {
    if (moveListDesktopRef.current) {
      moveListDesktopRef.current.scrollTop = moveListDesktopRef.current.scrollHeight;
    }
  }, [gameState.history.length]);

  const legalMovesForSelected = useMemo(() => {
    if (!selectedSquare || screen !== 'PLAYING') return [];
    return getLegalMovesForSquare(gameState, selectedSquare);
  }, [gameState, selectedSquare, screen]);

  const interactiveColor: Color | 'both' | null = useMemo(() => {
    if (screen !== 'PLAYING' || gameState.status !== 'playing') return null;
    if (settings.mode === 'local') return 'both';
    return gameState.turn === humanColor ? humanColor : null;
  }, [screen, gameState.status, gameState.turn, settings.mode, humanColor]);

  const handleExecuteMove = useCallback(
    (move: Move) => {
      const originMoves = getLegalMovesForSquare(gameState, move.from);
      const matchingPromos = originMoves.filter(
        (m) =>
          m.from.row === move.from.row &&
          m.from.col === move.from.col &&
          m.to.row === move.to.row &&
          m.to.col === move.to.col &&
          m.promotion
      );

      if (matchingPromos.length > 1) {
        setPendingPromotion({
          from: move.from,
          to: move.to,
          options: matchingPromos,
        });
        return;
      }

      commitMove(move, gameState);
    },
    [commitMove, gameState]
  );

  const handleSelectSquare = useCallback(
    (sq: Square) => {
      if (screen !== 'PLAYING' || gameState.status !== 'playing' || pendingPromotion) return;
      if (settings.mode === 'bot' && gameState.turn !== humanColor) return;

      // If tapping a legal destination for currently selected piece
      if (selectedSquare) {
        const matching = legalMovesForSelected.filter(
          (m) => m.to.row === sq.row && m.to.col === sq.col
        );
        if (matching.length > 0) {
          if (matching.length > 1 && matching[0].promotion) {
            setPendingPromotion({
              from: selectedSquare,
              to: sq,
              options: matching,
            });
          } else {
            commitMove(matching[0], gameState);
          }
          return;
        }
      }

      const piece = gameState.board[sq.row][sq.col];
      if (piece && piece.color === gameState.turn) {
        if (selectedSquare?.row === sq.row && selectedSquare?.col === sq.col) {
          setSelectedSquare(null);
        } else {
          setSelectedSquare(sq);
        }
      } else {
        setSelectedSquare(null);
      }
    },
    [
      screen,
      gameState,
      pendingPromotion,
      settings.mode,
      humanColor,
      selectedSquare,
      legalMovesForSelected,
      commitMove,
    ]
  );

  const handleSelectPromotion = useCallback(
    (promo: PromotionPiece) => {
      if (!pendingPromotion) return;
      const chosen = pendingPromotion.options.find((m) => m.promotion === promo);
      if (chosen) {
        commitMove(chosen, gameState);
      }
    },
    [pendingPromotion, commitMove, gameState]
  );

  const handleUndo = useCallback(() => {
    if (screen !== 'PLAYING' || gameState.history.length === 0) return;
    const stepsBack =
      settings.mode === 'bot'
        ? gameState.turn === humanColor && gameState.history.length >= 2
          ? 2
          : gameState.turn !== humanColor
          ? 1
          : 0
        : 1;
    if (stepsBack === 0) return;

    const reverted = undoMoves(gameState, stepsBack);
    setGameState(reverted);
    setSelectedSquare(null);
    setHintMove(null);
    setPendingPromotion(null);
    setIsBotThinking(false);
    soundEngine.playMove();
  }, [screen, gameState, settings.mode, humanColor]);

  const handleHint = useCallback(() => {
    if (screen !== 'PLAYING' || gameState.status !== 'playing') return;
    if (settings.mode === 'bot' && gameState.turn !== humanColor) return;
    const best = getHintMove(gameState);
    if (best) {
      setHintMove(best);
      setSelectedSquare(best.from);
    }
  }, [screen, gameState, settings.mode, humanColor]);

  const handleResign = useCallback(() => {
    const resignColor = settings.mode === 'bot' ? humanColor : gameState.turn;
    const summary = buildGameOverSummary(gameState, settings, humanColor, null, resignColor);
    setGameOverSummary(summary);
    setReviewingBoard(false);
    setScreen('GAME_OVER');
    soundEngine.playGameOver(false);
  }, [settings, humanColor, gameState]);

  // Global keyboard shortcuts during play
  useEffect(() => {
    if (screen === 'TITLE_MENU') return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showMovesDrawer) {
          setShowMovesDrawer(false);
        } else if (screen === 'PLAYING') {
          setScreen('PAUSED');
        } else if (screen === 'PAUSED') {
          setScreen('PLAYING');
        }
        return;
      }

      if (screen !== 'PLAYING') return;

      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        handleHint();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [screen, showMovesDrawer, handleUndo, handleHint, toggleMute]);

  if (screen === 'TITLE_MENU') {
    return (
      <TitleScreen
        settings={settings}
        onUpdateSettings={updateSettings}
        onStartGame={() => startNewMatch()}
      />
    );
  }

  const { capturedByWhite, capturedByBlack, advantage } = getCapturedAndAdvantage(
    gameState.history
  );

  // Determine top & bottom player based on board orientation (`flipped`)
  const topColor: Color = flipped ? 'w' : 'b';
  const bottomColor: Color = flipped ? 'b' : 'w';

  const getPlayerLabel = (c: Color) => {
    if (settings.mode === 'local') {
      return c === 'w' ? 'White' : 'Black';
    }
    if (c === humanColor) return 'You';
    const cap = settings.difficulty.charAt(0).toUpperCase() + settings.difficulty.slice(1);
    return `Knight Bot (${cap})`;
  };

  const isBotColor = (c: Color) => settings.mode === 'bot' && c !== humanColor;

  const canUndo =
    screen === 'PLAYING' &&
    gameState.history.length > 0 &&
    (settings.mode === 'local' ||
      (gameState.turn === humanColor && gameState.history.length >= 2) ||
      (gameState.turn !== humanColor && gameState.history.length >= 1));

  const canHint =
    screen === 'PLAYING' &&
    gameState.status === 'playing' &&
    (settings.mode === 'local' || gameState.turn === humanColor);

  // Move pairs for desktop notation panel
  const movePairs: { num: number; white?: string; black?: string }[] = [];
  for (let i = 0; i < gameState.history.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: gameState.history[i]?.san,
      black: gameState.history[i + 1]?.san,
    });
  }

  return (
    <div className="h-dvh w-screen overflow-hidden bg-[#14171C] text-slate-100 flex flex-col">
      {/* Compact Top Header (<=52px) */}
      <header className="h-12 shrink-0 px-3 sm:px-6 border-b border-white/[0.06] bg-[#171A20] flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-display font-bold text-base text-white whitespace-nowrap">
            Pocket Knight
          </span>
          <span className="text-slate-600" aria-hidden="true">
            ·
          </span>
          <span className="text-xs text-slate-400 truncate">
            {settings.mode === 'bot'
              ? `vs ${settings.difficulty.charAt(0).toUpperCase() + settings.difficulty.slice(1)} Bot`
              : 'Pass & Play'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="w-11 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center text-slate-300 cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {reviewingBoard ? (
            <button
              type="button"
              onClick={() => startNewMatch()}
              className="h-9 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Play Again</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setScreen('PAUSED')}
              aria-label="Pause match"
              className="w-11 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center text-slate-300 cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Playfield */}
      <main className="flex-1 min-h-0 w-full max-w-6xl mx-auto px-2.5 py-2 sm:px-6 sm:py-5 flex flex-col lg:flex-row items-center justify-center gap-3 lg:gap-8">
        {/* Left/Center: Top PlayerBar + Square Board + Bottom PlayerBar */}
        <div className="w-full max-w-[min(100vw-20px,calc(100dvh-220px))] lg:max-w-[min(560px,calc(100dvh-180px))] flex flex-col items-center justify-center gap-2 sm:gap-3 shrink-0">
          <PlayerBar
            name={getPlayerLabel(topColor)}
            isBot={isBotColor(topColor)}
            color={topColor}
            isActiveTurn={gameState.status === 'playing' && gameState.turn === topColor}
            isThinking={isBotColor(topColor) && isBotThinking}
            inCheck={gameState.inCheck && gameState.turn === topColor}
            capturedPieces={topColor === 'w' ? capturedByWhite : capturedByBlack}
            materialAdvantage={topColor === 'w' ? advantage : -advantage}
            timeLeftMs={clocks[topColor]}
          />

          <ChessBoard
            gameState={gameState}
            theme={theme}
            flipped={flipped}
            interactiveColor={interactiveColor}
            selectedSquare={selectedSquare}
            legalMovesForSelected={legalMovesForSelected}
            hintMove={hintMove}
            pendingPromotion={pendingPromotion}
            onSelectSquare={handleSelectSquare}
            onExecuteMove={handleExecuteMove}
            onSelectPromotion={handleSelectPromotion}
            onCancelPromotion={() => setPendingPromotion(null)}
          />

          <PlayerBar
            name={getPlayerLabel(bottomColor)}
            isBot={isBotColor(bottomColor)}
            color={bottomColor}
            isActiveTurn={gameState.status === 'playing' && gameState.turn === bottomColor}
            isThinking={isBotColor(bottomColor) && isBotThinking}
            inCheck={gameState.inCheck && gameState.turn === bottomColor}
            capturedPieces={bottomColor === 'w' ? capturedByWhite : capturedByBlack}
            materialAdvantage={bottomColor === 'w' ? advantage : -advantage}
            timeLeftMs={clocks[bottomColor]}
          />
        </div>

        {/* Desktop Side Panel: Move Notation, Theme, Controls */}
        <aside className="hidden lg:flex flex-col w-80 h-[min(560px,calc(100dvh-140px))] bg-[#191D24] border border-white/[0.07] rounded-2xl p-4 gap-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h2 className="font-display text-sm font-semibold text-white">
              Move Notation
            </h2>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              Ply {gameState.history.length}
            </span>
          </div>

          <div
            ref={moveListDesktopRef}
            className="flex-1 overflow-y-auto pr-1"
          >
            {movePairs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <p className="text-sm text-slate-400">
                  Make your opening move on the board.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Tap or drag any piece to play.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04] font-mono text-sm tabular-nums">
                {movePairs.map((pair) => (
                  <div
                    key={pair.num}
                    className="grid grid-cols-[40px_1fr_1fr] py-1.5 px-1.5 rounded hover:bg-white/[0.02]"
                  >
                    <span className="text-slate-500">{pair.num}.</span>
                    <span className="text-slate-100 font-medium">{pair.white}</span>
                    <span className="text-slate-300">{pair.black ?? ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Board Theme Quick Switch */}
          <div className="border-t border-white/[0.06] pt-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">Board Theme</span>
            <div className="flex items-center gap-1.5">
              {(Object.keys(BOARD_THEMES) as BoardThemeId[]).map((id) => {
                const t = BOARD_THEMES[id];
                const active = settings.boardTheme === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => updateSettings({ boardTheme: id })}
                    title={t.label}
                    aria-label={t.label}
                    className={`w-8 h-8 rounded-lg p-1 flex items-center justify-center cursor-pointer transition-transform ${
                      active
                        ? 'ring-2 ring-emerald-400 bg-[#262C36]'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-sm overflow-hidden grid grid-cols-2">
                      <span style={{ backgroundColor: t.lightSquare }} />
                      <span style={{ backgroundColor: t.darkSquare }} />
                      <span style={{ backgroundColor: t.darkSquare }} />
                      <span style={{ backgroundColor: t.lightSquare }} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Action Grid */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className="min-h-[44px] rounded-xl bg-[#242A34] hover:bg-[#2E3643] disabled:opacity-40 disabled:pointer-events-none text-slate-200 text-xs font-medium flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={handleHint}
              disabled={!canHint}
              className="min-h-[44px] rounded-xl bg-[#242A34] hover:bg-[#2E3643] disabled:opacity-40 disabled:pointer-events-none text-slate-200 text-xs font-medium flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <Lightbulb className="w-4 h-4" />
              <span>Hint</span>
            </button>
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              className="min-h-[44px] rounded-xl bg-[#242A34] hover:bg-[#2E3643] text-slate-200 text-xs font-medium flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>Flip</span>
            </button>
          </div>
        </aside>
      </main>

      {/* Mobile Android Bottom Thumb Action Bar */}
      <nav
        aria-label="Game controls"
        className="lg:hidden shrink-0 h-16 px-2 bg-[#171A20] border-t border-white/[0.06] grid grid-cols-4 items-center gap-1"
      >
        <button
          type="button"
          onClick={handleUndo}
          disabled={!canUndo}
          className="min-h-[48px] rounded-xl active:bg-white/5 disabled:opacity-35 disabled:pointer-events-none flex flex-col items-center justify-center gap-0.5 text-slate-200 cursor-pointer"
        >
          <Undo2 className="w-5 h-5" />
          <span className="text-[11px] font-medium">Undo</span>
        </button>

        <button
          type="button"
          onClick={handleHint}
          disabled={!canHint}
          className="min-h-[48px] rounded-xl active:bg-white/5 disabled:opacity-35 disabled:pointer-events-none flex flex-col items-center justify-center gap-0.5 text-slate-200 cursor-pointer"
        >
          <Lightbulb className="w-5 h-5" />
          <span className="text-[11px] font-medium">Hint</span>
        </button>

        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="min-h-[48px] rounded-xl active:bg-white/5 flex flex-col items-center justify-center gap-0.5 text-slate-200 cursor-pointer"
        >
          <ArrowUpDown className="w-5 h-5" />
          <span className="text-[11px] font-medium">Flip</span>
        </button>

        <button
          type="button"
          onClick={() => setShowMovesDrawer(true)}
          className="min-h-[48px] rounded-xl active:bg-white/5 flex flex-col items-center justify-center gap-0.5 text-slate-200 cursor-pointer"
        >
          <List className="w-5 h-5" />
          <span className="text-[11px] font-medium tabular-nums">
            Moves{gameState.history.length > 0 ? ` (${gameState.history.length})` : ''}
          </span>
        </button>
      </nav>

      {/* Modals & Drawers */}
      {screen === 'PAUSED' && (
        <PauseModal
          boardTheme={settings.boardTheme}
          muted={muted}
          onChangeTheme={(id) => updateSettings({ boardTheme: id })}
          onToggleMute={toggleMute}
          onResume={() => setScreen('PLAYING')}
          onRestart={() => startNewMatch()}
          onResign={handleResign}
          onMainMenu={() => setScreen('TITLE_MENU')}
        />
      )}

      {screen === 'GAME_OVER' && !reviewingBoard && gameOverSummary && (
        <GameOverModal
          summary={gameOverSummary}
          totalPlies={gameState.history.length}
          onReviewBoard={() => setReviewingBoard(true)}
          onPlayAgain={() => startNewMatch()}
          onMainMenu={() => setScreen('TITLE_MENU')}
        />
      )}

      {showMovesDrawer && (
        <MovesDrawer
          history={gameState.history}
          onClose={() => setShowMovesDrawer(false)}
        />
      )}
    </div>
  );
}
