import React from 'react';
import { Bot, User, Clock } from 'lucide-react';
import { Color, PieceType } from '../engine/chess';
import { ChessPiece } from './ChessPiece';

interface PlayerBarProps {
  name: string;
  isBot?: boolean;
  color: Color;
  isActiveTurn: boolean;
  isThinking?: boolean;
  inCheck?: boolean;
  capturedPieces: PieceType[];
  materialAdvantage: number; // positive if THIS player is ahead
  timeLeftMs: number | null; // null if untimed
}

function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  name,
  isBot = false,
  color,
  isActiveTurn,
  isThinking = false,
  inCheck = false,
  capturedPieces,
  materialAdvantage,
  timeLeftMs,
}) => {
  const isLowTime = timeLeftMs !== null && timeLeftMs > 0 && timeLeftMs <= 30_000;

  return (
    <div
      className={`w-full px-3 py-2 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
        isActiveTurn
          ? 'bg-[#222731] border-emerald-500/45'
          : 'bg-[#191D24] border-white/[0.06]'
      }`}
    >
      {/* Left: Avatar + Name + Captures */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
            color === 'w'
              ? 'bg-[#F1EFE7] text-slate-900 border-black/15'
              : 'bg-[#252A34] text-slate-100 border-white/10'
          }`}
        >
          {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
        </div>

        <div className="min-w-0 flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">
              {name}
            </span>
            {inCheck && (
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wide shrink-0">
                Check
              </span>
            )}
            {!inCheck && isThinking && (
              <span className="text-xs text-emerald-400 shrink-0">
                Thinking...
              </span>
            )}
            {!inCheck && !isThinking && isActiveTurn && (
              <span className="text-xs text-emerald-400 shrink-0">
                Turn
              </span>
            )}
          </div>

          {/* Captured pieces & material lead */}
          <div className="flex items-center gap-1 min-h-[16px]">
            {capturedPieces.length > 0 ? (
              <div className="flex items-center -space-x-1">
                {capturedPieces.slice(0, 10).map((type, idx) => (
                  <div key={`${type}-${idx}`} className="w-4 h-4">
                    <ChessPiece
                      type={type}
                      color={color === 'w' ? 'b' : 'w'}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-slate-500">
                {color === 'w' ? 'White' : 'Black'}
              </span>
            )}
            {materialAdvantage > 0 && (
              <span className="text-[11px] font-mono font-semibold text-slate-300 tabular-nums ml-1">
                +{materialAdvantage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Optional Clock */}
      {timeLeftMs !== null && (
        <div
          className={`px-3 py-1.5 rounded-lg font-mono text-sm sm:text-base font-bold tabular-nums flex items-center gap-1.5 shrink-0 ${
            isLowTime && isActiveTurn
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : isActiveTurn
              ? 'bg-[#14171C] text-white border border-white/10'
              : 'bg-[#14171C]/60 text-slate-400 border border-transparent'
          }`}
        >
          <Clock className="w-3.5 h-3.5 opacity-70" />
          <span>{formatClock(timeLeftMs)}</span>
        </div>
      )}
    </div>
  );
};
