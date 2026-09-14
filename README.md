# Izidro

## Fluxo de autenticação

```text
Criar conta
     ↓
Nome + Email + Password
     ↓
/api/auth/register
     ↓
Conta Izidro
     ↓
Conectar Deriv
     ↓
/api/auth/login
     ↓
Deriv OAuth 2.0
     ↓
/api/auth/callback
     ↓
Dashboard Izitrader
```

## Variáveis de ambiente

Configure no serviço de deploy:

- `DATABASE_URL` — PostgreSQL.
- `APP_URL` — URL pública do Izidro.
- `DERIV_CLIENT_ID` — client ID da aplicação OAuth 2.0 da Deriv.

Não coloque passwords, tokens ou segredos no GitHub.

## Callback da Deriv

Registe exatamente este endereço na aplicação OAuth da Deriv:

`https://SEU-DOMINIO/api/auth/callback`

O fluxo usa OAuth 2.0 Authorization Code + PKCE, valida `state` e faz a troca do código no servidor.
