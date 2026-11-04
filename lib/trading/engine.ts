import {
  DEFAULT_STRATEGY_CONFIG,
  DERIV_CONTRACT_TYPES,
  evaluateSignal,
  updateMartingale,
  type BotName,
  type StrategyConfig,
  type Tick,
  type TradingSignal,
} from './strategy';

export type EngineStatus = 'stopped' | 'running' | 'buy_pending' | 'contract_open' | 'paused';

export interface EngineConfig {
  bot: BotName;
  symbol: string;
  baseStake: number;
  profitTarget: number;
  lossLimit: number;
  strategy?: StrategyConfig;
}

export interface BuyRequest {
  symbol: string;
  contractType: string;
  stake: number;
  duration: 1;
  durationUnit: 't';
  barrier?: number;
  signal: TradingSignal;
  idempotencyKey: string;
}

export interface EngineSnapshot {
  status: EngineStatus;
  symbol: string;
  bot: BotName;
  pnl: number;
  baseStake: number;
  stake: number;
  martingaleLevel: number;
  openContractId: number | null;
  lastProcessedTick: number | null;
  lastError: string | null;
}

export type BuyExecutor = (request: BuyRequest) => Promise<{ contractId: number }>;

const MIN_STAKE = 0.35;
const MAX_MARTINGALE_LEVEL = 20;

/**
 * Server-owned trading state machine. The caller must persist snapshots and
 * serialize events per user/account (e.g. a single background-worker owner).
 * This class intentionally has no browser or Deriv credential access.
 */
export class TradingEngine {
  private status: EngineStatus = 'stopped';
  private pnl = 0;
  private stake: number;
  private level = 0;
  private openContractId: number | null = null;
  private lastProcessedTick: number | null = null;
  private lastError: string | null = null;
  private buySequence = 0;
  private readonly seenTickKeys = new Set<string>();
  private readonly strategy: StrategyConfig;

  constructor(
    private readonly config: EngineConfig,
    private readonly executeBuy: BuyExecutor,
  ) {
    if (!Number.isFinite(config.baseStake) || config.baseStake < MIN_STAKE) {
      throw new Error(`Stake mínimo permitido: ${MIN_STAKE.toFixed(2)}`);
    }
    this.stake = Number(config.baseStake.toFixed(2));
    this.strategy = config.strategy ?? DEFAULT_STRATEGY_CONFIG;
  }

  start() {
    if (this.status === 'buy_pending' || this.status === 'contract_open') {
      throw new Error('Não é possível reiniciar enquanto existe uma compra ou contrato pendente.');
    }
    this.pnl = 0;
    this.level = 0;
    this.stake = this.config.baseStake;
    this.lastError = null;
    this.status = 'running';
    this.seenTickKeys.clear();
    this.lastProcessedTick = null;
  }

  stop() {
    // A stop never cancels an accepted Deriv contract. It only prevents new buys.
    this.status = this.openContractId ? 'contract_open' : 'stopped';
  }

  async onTick(tick: Tick & { epoch?: number }): Promise<void> {
    if (this.status !== 'running') return;

    const tickKey = tick.epoch == null
      ? `${String(tick.quote)}:${String(tick.pip_size ?? '')}`
      : String(tick.epoch);
    if (this.seenTickKeys.has(tickKey)) return;
    this.seenTickKeys.add(tickKey);
    if (this.seenTickKeys.size > 2000) {
      const first = this.seenTickKeys.values().next().value;
      if (first !== undefined) this.seenTickKeys.delete(first);
    }
    this.lastProcessedTick = tick.epoch ?? null;

    const signal = evaluateSignal(this.config.bot, [tick], this.strategy);
    // evaluateSignal expects a rolling window; this class retains only the
    // latest five ticks in its own private buffer.
    if (!signal) return;
    await this.placeBuy(signal);
  }

  private tickWindow: Tick[] = [];

  async onMarketTick(tick: Tick & { epoch?: number }): Promise<void> {
    if (this.status !== 'running') return;
    const tickKey = tick.epoch == null
      ? `${String(tick.quote)}:${String(tick.pip_size ?? '')}`
      : String(tick.epoch);
    if (this.seenTickKeys.has(tickKey)) return;
    this.seenTickKeys.add(tickKey);
    if (this.seenTickKeys.size > 2000) {
      const first = this.seenTickKeys.values().next().value;
      if (first !== undefined) this.seenTickKeys.delete(first);
    }
    this.lastProcessedTick = tick.epoch ?? null;
    this.tickWindow.push(tick);
    if (this.tickWindow.length > this.strategy.windowSize) this.tickWindow.shift();
    const signal = evaluateSignal(this.config.bot, this.tickWindow, this.strategy);
    if (signal) await this.placeBuy(signal);
  }

  private async placeBuy(signal: TradingSignal) {
    if (this.status !== 'running' || this.openContractId !== null) return;
    this.status = 'buy_pending';
    const sequence = ++this.buySequence;
    const request: BuyRequest = {
      symbol: this.config.symbol,
      contractType: DERIV_CONTRACT_TYPES[signal.type],
      stake: this.stake,
      duration: 1,
      durationUnit: 't',
      ...(signal.barrier === undefined ? {} : { barrier: signal.barrier }),
      signal,
      idempotencyKey: `${this.config.symbol}:${this.config.bot}:${sequence}`,
    };

    try {
      const result = await this.executeBuy(request);
      if (!Number.isSafeInteger(result.contractId) || result.contractId <= 0) {
        throw new Error('A Deriv devolveu um identificador de contrato inválido.');
      }
      this.openContractId = result.contractId;
      this.status = 'contract_open';
      this.lastError = null;
    } catch (error) {
      this.status = 'paused';
      this.lastError = error instanceof Error ? error.message : 'Falha ao executar compra';
      throw error;
    }
  }

  onContractClosed(contractId: number, profitLoss: number) {
    if (this.openContractId !== contractId) return false;
    if (!Number.isFinite(profitLoss)) throw new Error('Resultado do contrato inválido.');

    this.pnl = Number((this.pnl + profitLoss).toFixed(2));
    const next = updateMartingale({
      baseStake: this.config.baseStake,
      stake: this.stake,
      level: this.level,
    }, profitLoss, MAX_MARTINGALE_LEVEL);
    this.stake = next.stake;
    this.level = next.level;
    this.openContractId = null;

    if ((this.config.profitTarget > 0 && this.pnl >= this.config.profitTarget) ||
        (this.config.lossLimit > 0 && this.pnl <= -this.config.lossLimit)) {
      this.status = 'stopped';
    } else if (this.status !== 'stopped') {
      this.status = 'running';
    }
    return true;
  }

  snapshot(): EngineSnapshot {
    return {
      status: this.status,
      symbol: this.config.symbol,
      bot: this.config.bot,
      pnl: this.pnl,
      baseStake: this.config.baseStake,
      stake: this.stake,
      martingaleLevel: this.level,
      openContractId: this.openContractId,
      lastProcessedTick: this.lastProcessedTick,
      lastError: this.lastError,
    };
  }
}
