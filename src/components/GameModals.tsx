import React from 'react';
import {
  RotateCcw,
  Play,
  Home,
  Volume2,
  VolumeX,
  Trophy,
  Handshake,
  X,
  Flag,
} from 'lucide-react';
import {
  BOARD_THEMES,
  BoardThemeId,
  GameOverSummary,
} from '../types/game';
import { MoveRecord } from '../engine/chess';

interface PauseModalProps {
  boardTheme: BoardThemeId;
  muted: boolean;
  onChangeTheme: (id: BoardThemeId) => void;
  onToggleMute: () => void;
  onResume: () => void;
  onRestart: () => void;
  onResign: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  boardTheme,
  muted,
  onChangeTheme,
  onToggleMute,
  onResume,
  onRestart,
  onResign,
  onMainMenu,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onResume}
    >
      <div
        className="w-full sm:max-w-sm bg-[#1C2028] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-slate-600 rounded-full mx-auto sm:hidden" />
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">
            Match Paused
          </h2>
          <button
            type="button"
            onClick={onResume}
            aria-label="Resume match"
            className="w-11 h-11 rounded-xl bg-[#262B35] hover:bg-[#303744] flex items-center justify-center text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Board Style Selector */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-slate-400">Board Theme</span>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(BOARD_THEMES) as BoardThemeId[]).map((id) => {
              const t = BOARD_THEMES[id];
              const active = boardTheme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChangeTheme(id)}
                  className={`min-h-[44px] px-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#282E39] border-emerald-400/70 text-white'
                      : 'bg-[#14171C] border-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-sm overflow-hidden grid grid-cols-2 shrink-0">
                    <span style={{ backgroundColor: t.lightSquare }} />
                    <span style={{ backgroundColor: t.darkSquare }} />
                  </span>
                  <span className="truncate">{t.label.split(' ')[1] ?? t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={onToggleMute}
          className="min-h-[46px] px-4 rounded-xl bg-[#262B35] hover:bg-[#303744] text-slate-200 text-sm font-medium flex items-center justify-between cursor-pointer"
        >
          <span>Sound Effects</span>
          <span className="flex items-center gap-2 text-slate-400">
            {muted ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span>Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">On</span>
              </>
            )}
          </span>
        </button>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            type="button"
            onClick={onResume}
            className="w-full min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume Match</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onRestart}
              className="min-h-[44px] rounded-xl bg-[#262B35] hover:bg-[#303744] text-slate-200 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restart</span>
            </button>
            <button
              type="button"
              onClick={onResign}
              className="min-h-[44px] rounded-xl bg-[#262B35] hover:bg-rose-500/20 text-rose-300 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
            >
              <Flag className="w-4 h-4" />
              <span>Resign</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onMainMenu}
            className="w-full min-h-[44px] rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  summary: GameOverSummary;
  totalPlies: number;
  onReviewBoard: () => void;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  summary,
  totalPlies,
  onReviewBoard,
  onPlayAgain,
  onMainMenu,
}) => {
  const isDraw = summary.winner === null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#1C2028] border border-white/12 rounded-3xl p-6 flex flex-col items-center text-center gap-4 shadow-2xl">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            isDraw
              ? 'bg-amber-500/15 text-amber-400'
              : 'bg-emerald-500/15 text-emerald-400'
          }`}
        >
          {isDraw ? <Handshake className="w-7 h-7" /> : <Trophy className="w-7 h-7" />}
        </div>

        <div>
          <h2 className="font-display text-2xl font-bold text-white">
            {summary.title}
          </h2>
          <p className="text-sm text-slate-300 mt-1">{summary.subtitle}</p>
        </div>

        <div className="w-full py-2.5 px-4 rounded-xl bg-[#14171C] border border-white/5 flex items-center justify-center gap-3 text-xs text-slate-400 font-mono tabular-nums">
          <span>{summary.reason}</span>
          <span aria-hidden="true">·</span>
          <span>{Math.ceil(totalPlies / 2)} moves</span>
        </div>

        <div className="w-full flex flex-col gap-2.5 pt-1">
          <button
            type="button"
            onClick={onPlayAgain}
            className="w-full min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onReviewBoard}
              className="min-h-[44px] rounded-xl bg-[#262B35] hover:bg-[#303744] text-slate-200 text-sm font-medium cursor-pointer"
            >
              Review Board
            </button>
            <button
              type="button"
              onClick={onMainMenu}
              className="min-h-[44px] rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-sm font-medium cursor-pointer"
            >
              Main Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MovesDrawerProps {
  history: MoveRecord[];
  onClose: () => void;
}

export const MovesDrawer: React.FC<MovesDrawerProps> = ({ history, onClose }) => {
  const movePairs: { num: number; white?: string; black?: string }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: history[i]?.san,
      black: history[i + 1]?.san,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 flex items-end justify-center lg:hidden"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[68dvh] bg-[#1C2028] border-t border-white/10 rounded-t-3xl p-5 flex flex-col gap-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-slate-600 rounded-full mx-auto" />
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-white">
            Move History
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close move history"
            className="w-11 h-11 rounded-xl bg-[#262B35] flex items-center justify-center text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {movePairs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              No moves played yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 divide-y divide-white/5 font-mono text-sm tabular-nums">
              {movePairs.map((pair) => (
                <div key={pair.num} className="grid grid-cols-[44px_1fr_1fr] py-2 px-2">
                  <span className="text-slate-500">{pair.num}.</span>
                  <span className="text-slate-100 font-medium">{pair.white}</span>
                  <span className="text-slate-300">{pair.black ?? ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
