import React, { useEffect } from 'react';
import { Bot, Users, Play } from 'lucide-react';
import { ChessPiece } from './ChessPiece';
import {
  BOARD_THEMES,
  BoardThemeId,
  ColorChoice,
  MatchSettings,
  OpponentMode,
  TimeControlMinutes,
} from '../types/game';
import { BotDifficulty } from '../engine/bot';
import { createInitialBoard } from '../engine/chess';

interface TitleScreenProps {
  settings: MatchSettings;
  onUpdateSettings: (next: Partial<MatchSettings>) => void;
  onStartGame: () => void;
}

const PREVIEW_BOARD = createInitialBoard();

export const TitleScreen: React.FC<TitleScreenProps> = ({
  settings,
  onUpdateSettings,
  onStartGame,
}) => {
  const theme = BOARD_THEMES[settings.boardTheme];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'BUTTON' || tag === 'INPUT') return;
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStartGame]);

  return (
    <div className="relative h-dvh w-screen overflow-y-auto bg-[#14171C] text-slate-100 flex flex-col justify-between">
      <div className="flex-1 w-full max-w-6xl mx-auto px-5 py-6 md:px-10 md:py-10 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-14">
        {/* Left: Title Lockup & Match Configuration */}
        <div className="w-full max-w-md flex flex-col gap-6">
          {/* Bespoke SVG Title Lockup */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1E232B] border border-white/10 flex items-center justify-center shrink-0 shadow-lg shadow-black/30">
              <svg viewBox="0 0 48 48" className="w-9 h-9" aria-hidden="true">
                <path
                  d="M24 9c9.5 1 15 7.5 14.5 27H16.5c0-8 9-5.5 7.2-19"
                  fill="#10B981"
                  stroke="#ECFDF5"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M25.5 17c.4 2.8-5.2 7-7.5 8.5-2.8 1.8-2.6 4-4.7 3.7-.9-.8 1.4-2.8 0-2.8-.9 0 .2 1.1-.9 1.8-.9 0-3.7.9-3.7-3.7 0-1.9 5.5-11 5.5-11s1.7-1.7 1.9-3.2c-.7-.9-.5-1.9-.5-2.8.9-.9 2.8 2.3 2.8 2.3h1.9s.7-1.8 2.3-2.8c.9 0 .9 2.8.9 2.8"
                  fill="#ECFDF5"
                  stroke="#0F172A"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="17" cy="14.5" r="1.1" fill="#0F172A" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Pocket Knight
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Clean, tactile chess built for quick matches anywhere
              </p>
            </div>
          </div>

          {/* Match Setup Panel */}
          <div className="bg-[#1C2028] border border-white/[0.08] rounded-3xl p-5 flex flex-col gap-5 shadow-xl shadow-black/25">
            {/* Opponent Mode */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-slate-400">Opponent</span>
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#14171C] rounded-xl">
                {(
                  [
                    { id: 'bot', label: 'Play vs Bot', icon: Bot },
                    { id: 'local', label: 'Pass & Play', icon: Users },
                  ] as { id: OpponentMode; label: string; icon: React.ComponentType<{ className?: string }> }[]
                ).map((item) => {
                  const Icon = item.icon;
                  const active = settings.mode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onUpdateSettings({ mode: item.id })}
                      className={`min-h-[44px] px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-[#282E39] text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bot Difficulty & Side (only when vs Bot) */}
            {settings.mode === 'bot' && (
              <>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-slate-400">Bot Strength</span>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-[#14171C] rounded-xl">
                    {(['easy', 'medium', 'hard'] as BotDifficulty[]).map((lvl) => {
                      const active = settings.difficulty === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => onUpdateSettings({ difficulty: lvl })}
                          className={`min-h-[44px] rounded-lg text-sm font-medium capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'bg-[#282E39] text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {lvl}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-slate-400">Play As</span>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-[#14171C] rounded-xl">
                    {(
                      [
                        { id: 'w', label: 'White' },
                        { id: 'random', label: 'Random' },
                        { id: 'b', label: 'Black' },
                      ] as { id: ColorChoice; label: string }[]
                    ).map((opt) => {
                      const active = settings.playerColorChoice === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onUpdateSettings({ playerColorChoice: opt.id })}
                          className={`min-h-[44px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'bg-[#282E39] text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Time Control */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-slate-400">Match Clock</span>
              <div className="grid grid-cols-4 gap-2 p-1 bg-[#14171C] rounded-xl">
                {(
                  [
                    { val: 0, label: 'Untimed' },
                    { val: 3, label: '3 min' },
                    { val: 5, label: '5 min' },
                    { val: 10, label: '10 min' },
                  ] as { val: TimeControlMinutes; label: string }[]
                ).map((tc) => {
                  const active = settings.timeMinutes === tc.val;
                  return (
                    <button
                      key={tc.val}
                      type="button"
                      onClick={() => onUpdateSettings({ timeMinutes: tc.val })}
                      className={`min-h-[44px] rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                        active
                          ? 'bg-[#282E39] text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tc.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Board Finish */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <span className="text-xs font-medium text-slate-400">Board Style</span>
              <div className="flex items-center gap-2">
                {(Object.keys(BOARD_THEMES) as BoardThemeId[]).map((id) => {
                  const t = BOARD_THEMES[id];
                  const active = settings.boardTheme === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onUpdateSettings({ boardTheme: id })}
                      aria-label={t.label}
                      title={t.label}
                      className={`w-11 h-11 rounded-xl p-1 flex items-center justify-center transition-transform cursor-pointer ${
                        active
                          ? 'ring-2 ring-emerald-400 scale-105 bg-[#282E39]'
                          : 'opacity-75 hover:opacity-100 bg-[#14171C]'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 border border-black/20">
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
          </div>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={onStartGame}
            className="w-full min-h-[52px] px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-display font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Start Match</span>
          </button>

          {/* Single flat control hint line */}
          <p className="text-center text-xs text-slate-500 font-mono">
            Tap or drag pieces · Z Undo · H Hint · Esc Pause
          </p>
        </div>

        {/* Right: Live Preview Board (desktop & tablet showcase) */}
        <div className="hidden lg:flex flex-col items-center justify-center w-full max-w-[440px]">
          <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 grid grid-cols-8 grid-rows-8 pointer-events-none select-none">
            {PREVIEW_BOARD.map((row, rIdx) =>
              row.map((piece, cIdx) => {
                const isLight = (rIdx + cIdx) % 2 === 0;
                const isHighlight =
                  (rIdx === 6 && cIdx === 4) || (rIdx === 4 && cIdx === 4);
                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    className="relative flex items-center justify-center"
                    style={{
                      backgroundColor: isHighlight
                        ? isLight
                          ? theme.lastMoveLight
                          : theme.lastMoveDark
                        : isLight
                        ? theme.lightSquare
                        : theme.darkSquare,
                    }}
                  >
                    {piece && (
                      <div className="w-[82%] h-[82%]">
                        <ChessPiece type={piece.type} color={piece.color} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            {theme.label} · Standard 8×8 Rules
          </p>
        </div>
      </div>
    </div>
  );
};
