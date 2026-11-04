/**
 * Server-side trading rules for Izitrader.
 *
 * This module is intentionally free of browser APIs and Deriv transport code.
 * The runtime that owns a user's Deriv session must call these functions.
 * Never import this module from a client component or expose its results as
 * implementation details in a public asset.
 */

export type BotName = 'ProParity' | 'Octawin';
export type SignalType = 'EVEN' | 'ODD' | 'OVER' | 'UNDER';

export interface Tick {
  quote: number | string;
  pip_size?: number;
}

export interface TradingSignal {
  type: SignalType;
  confidence: number;
  barrier?: number;
}

export interface StrategyConfig {
  windowSize: 5;
  triggerPercent: 65;
  overBarrier: 5;
  underBarrier: 4;
}

export const DEFAULT_STRATEGY_CONFIG: Readonly<StrategyConfig> = Object.freeze({
  windowSize: 5,
  triggerPercent: 65,
  overBarrier: 5,
  underBarrier: 4,
});

export const DERIV_CONTRACT_TYPES: Readonly<Record<SignalType, string>> = Object.freeze({
  EVEN: 'DIGITEVEN',
  ODD: 'DIGITODD',
  OVER: 'DIGITOVER',
  UNDER: 'DIGITUNDER',
});

export function getLastDigit(quote: number | string, pipSize = 2): number | null {
  const value = Number(quote);
  if (!Number.isFinite(value)) return null;

  const precision = Number.isInteger(Number(pipSize))
    ? Math.max(0, Math.min(10, Number(pipSize)))
    : 2;
  const digit = Number(value.toFixed(precision).slice(-1));
  return Number.isInteger(digit) && digit >= 0 && digit <= 9 ? digit : null;
}

/**
 * Preserve the current Izitrader rule: analyze the latest five ticks and
 * trigger at 65%. With five observations, 65% means at least four matching
 * digits (80%); the percentage calculation remains compatible with the UI.
 */
export function evaluateSignal(
  bot: BotName,
  ticks: readonly Tick[],
  config: StrategyConfig = DEFAULT_STRATEGY_CONFIG,
): TradingSignal | null {
  if (ticks.length < config.windowSize) return null;

  const digits = ticks
    .slice(-config.windowSize)
    .map((tick) => getLastDigit(tick.quote, tick.pip_size));

  if (digits.some((digit) => digit === null)) return null;
  const validDigits = digits as number[];

  if (bot === 'ProParity') {
    const even = (validDigits.filter((digit) => digit % 2 === 0).length / config.windowSize) * 100;
    const odd = (validDigits.filter((digit) => digit % 2 !== 0).length / config.windowSize) * 100;

    if (even >= config.triggerPercent) return { type: 'EVEN', confidence: even };
    if (odd >= config.triggerPercent) return { type: 'ODD', confidence: odd };
    return null;
  }

  const over = (validDigits.filter((digit) => digit > config.overBarrier).length / config.windowSize) * 100;
  const under = (validDigits.filter((digit) => digit < config.underBarrier).length / config.windowSize) * 100;

  if (over >= config.triggerPercent) {
    return { type: 'OVER', confidence: over, barrier: config.overBarrier };
  }
  if (under >= config.triggerPercent) {
    return { type: 'UNDER', confidence: under, barrier: config.underBarrier };
  }
  return null;
}

export interface MartingaleState {
  baseStake: number;
  stake: number;
  level: number;
}

export function updateMartingale(
  state: MartingaleState,
  profitLoss: number,
  maxLevel = 20,
): MartingaleState {
  if (!Number.isFinite(profitLoss)) return state;
  if (profitLoss < 0) {
    const level = Math.min(maxLevel, state.level + 1);
    return {
      baseStake: state.baseStake,
      level,
      stake: Number((state.baseStake * Math.pow(2, level)).toFixed(2)),
    };
  }
  return { baseStake: state.baseStake, level: 0, stake: state.baseStake };
}

export function hasReachedSessionTarget(
  pnl: number,
  profitTarget: number,
  lossLimit: number,
): 'profit' | 'loss' | null {
  if (profitTarget > 0 && pnl >= profitTarget) return 'profit';
  if (lossLimit > 0 && pnl <= -lossLimit) return 'loss';
  return null;
}
