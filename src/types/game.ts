import { BotDifficulty } from '../engine/bot';
import { Color } from '../engine/chess';

export type GameScreenState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
export type OpponentMode = 'bot' | 'local';
export type ColorChoice = 'w' | 'b' | 'random';
export type TimeControlMinutes = 0 | 3 | 5 | 10; // 0 = Untimed

export type BoardThemeId = 'forest' | 'walnut' | 'slate';

export interface BoardTheme {
  id: BoardThemeId;
  label: string;
  lightSquare: string;
  darkSquare: string;
  lightCoord: string;
  darkCoord: string;
  selected: string;
  lastMoveLight: string;
  lastMoveDark: string;
}

export const BOARD_THEMES: Record<BoardThemeId, BoardTheme> = {
  forest: {
    id: 'forest',
    label: 'Tournament Green',
    lightSquare: '#EBECD0',
    darkSquare: '#739552',
    lightCoord: '#739552',
    darkCoord: '#EBECD0',
    selected: 'rgba(245, 196, 61, 0.58)',
    lastMoveLight: 'rgba(245, 214, 92, 0.55)',
    lastMoveDark: 'rgba(186, 202, 68, 0.65)',
  },
  walnut: {
    id: 'walnut',
    label: 'Classic Walnut',
    lightSquare: '#F0D9B5',
    darkSquare: '#B58863',
    lightCoord: '#B58863',
    darkCoord: '#F0D9B5',
    selected: 'rgba(34, 197, 94, 0.45)',
    lastMoveLight: 'rgba(245, 208, 92, 0.52)',
    lastMoveDark: 'rgba(205, 170, 74, 0.58)',
  },
  slate: {
    id: 'slate',
    label: 'Android Slate',
    lightSquare: '#DEE3E6',
    darkSquare: '#6E859B',
    lightCoord: '#6E859B',
    darkCoord: '#DEE3E6',
    selected: 'rgba(16, 185, 129, 0.48)',
    lastMoveLight: 'rgba(56, 189, 248, 0.36)',
    lastMoveDark: 'rgba(56, 189, 248, 0.42)',
  },
};

export interface MatchSettings {
  mode: OpponentMode;
  difficulty: BotDifficulty;
  playerColorChoice: ColorChoice;
  timeMinutes: TimeControlMinutes;
  boardTheme: BoardThemeId;
}

export interface GameOverSummary {
  title: string;
  subtitle: string;
  winner: Color | null;
  reason: string;
}
