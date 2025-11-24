## HeptaPower MT5 Trade Copier – Architecture and Operations

### 1. High‑Level Overview
This project is a Node.js backend that coordinates trade copying between a Controller MT5 EA and one or more Prop MT5 EAs over a custom TCP protocol. The data flow:

- Controller EA → sends live trades via `trades_live` → Node stores in memory
- Copy Service compares Controller vs Prop → for each uncopied trade → Node sends `trade_request` to Prop EA(s)
- Prop EA executes/simulates → replies `trade_response` → Node updates tracking and marks success/failed

Protocol framing: `[4-byte big-endian length][UTF‑8 JSON payload]`. Both Node and MQL5 use streaming parsers capable of handling multiple frames per TCP chunk and partial frames split across chunks.


### 2. Architecture and Components
- `src/server.js`
  - Starts TCP server (net) and HTTP/Express server for dashboard/APIs.
  - Uses `utils/security.parseFrames` to parse length‑prefixed frames and dispatch messages.
  - Routes messages to `handlers/tcp-message-handler.js`.
  - Broadcasts updates to SSE clients.
- `src/handlers/tcp-message-handler.js`
  - Handles message types: `hello`, `status`, `trades_live`, `trades_history`, `trade_response`, `broker_time`, `error`, `deinit`, etc.
  - Updates EA connection state and settings.
  - For `trade_response`, passes to `managers/trade-request-manager.handleTradeResponse`.
- `src/services/copy-service.js`
  - Periodically iterates memory state and initiates copy for positions/orders via `TradeCopyManager`.
  - Fire‑and‑forget sending (no artificial delay between requests).
- `src/managers/trade-copy-manager.js`
  - In‑memory database for trade copy tracking per user and Controller ticket.
  - `isAlreadyCopied()` guards duplicates (success ⇒ skip; pending with active pendingRequests ⇒ skip).
  - Sends requests via `TradeRequestManager`, marks `pending/success/failed` and records `requestIds`.
- `src/managers/trade-request-manager.js`
  - Builds `trade_request` messages and sends to Prop EA sockets.
  - Maintains `pendingRequests` map keyed by `requestId` with timeout fallback.
  - On `trade_response`, matches by `requestId`, removes from pending, calls callback to update tracking.
- `src/utils/security.js`
  - HMAC verify (`verifyMessage`), rate limiting (`checkRateLimit`/`clearRateLimit`), length‑prefixed TCP parsing (`parseFrames`), and error frame send helper.
- `src/components/user-dashboard.js`
  - Admin dashboard frontend (SSE for live updates), history logs, “Copied” column via `/api/copy-status` and `/api/trade-history`.


### 3. In‑Memory Data Structures
- Connected EAs: managed in `ea-manager` (referenced by handlers). Typically keyed by EA id with userId, role, socket, settings, state flags.
- `tradeCopyTracking` (in `trade-copy-manager.js`): `Map<userId, Map<controllerEAId:controllerTicket, Entry>>`
  - `Entry`:
    - `controllerEAId`, `controllerTicket`, `symbol`, `type`, `volume`
    - `copies`: object keyed by `propEAId` → `{ status, propTicket, error, timestamp, requestIds[] }`
    - counters: `successCount`, `failedCount`, `pendingCount`, `totalPropEAs`
    - `createdAt`, `updatedAt`
- `pendingRequests` (in `trade-request-manager.js`): `Map<requestId, {request, timestamp, callback, propEaId}>`

Key conventions:
- Controller trade key: `${controllerEAId}:${controllerTicket}`

Lifecycle:
- Entry created on first copy attempt; copy status updated on request/response; counters recomputed each update.


### 4. TCP Protocol & Message Types
Framing: `[4 bytes len (BE)][JSON]`

Representative messages:
- `hello` (EA → Node)
```json
{"type":"hello","id":"CTRL-001","userId":"MEP2Q1","role":"controller","accountNumber":"123456","ts":..., "nonce":..., "sig":"..."}
```
- `trades_live` (Controller EA → Node)
```json
{"type":"trades_live","id":"CTRL-001","userId":"MEP2Q1","positions":[...],"orders":[...], "posStats":{...},"ordStats":{...},"posPL":{...},"ordPL":{...},"ts":...,"nonce":...,"sig":"..."}
```
- `trade_request` (Node → Prop EA)
```json
{"type":"trade_request","subtype":"Request_Open.Pos","requestId":"abcd1234...","controllerTicket":"1314785284","data":{"symbol":"EURUSD","cmd":"Buy","volume":0.01,"sl":0,"tp":0,"comment":"Copy:1314785284"}}
```
- `trade_response` (Prop EA → Node)
```json
{"type":"trade_response","id":"PROP-001","userId":"MEP2Q1","requestId":"abcd1234...","success":true,"ticket":10017297,"ts":...,"nonce":...,"sig":"..."}
```
- `error`, `deinit`, `broker_time`, etc.

Processing:
- `server.js` authenticates, rate‑limits, and routes each message to `tcp-message-handler`.
- `trade_response` is matched in `trade-request-manager` to pending by `requestId`.


### 5. Authentication & Rate Limiting
Auth:
- `verifyMessage(id, ts, nonce, sig)` with HMAC‑SHA256 over `${id}|${ts}|${nonce}`.
- Timestamp drift protected by `TIMESTAMP_WINDOW` (ms).
- If auth fails: connection is rejected; the reason is logged with `[AUTH]`.

Rate limiting:
- Configurable via config/env: default `rateLimitMaxHzPerEA=20`, `rateLimitWindowMs=1000`.
- Applied per EA id within the configured window.
- Exempt types: `hello`, `deinit`, `account_info`, `trades_live`, `trades_history`, and `trade_response` (responses are intentionally never rate‑limited to ensure reliability).
- If exceeded (for non‑exempt types): message dropped; `[RATE] ⛔` logged.


### 6. Copy Logic Flow (End‑to‑End)
1) Controller EA updates live trades → Node stores in memory.
2) Copy Service scans Controller’s positions/orders vs Prop EAs.
3) For each Controller ticket and Prop EA:
   - `isAlreadyCopied()`:
     - If `success` → skip permanently.
     - If `pending` and any `requestId` is still in `pendingRequests` → skip.
     - Else send/retry.
4) Node builds `trade_request` with `requestId`, queues it in `pendingRequests`, and writes framed JSON to Prop’s socket.
5) Prop EA processes and replies `trade_response` (authenticated).
6) Node parses the response; `handleTradeResponse` removes from pending immediately, logs latency, and calls tracking update → status becomes `success` (or `failed`).
7) On timeout (no response within `REQUEST_TIMEOUT`), pending is removed and the trade is marked `failed`, allowing a later retry by the Copy Service.


### 7. Config / Environment
- Relevant params (commonly defined in `server.js` or config files):
  - TCP/HTTP ports
  - `SHARED_SECRET`, `TIMESTAMP_WINDOW`
  - Rate limit `MAX_HZ`
  - `REQUEST_TIMEOUT` (in `trade-request-manager.js`)
  - Logs directory (Winston or console; server logs are persisted).

Run:
- Development: `npm install && npm start` in `Server` directory.
- Production: run Node service/PM2; ensure MT5 terminals can reach host:port; configure EA settings accordingly.


### 8. Logging Strategy (Diagnostics)
New structured logs:
- `[TCP]` streaming parser:
  - `+DATA` chunk size, buffer before/after
  - `PARSE` per message in chunk (type, id, requestId, len)
  - final count per chunk
- `[AUTH]`:
  - `✅` success with drift & nonce
  - `❌` failure with reason, id, type, requestId
- `[RATE]`:
  - `✅` allowed count/window
  - `⛔` blocked with counts
- `[TCP-ROUTER]`:
  - routing line for every message (type, id, requestId)
- `[REQUEST]`:
  - `📝 queued` on insert into `pendingRequests` (symbol, vol, openPrice)
  - `⚡` send (pending size)
  - `⏱️ TIMEOUT` (subtype, timeout seconds)
- `[RESPONSE]`:
  - `✅/❌` with requestId short, ticket/error, latency, pending count
  - `⚠️ Unknown requestId` if late/duplicate
- `[COPY-CHECK]`:
  - Detailed decision per (userId, controllerEAId:ticket, propEAId): status, reqCount, decision
- `[TRACK]`:
  - State transition log per update (status, attempts, ticket, counters)

Use these tags to reconstruct any trade’s lifecycle and diagnose where `trade_response` may be rejected, dropped, or mismatched.


### 9. Notable Behaviors and TODOs
- The system prefers speed: fire‑and‑forget sending with immediate `pending` tracking; responses finalize state.
- Duplicate prevention relies on `success` and “active pending” checks; failed/timeouts will allow retry.
- Further enhancements could include persistence for tracking maps, configurable per‑EA settings in a dedicated store, and richer dashboard insights.


