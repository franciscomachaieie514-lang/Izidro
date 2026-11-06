'use strict';

const http = require('http');
const { parse: parseUrl } = require('url');
const { createHash, randomUUID } = require('crypto');
const next = require('next');
const { Pool } = require('pg');
const WebSocket = require('ws');
const { SYMBOLS, BOTS, CONTRACTS, evaluateSignal, updateMartingale } = require('./lib/trading/strategy.cjs');

const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname: '0.0.0.0', port });
const handle = app.getRequestHandler();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  // Each connected dashboard worker holds one client for its advisory account lock.
  // Leave room for 10+ users plus ordinary session/API queries.
  max: 20,
  connectionTimeoutMillis: 8000,
  query_timeout: 15000,
  statement_timeout: 15000,
  idleTimeoutMillis: 30000,
});
const activeWorkers = new Set();

function cookieMap(header='') {
  const out = Object.create(null);
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i < 1) continue;
    const key = part.slice(0, i).trim();
    try { out[key] = decodeURIComponent(part.slice(i + 1).trim()); } catch { out[key] = ''; }
  }
  return out;
}

async function resolveSocketIdentity(req) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_NOT_CONFIGURED');
  const cookies = cookieMap(req.headers.cookie || '');
  const sessionId = cookies.izidro_session;
  if (sessionId) {
    const result = await pool.query(
      'SELECT u.id,u.name,u.email FROM platform_sessions s JOIN platform_users u ON u.id=s.user_id WHERE s.id=$1 AND s.expires_at>NOW() LIMIT 1',
      [sessionId],
    );
    const user = result.rows[0];
    if (user) {
      const deriv = await pool.query(
        'SELECT access_token FROM deriv_accounts WHERE user_id=$1 LIMIT 1',
        [user.id],
      );
      if (deriv.rows[0]?.access_token) {
        return {
          ownerKey: 'user:' + String(user.id),
          userId: String(user.id),
          accessToken: deriv.rows[0].access_token,
          guest: false,
        };
      }
    }
  }
  const guestToken = cookies.deriv_access_token;
  if (guestToken && guestToken.length >= 20) {
    const fingerprint = createHash('sha256').update(guestToken).digest('hex');
    return {
      ownerKey: 'guest:' + fingerprint,
      userId: null,
      accessToken: guestToken,
      guest: true,
    };
  }
  return null;
}

async function fetchJson(url, init={}, timeoutMs=12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, cache: 'no-store', signal: controller.signal });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : {}; } catch {}
    if (!data || typeof data !== 'object') {
      const error = new Error('Deriv devolveu uma resposta inválida.');
      error.code = 'DERIV_INVALID_RESPONSE';
      error.status = 502;
      throw error;
    }
    if (!response.ok) {
      const first = Array.isArray(data.errors) ? data.errors[0] : data.error;
      const error = new Error(String(first?.message || 'Pedido à Deriv recusado.').slice(0, 220));
      error.code = String(first?.code || 'DERIV_REQUEST_FAILED');
      error.status = response.status;
      error.retryAfterMs = response.status === 503
        ? Math.max(30000, Number(response.headers.get('Retry-After') || 0) * 1000)
        : 0;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function isReal(account) {
  const type = String(account?.account_type || account?.type || '').toLowerCase();
  const id = String(account?.account_id || account?.accountId || account?.id || account?.loginid || '');
  return type === 'real' || account?.is_virtual === false || /^CR/i.test(id);
}
function isDemo(account) {
  const type = String(account?.account_type || account?.type || '').toLowerCase();
  const id = String(account?.account_id || account?.accountId || account?.id || account?.loginid || '');
  return type === 'demo' || account?.is_virtual === true || /^VR/i.test(id);
}

let tradingSchemaPromise = null;
async function ensureTradingSchema() {
  if (tradingSchemaPromise) return tradingSchemaPromise;
  tradingSchemaPromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS izitrader_trade_sessions (
        owner_key TEXT NOT NULL,
        account_id TEXT NOT NULL,
        worker_id TEXT NOT NULL DEFAULT 'legacy',
        account_type TEXT NOT NULL,
        symbol TEXT NOT NULL,
        bot TEXT NOT NULL,
        base_stake NUMERIC(18,2) NOT NULL DEFAULT 0.35,
        stake NUMERIC(18,2) NOT NULL DEFAULT 0.35,
        martingale_level INTEGER NOT NULL DEFAULT 0,
        session_pnl NUMERIC(18,2) NOT NULL DEFAULT 0,
        profit_target NUMERIC(18,2) NOT NULL DEFAULT 0,
        loss_limit NUMERIC(18,2) NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT FALSE,
        status TEXT NOT NULL DEFAULT 'stopped',
        open_contract_id BIGINT,
        pending_buy BOOLEAN NOT NULL DEFAULT FALSE,
        pending_buy_at TIMESTAMPTZ,
        opened_at TIMESTAMPTZ,
        open_trade_bot TEXT,
        open_trade_stake NUMERIC(18,2),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (owner_key, account_id, worker_id)
      );
      CREATE TABLE IF NOT EXISTS izitrader_trade_history (
        owner_key TEXT NOT NULL,
        account_id TEXT NOT NULL,
        contract_id BIGINT NOT NULL,
        bot TEXT NOT NULL,
        symbol TEXT NOT NULL,
        stake NUMERIC(18,2) NOT NULL,
        profit_loss NUMERIC(18,2) NOT NULL,
        result TEXT NOT NULL,
        last_digit INTEGER,
        opened_at TIMESTAMPTZ,
        closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (owner_key, account_id, contract_id)
      );
      ALTER TABLE izitrader_trade_sessions ADD COLUMN IF NOT EXISTS worker_id TEXT NOT NULL DEFAULT 'legacy';
      ALTER TABLE izitrader_trade_sessions ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
      ALTER TABLE izitrader_trade_sessions ADD COLUMN IF NOT EXISTS open_trade_bot TEXT;
      ALTER TABLE izitrader_trade_sessions ADD COLUMN IF NOT EXISTS open_trade_stake NUMERIC(18,2);
      DO $$
      DECLARE pk_name TEXT;
      BEGIN
        SELECT c.conname INTO pk_name FROM pg_constraint c
         WHERE c.conrelid='izitrader_trade_sessions'::regclass AND c.contype='p';
        IF pk_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE izitrader_trade_sessions DROP CONSTRAINT %I',pk_name);
        END IF;
        ALTER TABLE izitrader_trade_sessions
          ADD CONSTRAINT izitrader_trade_sessions_pkey PRIMARY KEY (owner_key,account_id,worker_id);
      END $$;
      CREATE INDEX IF NOT EXISTS izitrader_trade_history_closed_idx
        ON izitrader_trade_history(owner_key, account_id, closed_at DESC);
    `);
  })();
  try {
    await tradingSchemaPromise;
  } catch (error) {
    tradingSchemaPromise = null;
    throw error;
  }
}
function sendClient(client, type, payload={}) {
  if (client && client.readyState === WebSocket.OPEN) {
    try { client.send(JSON.stringify({ type, ...payload })); } catch {}
  }
}
function sendDeriv(socket, payload) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  try { socket.send(JSON.stringify(payload)); return true; } catch { return false; }
}

class TradingWorker {
  constructor(client, identity, config) {
    this.client = client;
    this.identity = identity;
    this.config = config;
    this.deriv = null;
    this.ready = false;
    this.closed = false;
    this.active = false;
    this.stopRequested = false;
    this.status = 'connecting';
    this.balance = null;
    this.currency = 'USD';
    this.pnl = 0;
    this.baseStake = config.baseStake;
    this.stake = config.baseStake;
    this.level = 0;
    this.ticks = [];
    this.lastEpoch = null;
    this.openContractId = null;
    this.closingContractId = null;
    this.pendingBuy = false;
    this.pendingBuyAt = null;
    this.buyReqId = null;
    this.buyStake = null;
    this.requestId = Math.floor(Date.now() % 1000000000);
    this.tickSubscriptionId = null;
    this.lastContractId = null;
    this.buyOpenedAt = null;
    this.openTradeBot = null;
    this.portfolioCheckCompleted = false;
    this.portfolioOpenContractCount = 0;
    this.pingTimer = null;
    this.buyTimer = null;
    this.brokerReconnectTimer = null;
    this.brokerConnecting = false;
    this.brokerReconnectDelay = 3000;
    this.saved = false;
  }

  id() {
    this.requestId = (this.requestId + 1) % 2147483000;
    if (!this.requestId) this.requestId = 1;
    return this.requestId;
  }

  snapshot() {
    return {
      status: this.status,
      active: this.active,
      symbol: this.config.symbol,
      uiSymbol: this.config.uiSymbol,
      bot: this.config.bot,
      pnl: Number(this.pnl.toFixed(2)),
      balance: this.balance,
      currency: this.currency,
      baseStake: this.baseStake,
      stake: this.stake,
      martingaleLevel: this.level,
      openContractId: this.openContractId,
      pendingBuy: this.pendingBuy,
      lastEpoch: this.lastEpoch,
      lastError: null,
    };
  }

  emitStatus(message, ok=false) {
    sendClient(this.client, 'status', { message, ok, state: this.snapshot() });
  }

  async persist() {
    await pool.query(
      `INSERT INTO izitrader_trade_sessions
        (owner_key,account_id,worker_id,account_type,symbol,bot,base_stake,stake,martingale_level,
         session_pnl,profit_target,loss_limit,active,status,open_contract_id,pending_buy,pending_buy_at,
         opened_at,open_trade_bot,open_trade_stake,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW())
       ON CONFLICT (owner_key,account_id,worker_id) DO UPDATE SET
         account_type=EXCLUDED.account_type,symbol=EXCLUDED.symbol,bot=EXCLUDED.bot,
         base_stake=EXCLUDED.base_stake,stake=EXCLUDED.stake,martingale_level=EXCLUDED.martingale_level,
         session_pnl=EXCLUDED.session_pnl,profit_target=EXCLUDED.profit_target,
         loss_limit=EXCLUDED.loss_limit,active=EXCLUDED.active,status=EXCLUDED.status,
         open_contract_id=EXCLUDED.open_contract_id,pending_buy=EXCLUDED.pending_buy,
         pending_buy_at=EXCLUDED.pending_buy_at,opened_at=EXCLUDED.opened_at,
         open_trade_bot=EXCLUDED.open_trade_bot,open_trade_stake=EXCLUDED.open_trade_stake,updated_at=NOW()`,
      [
        this.identity.ownerKey,this.config.accountId,this.config.workerId,this.config.accountType,this.config.symbol,
        this.config.bot,this.baseStake,this.stake,this.level,this.pnl,
        this.config.profitTarget,this.config.lossLimit,this.active,this.status,
        this.openContractId,this.pendingBuy,this.pendingBuyAt,this.buyOpenedAt,this.openTradeBot,this.buyStake,
      ],
    );
    this.saved = true;
  }

  async restore() {
    const claimed = await pool.query(
      `UPDATE izitrader_trade_sessions SET worker_id=$3,updated_at=NOW()
        WHERE owner_key=$1 AND account_id=$2 AND worker_id='legacy'
        RETURNING *`,
      [this.identity.ownerKey,this.config.accountId,this.config.workerId],
    );
    const result = claimed.rowCount ? claimed : await pool.query(
      'SELECT * FROM izitrader_trade_sessions WHERE owner_key=$1 AND account_id=$2 AND worker_id=$3 LIMIT 1',
      [this.identity.ownerKey,this.config.accountId,this.config.workerId],
    );
    const row = result.rows[0];
    if (!row) {
      this.status = 'stopped';
      await this.persist();
      return;
    }
    this.config.bot = BOTS.includes(row.bot) ? row.bot : this.config.bot;

    // Restore the persisted market, not the browser's localStorage selection.
    // This keeps the tick subscription and open-contract recovery aligned after
    // a reconnect or process restart.
    const savedSymbol = String(row.symbol || '');
    const savedUiSymbol = Object.keys(SYMBOLS).find(key => SYMBOLS[key] === savedSymbol);
    if (savedUiSymbol) {
      this.config.symbol = savedSymbol;
      this.config.uiSymbol = savedUiSymbol;
    } else {
      const requestedUiSymbol = Object.keys(SYMBOLS).find(key => SYMBOLS[key] === this.config.symbol);
      if (requestedUiSymbol) this.config.uiSymbol = requestedUiSymbol;
    }

    this.config.profitTarget = Number(row.profit_target || 0);
    this.config.lossLimit = Number(row.loss_limit || 0);
    this.baseStake = Number(row.base_stake || this.config.baseStake);
    this.stake = Number(row.stake || this.baseStake);
    this.level = Number(row.martingale_level || 0);
    this.pnl = Number(row.session_pnl || 0);
    this.openContractId = row.open_contract_id ? Number(row.open_contract_id) : null;
    this.pendingBuy = row.pending_buy === true;
    this.buyOpenedAt = row.opened_at || row.pending_buy_at || null;
    this.openTradeBot = row.open_trade_bot || this.config.bot;
    this.buyStake = row.open_trade_stake ? Number(row.open_trade_stake) : this.stake;
    if(this.openContractId || this.pendingBuy) {
      const savedSymbol=String(row.symbol||'');
      const savedUi=Object.keys(SYMBOLS).find(key=>SYMBOLS[key]===savedSymbol);
      if(savedUi){this.config.symbol=savedSymbol;this.config.uiSymbol=savedUi;}
    }
    this.pendingBuyAt = row.pending_buy_at || null;
    // Never resume new entries after a process restart without an explicit user action.
    this.active = false;
    if (this.pendingBuy) this.status = 'reconcile_required';
    else if (this.openContractId) this.status = 'recovery';
    else this.status = 'stopped';
    await this.persist();
  }

  async connectBroker() {
    if (this.brokerConnecting || this.closed) return;
    this.brokerConnecting = true;
    const brokerStartedAt = Date.now();
    const progress = message => sendClient(this.client, 'status', {
      message, ok:false, state:{ status:'connecting' },
    });
    try {
    progress('A validar a conta na Deriv…');
    console.info('[Izi WS] Deriv account validation started.');
    // OAuth2 Bearer tokens identify the registered app; no PAT app-id header is needed.
    const headers = { Authorization: 'Bearer ' + this.identity.accessToken };
    const accountsPayload = await fetchJson('https://api.derivws.com/trading/v1/options/accounts', { headers });
    const accounts = Array.isArray(accountsPayload.data) ? accountsPayload.data : (accountsPayload.data ? [accountsPayload.data] : []);
    console.info('[Izi WS] Deriv accounts response received:',accounts.length,'account(s).');
    const account = accounts.find(item => String(item.account_id) === this.config.accountId);
    if (!account) throw new Error('A conta seleccionada não pertence à sessão Deriv autenticada.');
    if (this.config.accountType === 'real' && !isReal(account)) throw new Error('A conta escolhida não é uma conta Real.');
    if (this.config.accountType === 'demo' && !isDemo(account)) throw new Error('A conta escolhida não é uma conta Demo.');
    this.currency = String(account.currency || 'USD').toUpperCase();

    progress('Conta validada. A solicitar sessão segura à Deriv…');
    console.info('[Izi WS] Selected Deriv account validated.');
    const otpHeaders = { ...headers, 'Content-Type': 'application/json' };
    const otp = await fetchJson(
      'https://api.derivws.com/trading/v1/options/accounts/' + encodeURIComponent(this.config.accountId) + '/otp',
      { method: 'POST', headers: otpHeaders },
    );
    const socketUrl = otp?.data?.url;
    if (!socketUrl || typeof socketUrl !== 'string' || !socketUrl.startsWith('wss://')) {
      throw new Error('A Deriv não devolveu uma sessão WebSocket autenticada válida.');
    }

    progress('Sessão recebida. A abrir ligação segura à Deriv…');
    console.info('[Izi WS] Deriv secure WebSocket handshake started.');
    await new Promise((resolve,reject) => {
      const socket = new WebSocket(socketUrl, { handshakeTimeout: 12000, maxPayload: 1024 * 1024 });
      this.deriv = socket;
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) { settled=true; try{socket.terminate()}catch{} reject(new Error('Timeout ao ligar à Deriv.')); }
      }, 15000);
      socket.once('open', () => {
        if (settled) return;
        settled=true; clearTimeout(timer);
        console.info('[Izi WS] Deriv secure WebSocket opened in',Date.now()-brokerStartedAt,'ms.');
        resolve();
      });
      socket.once('error', error => {
        if (settled) return;
        settled=true; clearTimeout(timer); reject(error);
      });
      socket.on('message', data => this.onDerivMessage(data.toString()));
      socket.on('close', () => { if (this.deriv === socket) this.onBrokerClose(); });
    });

    this.ready = true;
    console.info('[Izi WS] Deriv broker connection ready in',Date.now()-brokerStartedAt,'ms.');
    sendDeriv(this.deriv, { balance:1, subscribe:1, req_id:this.id() });
    if (this.status === 'recovery' && this.openContractId) {
      sendDeriv(this.deriv, { proposal_open_contract:1, contract_id:this.openContractId, subscribe:1, req_id:this.id() });
      sendClient(this.client, 'state', { state:this.snapshot(), message:'A recuperar a operação aberta. Nenhuma nova entrada será enviada.' });
    } else if (this.status === 'reconcile_required') {
      this.portfolioCheckCompleted = false;
      this.portfolioOpenContractCount = 0;
      sendDeriv(this.deriv, { portfolio:1, req_id:this.id() });
      sendClient(this.client, 'reconciliation_required', {
        state:this.snapshot(),
        message:'Uma compra ficou sem confirmação antes do reinício. Verifique as posições abertas na Deriv antes de autorizar novas entradas.',
      });
    } else {
      sendDeriv(this.deriv, { ticks:this.config.symbol, subscribe:1, req_id:this.id() });
      this.status = 'stopped';
      await this.persist();
      this.emitStatus('Conta Deriv ligada. Robô parado até receber ordem de início.', true);
    }

    this.pingTimer = setInterval(() => sendDeriv(this.deriv, { ping:1, req_id:this.id() }), 30000);
    this.brokerReconnectDelay = 3000;
    } finally {
      this.brokerConnecting = false;
    }
  }

  async start(data={}) {
    if (!this.ready || !this.deriv || this.deriv.readyState !== WebSocket.OPEN) throw new Error('A ligação à Deriv ainda não está pronta.');
    if (this.status === 'reconcile_required' || this.pendingBuy) {
      throw new Error('É necessário resolver a compra sem confirmação antes de iniciar.');
    }
    if (this.openContractId || this.status === 'recovery' || this.status === 'contract_open') {
      throw new Error('Aguarde o contrato aberto terminar antes de iniciar outro ciclo.');
    }
    const targetProfit = Math.max(0,Number(data.profitTarget ?? this.config.profitTarget) || 0);
    const targetLoss = Math.max(0,Number(data.lossLimit ?? this.config.lossLimit) || 0);
    const base = Number(data.baseStake ?? this.baseStake);
    if (!Number.isFinite(base) || base < 0.35 || base > 10000) {
      throw new Error('A aposta base deve estar entre $0.35 e $10,000.');
    }
    this.baseStake = Number(base.toFixed(2));
    this.stake = this.baseStake;
    this.level = 0;
    this.pnl = 0;
    this.config.profitTarget = targetProfit;
    this.config.lossLimit = targetLoss;
    this.active = true;
    this.stopRequested = false;
    this.ticks = [];
    this.lastEpoch = null;
    this.status = 'running';
    await this.persist();
    this.emitStatus('Robô activo — análise no servidor.', true);
    sendClient(this.client,'robot_started',{state:this.snapshot()});
  }

  async pause() {
    this.active = false;
    this.stopRequested = true;
    if (this.pendingBuy) this.status = 'buy_pending';
    else if (this.openContractId) this.status = 'contract_open';
    else this.status = 'stopped';
    await this.persist();
    this.emitStatus(this.openContractId || this.pendingBuy
      ? 'Paragem solicitada. A operação actual será acompanhada até fechar.'
      : 'Robô parado.', true);
  }

  async changeConfig(data) {
    if (data.bot && BOTS.includes(data.bot)) {
      this.config.bot = data.bot;
      await this.persist();
      sendClient(this.client,'state',{state:this.snapshot()});
      return;
    }
    if (this.pendingBuy || this.openContractId) throw new Error('Termine a operação actual antes de alterar a configuração.');
    if (data.uiSymbol && SYMBOLS[data.uiSymbol]) {
      this.config.uiSymbol = data.uiSymbol;
      this.config.symbol = SYMBOLS[data.uiSymbol];
      this.ticks = [];
      this.lastEpoch = null;
      sendDeriv(this.deriv,{ticks:this.config.symbol,subscribe:1,req_id:this.id()});
    }
    if (data.baseStake !== undefined) {
      const value=Number(data.baseStake);
      if(Number.isFinite(value)&&value>=0.35&&value<=10000) {
        this.baseStake=Number(value.toFixed(2));
        if(this.level===0)this.stake=this.baseStake;
      }
    }
    await this.persist();
    sendClient(this.client,'state',{state:this.snapshot()});
  }

  async confirmNoPending() {
    if (!this.pendingBuy || this.openContractId) throw new Error('Não existe uma compra ambígua que possa ser confirmada.');
    if (!this.portfolioCheckCompleted) throw new Error('Aguarde a verificação da carteira Deriv antes de confirmar.');
    if (this.portfolioOpenContractCount > 0) throw new Error('A carteira ainda mostra contratos abertos. Não é seguro retomar o robô.');
    // Require a completed empty Deriv portfolio check before clearing an ambiguous buy.
    this.pendingBuy = false;
    this.pendingBuyAt = null;
    this.buyReqId = null;
    this.buyOpenedAt = null;
    this.openTradeBot = null;
    this.buyStake = null;
    this.active = false;
    this.status = 'stopped';
    if (this.ready) sendDeriv(this.deriv,{ticks:this.config.symbol,subscribe:1,req_id:this.id()});
    await this.persist();
    this.emitStatus('Carteira Deriv verificada sem contratos abertos. Robô parado até nova ordem de início.', true);
    if (!this.client) await this.cleanup();
  }

  async requestBuy(signal) {
    if (!this.active || this.status !== 'running' || this.pendingBuy || this.openContractId) return;
    const contractType = CONTRACTS[signal.type];
    if (!contractType) return;
    this.pendingBuy = true;
    this.pendingBuyAt = new Date();
    this.buyOpenedAt = this.pendingBuyAt;
    this.openTradeBot = this.config.bot;
    this.buyStake = this.stake;
    this.buyReqId = this.id();
    this.status = 'buy_pending';
    await this.persist();

    const parameters = {
      amount:this.buyStake,
      basis:'stake',
      contract_type:contractType,
      currency:this.currency,
      duration:1,
      duration_unit:'t',
      underlying_symbol:this.config.symbol,
    };
    if (signal.barrier !== undefined) parameters.barrier=String(signal.barrier);
    const sent=sendDeriv(this.deriv,{
      buy:1,
      parameters,
      price:this.buyStake,
      passthrough:{source:'izitrader-server',bot:this.config.bot,request_id:this.buyReqId},
      req_id:this.buyReqId,
    });
    if (!sent) {
      this.status='reconcile_required';
      this.active=false;
      await this.persist();
      this.emitStatus('A ligação caiu durante o envio da compra. Verifique a carteira antes de retomar.',false);
      return;
    }
    this.buyTimer=setTimeout(async()=>{
      if(this.pendingBuy && this.buyReqId!==null) {
        this.status='reconcile_required';
        this.active=false;
        this.buyReqId=null;
        await this.persist().catch(()=>{});
        sendDeriv(this.deriv,{portfolio:1,req_id:this.id()});
        sendClient(this.client,'reconciliation_required',{
          state:this.snapshot(),
          message:'A compra não recebeu confirmação. O robô foi bloqueado para evitar uma segunda compra.',
        });
        if (!this.client) await this.cleanup();
      }
    },12000);
    sendClient(this.client,'buy_pending',{stake:this.buyStake,signal});
  }

  async onDerivMessage(raw) {
    let message;
    try { message=JSON.parse(raw); } catch { return; }
    if (message.error) {
      const requestId=Number(message.req_id ?? message.echo_req?.req_id);
      if (this.pendingBuy && this.buyReqId!==null && requestId===this.buyReqId) {
        clearTimeout(this.buyTimer);
        this.buyTimer=null;
        this.pendingBuy=false;
        this.pendingBuyAt=null;
        this.buyReqId=null;
        this.buyOpenedAt=null;
        this.openTradeBot=null;
        this.buyStake=null;
        this.status=this.active?'running':'stopped';
        await this.persist().catch(()=>{});
        this.emitStatus('Deriv recusou a compra: '+String(message.error.message||message.error.code||'erro'),false);
        if (!this.client && !this.openContractId) await this.cleanup();
      } else {
        sendClient(this.client,'deriv_error',{message:String(message.error.message||message.error.code||'Erro Deriv')});
      }
      return;
    }

    if (message.msg_type==='balance' && message.balance) {
      const amount=Number(message.balance.balance);
      if(Number.isFinite(amount)) {
        this.balance=amount;
        this.currency=String(message.balance.currency||this.currency||'USD');
        sendClient(this.client,'balance',{balance:amount,currency:this.currency,loginid:message.balance.loginid});
      }
      return;
    }

    if (message.msg_type==='portfolio' && this.status==='reconcile_required') {
      const rows=Array.isArray(message.portfolio?.contracts)?message.portfolio.contracts:[];
      const activeRows=rows.filter(c=>!['sold','won','lost','expired','closed'].includes(String(c.status||'').toLowerCase()));
      this.portfolioCheckCompleted=true;
      this.portfolioOpenContractCount=activeRows.length;
      sendClient(this.client,'portfolio_check',{
        contracts:activeRows.map(c=>({
          contract_id:c.contract_id,
          symbol:c.underlying,
          contract_type:c.contract_type,
          buy_price:c.buy_price,
          status:c.status,
        })),
      });
      if (!this.client) await this.cleanup();
      return;
    }

    if (message.msg_type==='tick' && message.tick) {
      const tick=message.tick;
      if (tick.symbol && tick.symbol!==this.config.symbol) return;
      const epoch=Number(tick.epoch);
      if(Number.isFinite(epoch) && this.lastEpoch===epoch) return;
      if(Number.isFinite(epoch))this.lastEpoch=epoch;
      this.ticks.push(tick);
      if(this.ticks.length>5)this.ticks.shift();
      const quote=Number(tick.quote);
      const pip=Number(tick.pip_size);
      sendClient(this.client,'tick',{quote:tick.quote,quoteRaw:String(tick.quote),epoch:tick.epoch,symbol:tick.symbol,pip_size:tick.pip_size,
        digit:Number.isFinite(quote)?Number(quote.toFixed(Number.isInteger(pip)?pip:2).slice(-1)):null});
      if(this.active && this.status==='running' && !this.pendingBuy && !this.openContractId) {
        const signal=evaluateSignal(this.config.bot,this.ticks);
        if(signal)await this.requestBuy(signal).catch(error=>{
          this.active=false;this.status='paused';this.persist().catch(()=>{});
          sendClient(this.client,'deriv_error',{message:error instanceof Error?error.message:'Falha ao executar compra.'});
        });
      }
      return;
    }

    if (message.msg_type==='buy' && message.buy) {
      const requestId=Number(message.req_id ?? message.echo_req?.req_id);
      if(!this.pendingBuy || this.buyReqId===null || requestId!==this.buyReqId) return;
      clearTimeout(this.buyTimer);
      this.buyTimer=null;
      const id=Number(message.buy.contract_id);
      if(!Number.isSafeInteger(id)||id<=0) {
        this.status='reconcile_required';
        this.active=false;
        await this.persist();
        sendClient(this.client,'reconciliation_required',{state:this.snapshot(),message:'A Deriv confirmou a compra sem um contract_id válido. Verifique a carteira.'});
        return;
      }
      this.lastContractId=id;
      this.pendingBuy=false;
      this.pendingBuyAt=null;
      this.buyReqId=null;
      this.openContractId=id;
      this.status='contract_open';
      await this.persist();
      sendClient(this.client,'buy',{
        ...message.buy,
        contract_id:id,
        accountType:this.config.accountType,
        stake:this.buyStake,
        martingaleLevel:this.level,
        bot:this.config.bot,
      });
      sendClient(this.client,'contract_state',{closed:false,contract_id:id});
      sendDeriv(this.deriv,{proposal_open_contract:1,contract_id:id,subscribe:1,req_id:this.id()});
      return;
    }

    if(message.msg_type==='proposal_open_contract' && message.proposal_open_contract) {
      const contract=message.proposal_open_contract;
      if(!this.openContractId || Number(contract.contract_id)!==Number(this.openContractId))return;
      const sold=contract.is_sold===true||contract.is_sold===1||String(contract.is_sold)==='1'||String(contract.is_sold).toLowerCase()==='true';
      const status=String(contract.status||'').toLowerCase();
      const closed=sold||['sold','won','lost','expired','closed'].includes(status);
      if(!closed) {
        sendClient(this.client,'contract_state',{closed:false,contract_id:this.openContractId,contract});
        return;
      }
      const profit=Number(contract.profit ?? contract.profit_loss);
      if(!Number.isFinite(profit))return;
      await this.closeContract(contract,profit);
    }
  }

  async closeContract(contract,profit) {
    const contractId=Number(this.openContractId);
    if (!Number.isSafeInteger(contractId) || contractId <= 0) return;
    // Prevent duplicate final updates in this process; the database transaction
    // below is the durable idempotency boundary across retries and restarts.
    if (this.closingContractId === contractId) return;
    this.closingContractId = contractId;

    const stake=Number(this.buyStake ?? this.stake);
    const tradeBot=this.openTradeBot || this.config.bot;
    const digitDisplay=contract.exit_tick_display_value ?? contract.exit_spot_display_value ?? contract.sell_spot_display_value;
    const digitMatch=String(digitDisplay??'').match(/(\\d)\\s*$/);
    const lastDigit=digitMatch?Number(digitMatch[1]):null;
    let client=null;
    let inserted=false;
    let targetProfit=false;
    let targetLoss=false;
    let maxStake=false;
    try {
      client=await pool.connect();
      await client.query('BEGIN');
      const history=await client.query(
        `INSERT INTO izitrader_trade_history
          (owner_key,account_id,contract_id,bot,symbol,stake,profit_loss,result,last_digit,opened_at,closed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
         ON CONFLICT (owner_key,account_id,contract_id) DO NOTHING
         RETURNING contract_id`,
        [this.identity.ownerKey,this.config.accountId,contractId,tradeBot,this.config.symbol,stake,profit,profit>=0?'WON':'LOST',lastDigit,this.buyOpenedAt],
      );
      inserted=history.rowCount===1;

      if (inserted) {
        this.pnl=Number((this.pnl+profit).toFixed(2));
        const next=updateMartingale(this.baseStake,this.level,profit);
        this.level=next.level;
        this.stake=next.stake;
        targetProfit=this.config.profitTarget>0 && this.pnl>=this.config.profitTarget;
        targetLoss=this.config.lossLimit>0 && this.pnl<=-this.config.lossLimit;
        maxStake=this.stake>10000;
        if(this.stopRequested || targetProfit || targetLoss || maxStake) {
          this.active=false;
          this.status='stopped';
          this.stopRequested=false;
        } else {
          this.status=this.active?'running':'stopped';
        }
      } else {
        // A previously committed history row must never change P/L or
        // Martingale again. Re-read the durable session state instead.
        const saved=await client.query(
          `SELECT session_pnl,stake,martingale_level,active,status
             FROM izitrader_trade_sessions
            WHERE owner_key=$1 AND account_id=$2 AND worker_id=$3 FOR UPDATE`,
          [this.identity.ownerKey,this.config.accountId,this.config.workerId],
        );
        if(saved.rows[0]) {
          this.pnl=Number(saved.rows[0].session_pnl||0);
          this.stake=Number(saved.rows[0].stake||this.baseStake);
          this.level=Number(saved.rows[0].martingale_level||0);
        }
        this.active=false;
        this.status='stopped';
        this.stopRequested=false;
      }

      // History insertion and session accounting/state transition commit
      // together. A crash cannot leave one committed without the other.
      const sessionUpdate=await client.query(
        `UPDATE izitrader_trade_sessions
            SET session_pnl=$3,stake=$4,martingale_level=$5,active=$6,status=$7,
                open_contract_id=NULL,pending_buy=FALSE,pending_buy_at=NULL,
                opened_at=NULL,open_trade_bot=NULL,open_trade_stake=NULL,updated_at=NOW()
          WHERE owner_key=$1 AND account_id=$2 AND worker_id=$8`,
        [this.identity.ownerKey,this.config.accountId,this.pnl,this.stake,this.level,this.active,this.status,this.config.workerId],
      );
      if(sessionUpdate.rowCount!==1) throw new Error('TRADING_SESSION_ROW_MISSING');
      await client.query('COMMIT');
    } catch(error) {
      if(client) await client.query('ROLLBACK').catch(()=>{});
      this.closingContractId=null;
      console.error('Izitrader atomic contract-close error:',error.message);
      sendClient(this.client,'deriv_error',{message:'Não foi possível guardar o fecho da operação. O estado foi preservado para nova reconciliação.'});
      return;
    } finally {
      if(client) client.release();
    }

    this.openContractId=null;
    this.closingContractId=null;
    this.pendingBuy=false;
    this.pendingBuyAt=null;
    this.buyStake=null;
    this.buyOpenedAt=null;
    this.openTradeBot=null;
    sendClient(this.client,'contract_closed',{
      contract_id:contractId,
      profit_loss:profit,
      profit,
      result:profit>=0?'WON':'LOST',
      lastDigit,
      exit_tick_display_value:digitDisplay,
      bot_name:tradeBot,
      symbol:this.config.symbol,
      accountType:this.config.accountType,
      duplicate:!inserted,
    });
    sendClient(this.client,'martingale',{level:this.level,stake:this.stake,baseStake:this.baseStake,profit:inserted?profit:0,maxLevel:20});
    sendClient(this.client,'contract_state',{closed:true,contract_id:contractId});
    sendClient(this.client,'pnl',{pnl:this.pnl});
    if(targetProfit) this.emitStatus('Meta de lucro atingida — robô parado.',true);
    else if(targetLoss) this.emitStatus('Meta de perda atingida — robô parado.',false);
    else if(maxStake) this.emitStatus('Limite de segurança da aposta atingido. Robô parado.',false);
    else if(this.active) this.emitStatus('Operação fechada. A analisar novos ticks.',true);
    else this.emitStatus('Operação fechada. Robô parado.',true);
    this.ticks=[];
    if(!this.client) await this.cleanup();
  }

  async onBrokerClose() {
    if(this.closed)return;
    this.ready=false;
    if(this.pingTimer){clearInterval(this.pingTimer);this.pingTimer=null;}
    this.deriv=null;
    if(this.pendingBuy) {
      this.status='reconcile_required';
      this.active=false;
      await this.persist().catch(()=>{});
    } else if(this.openContractId) {
      this.status='recovery';
      this.active=false;
      await this.persist().catch(()=>{});
    } else {
      this.active=false;
      this.status='stopped';
      await this.persist().catch(()=>{});
    }
    sendClient(this.client,'deriv_error',{message:'Ligação à Deriv interrompida. O motor está a tentar recuperar a sessão sem abrir novas operações.'});
    if(!this.closed && (this.client || this.openContractId || this.pendingBuy)) {
      if(this.brokerReconnectTimer)clearTimeout(this.brokerReconnectTimer);
      const delay=this.brokerReconnectDelay;
      this.brokerReconnectDelay=Math.min(this.brokerReconnectDelay*2,30000);
      this.brokerReconnectTimer=setTimeout(async()=>{
        this.brokerReconnectTimer=null;
        if(this.closed)return;
        try { await this.connectBroker(); }
        catch(error) {
          sendClient(this.client,'deriv_error',{message:'Não foi possível recuperar a sessão Deriv: '+String(error?.message||'erro de ligação')});
          this.onBrokerClose().catch(()=>{});
        }
      },delay);
    } else if(!this.client && !this.openContractId && !this.pendingBuy) {
      await this.cleanup();
    }
  }

  async clientGone() {
    this.client=null;
    this.active=false;
    this.stopRequested=true;
    if(this.pendingBuy) this.status='buy_pending';
    else if(this.openContractId) this.status='contract_open';
    else this.status='stopped';
    await this.persist().catch(()=>{});
    if(!this.pendingBuy && !this.openContractId) await this.cleanup();
  }

  async cleanup() {
    if(this.closed)return;
    this.closed=true;
    activeWorkers.delete(this);
    if(this.pingTimer)clearInterval(this.pingTimer);
    if(this.buyTimer)clearTimeout(this.buyTimer);
    if(this.brokerReconnectTimer)clearTimeout(this.brokerReconnectTimer);
    try { if(this.deriv && this.deriv.readyState===WebSocket.OPEN)this.deriv.close(1000,'Izitrader session closed'); } catch {}
    // This worker owns only its browser-tab session; no account-wide lock is held.
  }

  async shutdown() {
    this.active=false;
    if(this.openContractId)this.status='recovery';
    else if(this.pendingBuy)this.status='reconcile_required';
    else this.status='stopped';
    await this.persist().catch(()=>{});
    await this.cleanup();
  }
}

async function configureWorker(client, identity, request) {
  const configStartedAt=Date.now();
  console.info('[Izi WS] Preparing worker: database schema check.');
  const accountId=String(request.accountId||'');
  const accountType=request.accountType==='demo'?'demo':'real';
  const uiSymbol=String(request.uiSymbol||'V100');
  const symbol=SYMBOLS[uiSymbol];
  const bot=BOTS.includes(request.bot)?request.bot:'ProParity';
  const baseStake=Number(request.baseStake);
  const profitTarget=Math.max(0,Number(request.profitTarget)||0);
  const lossLimit=Math.max(0,Number(request.lossLimit)||0);
  if(!/^[A-Za-z0-9_-]{3,40}$/.test(accountId))throw new Error('ID da conta inválido.');
  if(!symbol)throw new Error('Símbolo inválido.');
  if(!Number.isFinite(baseStake)||baseStake<0.35||baseStake>10000)throw new Error('A aposta base deve estar entre $0.35 e $10,000.');

  const workerId=String(request.workerId||randomUUID());
  if(!/^[A-Za-z0-9_-]{8,80}$/.test(workerId))throw new Error('Identificador da sessão inválido.');
  await ensureTradingSchema();
  console.info('[Izi WS] Database schema ready; creating independent worker',workerId);
  const worker=new TradingWorker(client,identity,{
    accountId,accountType,workerId,uiSymbol,symbol,bot,baseStake,
    profitTarget,lossLimit,
  });
  activeWorkers.add(worker);
  try {
    await worker.restore();
    console.info('[Izi WS] Worker state restored in',Date.now()-configStartedAt,'ms; connecting broker.');
    await worker.connectBroker();
    console.info('[Izi WS] Worker fully prepared in',Date.now()-configStartedAt,'ms.');
    return worker;
  } catch(error) {
    activeWorkers.delete(worker);
    worker.closed=true;
    throw error;
  }
}

function originAllowed(req) {
  const origin=req.headers.origin;
  if(!origin)return false;
  try {
    const originHost=new URL(origin).host;
    if(originHost===req.headers.host)return true;
    const configured=(process.env.NEXT_PUBLIC_APP_URL||process.env.APP_URL||'').trim();
    return configured ? originHost===new URL(configured).host : false;
  } catch { return false; }
}

app.prepare().then(() => {
  const server=http.createServer((req,res)=>handle(req,res));
  const wss=new WebSocket.Server({ noServer:true, maxPayload:16*1024, perMessageDeflate:false });
  server.on('upgrade',async(req,socket,head)=>{
    let pathname='/';
    try { pathname=new URL(req.url||'/', 'http://localhost').pathname; } catch {}
    if(pathname!=='/api/trading/ws') { socket.destroy(); return; }
    console.info('[Izi WS] Upgrade request received.');
    if(!originAllowed(req)) {
      console.warn('[Izi WS] Upgrade rejected: invalid origin.'); socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return; }
    let identity;
    try { identity=await resolveSocketIdentity(req); }
    catch(error) {
      console.error('[Izi WS] Could not resolve session identity:',error instanceof Error?error.message:'Unknown error');
      socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');socket.destroy();return; }
    if(!identity) {
      console.warn('[Izi WS] Upgrade rejected: no authenticated Deriv session.');
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');socket.destroy();return; }
    wss.handleUpgrade(req,socket,head,client=>wss.emit('connection',client,req,identity));
  });

  wss.on('connection',(client,req,identity)=>{
    console.info('[Izi WS] Browser connection accepted.');
    let worker=null;
    let configured=false;
    client.on('message',async raw=>{
      let message;
      try { message=JSON.parse(raw.toString()); } catch { sendClient(client,'error',{message:'Pedido inválido.'});return; }
      try {
        if(message.type==='ping') { sendClient(client,'pong',{at:Date.now()});return; }
        if(message.type==='configure') {
          if(configured || worker)throw new Error('Esta ligação já foi configurada.');
          sendClient(client,'status',{message:'A validar a conta Deriv e a preparar a sessão…',ok:false,state:{status:'connecting'}});
          console.info('[Izi WS] Dashboard configuration started.');
          const configuredWorker=await configureWorker(client,identity,message);
          // The browser may time out while the Deriv session is being prepared.
          // Never leave an orphan worker or a held account lock after client disconnect.
          if(client.readyState!==WebSocket.OPEN) {
            await configuredWorker.clientGone().catch(()=>{});
            console.info('[Izi WS] Browser left before configuration completed; worker cleaned up.');
            return;
          }
          worker=configuredWorker;
          configured=true;
          sendClient(client,'configured',{state:worker.snapshot()});
          console.info('[Izi WS] Dashboard configuration completed.');
          return;
        }
        if(!worker)throw new Error('A ligação ainda não foi configurada.');
        if(message.type==='start') { await worker.start(message); return; }
        if(message.type==='pause') { await worker.pause(); return; }
        if(message.type==='bot') { await worker.changeConfig({bot:message.bot});return; }
        if(message.type==='stake') { await worker.changeConfig({baseStake:message.baseStake});return; }
        if(message.type==='symbol') { await worker.changeConfig({uiSymbol:message.uiSymbol,symbol:message.symbol});return; }
        if(message.type==='confirm_no_pending') { await worker.confirmNoPending();return; }
        if(message.type==='close') { await worker.pause();await worker.clientGone();return; }
        sendClient(client,'error',{message:'Comando não reconhecido.'});
      } catch(error) {
        if(message.type==='configure' && !worker) {
          console.error('[Izi WS] Dashboard configuration failed:',error instanceof Error?error.message:'Unknown error');
        }
        sendClient(client,'error',{
          message:error instanceof Error?error.message:'Falha no servidor.',
          code:error?.code || (error?.status === 401 ? 'DERIV_TOKEN_EXPIRED' : 'DERIV_CONNECTION_FAILED'),
          retryAfterMs:Number(error?.retryAfterMs)||0,
        });
        if(message.type==='configure' && !worker) client.close(1008,'Configuration failed');
      }
    });
    client.on('close',()=>{ if(worker)worker.clientGone().catch(()=>{}); });
    client.on('error',()=>{ if(worker)worker.clientGone().catch(()=>{}); });
  });

  server.listen(port,'0.0.0.0',()=>console.log('Izitrader server ready on port '+port));
  const stop=async signal=>{
    console.log('Izitrader received '+signal+'; preserving active contract state.');
    await Promise.allSettled([...activeWorkers].map(worker=>worker.shutdown()));
    server.close(()=>process.exit(0));
    setTimeout(()=>process.exit(0),10000).unref();
  };
  process.once('SIGTERM',()=>stop('SIGTERM'));
  process.once('SIGINT',()=>stop('SIGINT'));
}).catch(error=>{
  console.error('Izitrader server startup failed:',error);
  process.exit(1);
});
