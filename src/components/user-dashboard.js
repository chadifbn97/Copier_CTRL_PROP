// User Dashboard Component (Live Panel)
module.exports = function (accountData) {
  return `<!doctype html>
<html data-theme="dark"><head><meta charset="utf-8"><title>Live Panel - HeptaPower</title>
<link rel="stylesheet" href="/public/css/admin-dashboard.css">
</head><body>
<div class="navbar">
  <h1>Live Panel</h1>
  <div class="user">
    <button class="theme-toggle" onclick="toggleTheme()" title="Toggle theme"></button>
    <button onclick="logout()">Sign Out</button>
  </div>
</div>
<div class="container">
  <div class="tabs">
    <button class="active" onclick="showTab('overview')">📊 Overview</button>
    <button onclick="showTab('controller')">🎯 Master Controller</button>
    <button onclick="showTab('props')">💼 Master Props</button>
    <button onclick="showTab('history')">📜 History Request</button>
  </div>

  <div class="tab-content active" id="overview">
    <div class="card">
      <h2>Account Overview</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-bottom:24px">
        <div style="padding:20px;background:var(--hover);border-radius:12px;text-align:center">
          <div style="font-size:14px;color:var(--text-muted);margin-bottom:8px">Account ID</div>
          <div style="font-size:24px;font-weight:700;color:var(--primary)" id="userAccountId">${accountData.accountId}</div>
        </div>
        <div style="padding:20px;background:var(--hover);border-radius:12px;text-align:center">
          <div style="font-size:14px;color:var(--text-muted);margin-bottom:8px">Username</div>
          <div style="font-size:24px;font-weight:700;color:var(--text)">${accountData.username}</div>
        </div>
        <div style="padding:20px;background:var(--hover);border-radius:12px;text-align:center">
          <div style="font-size:14px;color:var(--text-muted);margin-bottom:8px">Status</div>
          <div style="font-size:24px;font-weight:700;color:var(--success)">Active</div>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h2>Experts Status</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <!-- Master Controller EAs -->
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 style="font-size:16px;font-weight:700;color:var(--text);padding-bottom:12px;border-bottom:2px solid var(--primary);margin:0">Master Controller EAs</h3>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary" id="settingsControllerBtn" onclick="openSettings('controller')" disabled style="padding:6px 14px;font-size:12px">⚙️ Settings</button>
            <button class="btn btn-danger" id="removeControllerBtn" onclick="removeSelectedEAs('controller')" disabled style="padding:6px 14px;font-size:12px">🗑️ Remove Selected</button>
            </div>
          </div>
          <table style="font-size:12px">
            <thead>
              <tr>
                <th style="width:30px"><input type="checkbox" id="selectAllController" onchange="toggleSelectAll('controller')"></th>
                <th>EA Identifier</th>
                <th>Account</th>
                <th>Balance</th>
                <th>Status</th>
                <th style="text-align:center;width:80px">Enable</th>
                <th style="text-align:center;width:50px">⚠️</th>
              </tr>
            </thead>
            <tbody id="controllerEAs">
              <tr>
                <td colspan="7" style="text-align:center;color:var(--text-muted)">No controllers connected</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Master Prop EAs -->
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 style="font-size:16px;font-weight:700;color:var(--text);padding-bottom:12px;border-bottom:2px solid var(--accent);margin:0">Master Prop EAs</h3>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary" id="settingsPropBtn" onclick="openSettings('prop')" disabled style="padding:6px 14px;font-size:12px">⚙️ Settings</button>
            <button class="btn btn-danger" id="removePropBtn" onclick="removeSelectedEAs('prop')" disabled style="padding:6px 14px;font-size:12px">🗑️ Remove Selected</button>
            </div>
          </div>
          <table style="font-size:12px">
            <thead>
              <tr>
                <th style="width:30px"><input type="checkbox" id="selectAllProp" onchange="toggleSelectAll('prop')"></th>
                <th>EA Identifier</th>
                <th>Account</th>
                <th>Balance</th>
                <th>Status</th>
                <th style="text-align:center;width:80px">Enable</th>
                <th style="text-align:center;width:50px">⚠️</th>
              </tr>
            </thead>
            <tbody id="propEAs">
              <tr>
                <td colspan="7" style="text-align:center;color:var(--text-muted)">No props connected</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div class="tab-content" id="controller">
    <!-- Account Info Panel (Sticky) -->
    <div class="account-info-panel">
      <div class="ea-filter-wrapper">
        <div class="ea-filter-item">
          <span class="ea-filter-label">Select EA Identifier:</span>
          <select id="ctrl-ea-filter" onchange="filterControllerLiveTrades(); filterControllerHistoryTrades();" class="ea-filter-select">
            <option value="all">Choose ...</option>
          </select>
        </div>
        <div class="ea-filter-item">
          <span class="ea-filter-label">Broker Date-Time:</span>
          <span id="ctrl-broker-time" class="ea-filter-value">--/--/---- --:--</span>
        </div>
      </div>
      <div class="account-info-grid">
        <div class="info-item">
          <span class="info-label">Balance</span>
          <span class="info-value" id="ctrl-balance">$0.00</span>
        </div>
        <div class="info-item">
          <span class="info-label">Equity</span>
          <span class="info-value" id="ctrl-equity">$0.00</span>
        </div>
        <div class="info-item">
          <span class="info-label">Free Margin</span>
          <span class="info-value" id="ctrl-free-margin">$0.00</span>
        </div>
        <div class="info-item">
          <span class="info-label">Margin Level</span>
          <span class="info-value" id="ctrl-margin-level">0%</span>
        </div>
      </div>
    </div>
    
    <!-- Live Trades -->
    <div class="card">
      <h2>Live Trades</h2>
      
      <!-- Positions -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin:20px 0 12px">
        <h3 style="font-size:16px;font-weight:600;color:var(--text);padding-bottom:8px;border-bottom:2px solid var(--primary);margin:0">📈 Positions</h3>
        <span id="ctrl-pos-stats" style="color:var(--text-muted);font-size:13px">Total: 0 | Buy: 0 | Sell: 0</span>
      </div>
      <table style="font-size:13px">
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Symbol</th>
            <th>Type</th>
            <th>Volume</th>
            <th>Price Open</th>
            <th>Time Open</th>
            <th>Stop Loss</th>
            <th>Take Profit</th>
            <th>P&L Brut</th>
            <th>P&L Net</th>
            <th>Reason</th>
            <th>Copied</th>
          </tr>
        </thead>
        <tbody id="controllerPositions">
          <tr><td colspan="12" style="text-align:center;color:var(--text-muted)">No positions</td></tr>
        </tbody>
      </table>
      <div class="pl-summary">
        <div class="pl-summary-item">
          <span class="pl-summary-label">P&L Brut:</span>
          <span class="pl-summary-value neutral" id="ctrl-pos-pl-brut">$0.00</span>
        </div>
        <div class="pl-summary-item">
          <span class="pl-summary-label">P&L Net:</span>
          <span class="pl-summary-value neutral" id="ctrl-pos-pl-net">$0.00</span>
        </div>
      </div>
      
      <!-- Pending Orders -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin:20px 0 12px">
        <h3 style="font-size:16px;font-weight:600;color:var(--text);padding-bottom:8px;border-bottom:2px solid var(--accent);margin:0">📋 Pending Orders</h3>
        <span id="ctrl-orders-stats" style="color:var(--text-muted);font-size:13px">Total: 0 | Buy Limit: 0 | Sell Limit: 0 | Buy Stop: 0 | Sell Stop: 0</span>
      </div>
      <table style="font-size:13px">
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Symbol</th>
            <th>Type</th>
            <th>Volume</th>
            <th>Order Price</th>
            <th>Order Time</th>
            <th>Stop Loss</th>
            <th>Take Profit</th>
            <th>Reason</th>
            <th>Copied</th>
          </tr>
        </thead>
        <tbody id="controllerOrders">
          <tr><td colspan="10" style="text-align:center;color:var(--text-muted)">No pending orders</td></tr>
        </tbody>
      </table>
    </div>
    
    <!-- History Trades -->
    <div class="card">
      <h2>History Trades</h2>
      
      <!-- Deals -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin:20px 0 12px">
        <h3 style="font-size:16px;font-weight:600;color:var(--text);padding-bottom:8px;border-bottom:2px solid var(--success);margin:0">✅ Deals</h3>
        <span id="ctrl-deals-stats" style="color:var(--text-muted);font-size:13px">Total: 0 | Buy: 0 | Sell: 0</span>
      </div>
      <table style="font-size:13px">
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Symbol</th>
            <th>Type</th>
            <th>Volume</th>
            <th>Price Open</th>
            <th>Time Open</th>
            <th>Stop Loss</th>
            <th>Take Profit</th>
            <th>Price Close</th>
            <th>Time Close</th>
            <th>P&L Brut</th>
            <th>P&L Net</th>
            <th>Reason</th>
            <th>Copied</th>
          </tr>
        </thead>
        <tbody id="controllerDeals">
          <tr><td colspan="14" style="text-align:center;color:var(--text-muted)">No deals</td></tr>
        </tbody>
      </table>
      <div class="pl-summary">
        <div class="pl-summary-item">
          <span class="pl-summary-label">P&L Brut:</span>
          <span class="pl-summary-value neutral" id="ctrl-deals-pl-brut">$0.00</span>
        </div>
        <div class="pl-summary-item">
          <span class="pl-summary-label">P&L Net:</span>
          <span class="pl-summary-value neutral" id="ctrl-deals-pl-net">$0.00</span>
        </div>
      </div>
      
      <!-- Deleted Orders -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin:20px 0 12px">
        <h3 style="font-size:16px;font-weight:600;color:var(--text);padding-bottom:8px;border-bottom:2px solid var(--danger);margin:0">❌ Deleted Orders</h3>
        <span id="ctrl-deleted-stats" style="color:var(--text-muted);font-size:13px">Total: 0 | Buy Limit: 0 | Sell Limit: 0 | Buy Stop: 0 | Sell Stop: 0</span>
      </div>
      <table style="font-size:13px">
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Symbol</th>
            <th>Type</th>
            <th>Volume</th>
            <th>Order Price</th>
            <th>Order Time</th>
            <th>Stop Loss</th>
            <th>Take Profit</th>
            <th>Delete Price</th>
            <th>Delete Time</th>
            <th>Reason</th>
            <th>Copied</th>
          </tr>
        </thead>
        <tbody id="controllerDeletedOrders">
          <tr><td colspan="12" style="text-align:center;color:var(--text-muted)">No deleted orders</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="tab-content" id="props">
    <!-- Account Info Panel (Sticky) -->
    <div class="account-info-panel">
      <div class="ea-filter-wrapper">
        <div class="ea-filter-item">
          <span class="ea-filter-label">Select EA Identifier:</span>
          <select id="prop-ea-filter" onchange="filterPropLiveTrades(); filterPropHistoryTrades();" class="ea-filter-select">
            <option value="all">Choose ...</option>
          </select>
        </div>
        <div class="ea-filter-item">
          <span class="ea-filter-label">Broker Date-Time:</span>
          <span id="prop-broker-time" class="ea-filter-value">--/--/---- --:--</span>
        </div>
      </div>
      <div class="account-info-grid">
        <div class="info-item">
          <span class="info-label">Balance</span>
          <span class="info-value" id="prop-balance">$0.00</span>
        </div>
        <div class="info-item">
          <span class="info-label">Equity</span>
          <span class="info-value" id="prop-equity">$0.00</span>
        </div>
        <div class="info-item">
          <span class="info-label">Free Margin</span>
          <span class="info-value" id="prop-free-margin">$0.00</span>
        </div>
        <div class="info-item">
          <span class="info-label">Margin Level</span>
          <span class="info-value" id="prop-margin-level">0%</span>
        </div>
      </div>
    </div>
    
    <!-- Live Trades -->
    <div class="card">
      <h2>Live Trades</h2>
      
      <!-- Positions -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin:20px 0 12px">
        <h3 style="font-size:16px;font-weight:600;color:var(--text);padding-bottom:8px;border-bottom:2px solid var(--primary);margin:0">📈 Positions</h3>
        <span id="prop-pos-stats" style="color:var(--text-muted);font-size:13px">Total: 0 | Buy: 0 | Sell: 0</span>
      </div>
      <table style="font-size:13px">
        <thead>
          <tr>
            <th>Received from</th>
            <th>Ticket</th>
            <th>Symbol</th>
            <th>Type</th>
            <th>Volume</th>
            <th>Price Open</th>
            <th>Time Open</th>
            <th>Stop Loss</th>
            <th>Take Profit</th>
            <th>P&L Brut</th>
            <th>P&L Net</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody id="propsPositions">
          <tr><td colspan="12" style="text-align:center;color:var(--text-muted)">No positions</td></tr>
        </tbody>
      </table>
      <div class="pl-summary">
        <div class="pl-summary-item">
          <span class="pl-summary-label">P&L Brut:</span>
          <span class="pl-summary-value neutral" id="prop-pos-pl-brut">$0.00</span>
        </div>
        <div class="pl-summary-item">
          <span class="pl-summary-label">P&L Net:</span>
          <span class="pl-summary-value neutral" id="prop-pos-pl-net">$0.00</span>
        </div>
      </div>
      
      <!-- Pending Orders -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin:20px 0 12px">
        <h3 style="font-size:16px;font-weight:600;color:var(--text);padding-bottom:8px;border-bottom:2px solid var(--accent);margin:0">📋 Pending Orders</h3>
        <span id="prop-orders-stats" style="color:var(--text-muted);font-size:13px">Total: 0 | Buy Limit: 0 | Sell Limit: 0 | Buy Stop: 0 | Sell Stop: 0</span>
      </div>
      <table style="font-size:13px">
        <thead>
          <tr>
            <th>Received from</th>
            <th>Ticket</th>
            <th>Symbol</th>
            <th>Type</th>
            <th>Volume</th>
            <th>Order Price</th>
            <th>Order Time</th>
            <th>Stop Loss</th>
            <th>Take Profit</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody id="propsOrders">
          <tr><td colspan="10" style="text-align:center;color:var(--text-muted)">No pending orders</td></tr>
        </tbody>
      </table>
    </div>
    
    <!-- History Trades -->
    <div class="card">
      <h2>History Trades</h2>
      
      <!-- Deals -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin:20px 0 12px">
        <h3 style="font-size:16px;font-weight:600;color:var(--text);padding-bottom:8px;border-bottom:2px solid var(--success);margin:0">✅ Deals</h3>
        <span id="prop-deals-stats" style="color:var(--text-muted);font-size:13px">Total: 0 | Buy: 0 | Sell: 0</span>
      </div>
      <table style="font-size:13px">
        <thead>
          <tr>
            <th>Received from</th>
            <th>Ticket</th>
            <th>Symbol</th>
            <th>Type</th>
            <th>Volume</th>
            <th>Price Open</th>
            <th>Time Open</th>
            <th>Stop Loss</th>
            <th>Take Profit</th>
            <th>Price Close</th>
            <th>Time Close</th>
            <th>P&L Brut</th>
            <th>P&L Net</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody id="propsDeals">
          <tr><td colspan="14" style="text-align:center;color:var(--text-muted)">No deals</td></tr>
        </tbody>
      </table>
      <div class="pl-summary">
        <div class="pl-summary-item">
          <span class="pl-summary-label">P&L Brut:</span>
          <span class="pl-summary-value neutral" id="prop-deals-pl-brut">$0.00</span>
        </div>
        <div class="pl-summary-item">
          <span class="pl-summary-label">P&L Net:</span>
          <span class="pl-summary-value neutral" id="prop-deals-pl-net">$0.00</span>
        </div>
      </div>
      
      <!-- Deleted Orders -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin:20px 0 12px">
        <h3 style="font-size:16px;font-weight:600;color:var(--text);padding-bottom:8px;border-bottom:2px solid var(--danger);margin:0">❌ Deleted Orders</h3>
        <span id="prop-deleted-stats" style="color:var(--text-muted);font-size:13px">Total: 0 | Buy Limit: 0 | Sell Limit: 0 | Buy Stop: 0 | Sell Stop: 0</span>
      </div>
      <table style="font-size:13px">
        <thead>
          <tr>
            <th>Received from</th>
            <th>Ticket</th>
            <th>Symbol</th>
            <th>Type</th>
            <th>Volume</th>
            <th>Order Price</th>
            <th>Order Time</th>
            <th>Stop Loss</th>
            <th>Take Profit</th>
            <th>Delete Price</th>
            <th>Delete Time</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody id="propsDeletedOrders">
          <tr><td colspan="12" style="text-align:center;color:var(--text-muted)">No deleted orders</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="tab-content" id="history">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2>📜 History Request Logs</h2>
        <button onclick="clearHistoryLogs()" class="btn btn-danger">🗑️ Clear Logs</button>
      </div>
      
      <!-- Search Box -->
      <div style="margin-bottom:20px">
        <input 
          type="text" 
          id="historySearchBox" 
          placeholder="🔍 Search logs (CTRL+F style)..." 
          oninput="filterHistoryLogs()"
          style="width:100%;padding:12px 16px;border:2px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:14px"
        />
      </div>
      
      <!-- Logs Container -->
      <div 
        id="historyLogsContainer" 
        style="background:var(--hover);border:2px solid var(--border);border-radius:8px;padding:16px;max-height:600px;overflow-y:auto;font-family:monospace;font-size:13px;line-height:1.8"
      >
        <div style="color:var(--text-muted);text-align:center;padding:40px">
          No logs available. Logs will appear here once EA activities are recorded.
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Error Modal -->
<div class="modal confirm-modal" id="errorModal">
  <div class="modal-content" style="max-width:700px">
    <div class="confirm-icon" style="background:linear-gradient(135deg,var(--danger),#dc2626)">⚠️</div>
    <h3 id="errorEAName">EA Errors</h3>
    <div style="max-height:400px;overflow-y:auto;margin-bottom:20px">
      <table style="width:100%;font-size:13px">
        <thead>
          <tr>
            <th>Time</th>
            <th>Symbol</th>
            <th>Error Description</th>
          </tr>
        </thead>
        <tbody id="errorsList">
          <tr>
            <td colspan="3" style="text-align:center;color:var(--text-muted)">No errors</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="btn-group" style="justify-content:center">
      <button class="btn btn-warning" onclick="clearErrors()">🗑️ Clear All Errors</button>
      <button class="btn btn-secondary" onclick="hideErrors()">Close</button>
    </div>
  </div>
</div>

<!-- Settings Modal -->
<div class="modal" id="settingsModal" style="display:none">
  <div class="modal-content" style="max-width:500px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <h2 id="settingsModalTitle" style="margin:0;font-size:20px;font-weight:700">⚙️ EA Settings</h2>
      <button onclick="closeSettings()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text);padding:0;line-height:1">×</button>
    </div>
    
    <!-- Controller Settings -->
    <div id="controllerSettings" style="display:none">
      <div style="margin-bottom:24px;padding:16px;background:var(--hover);border-radius:8px">
        <h3 style="margin:0 0 16px 0;font-size:14px;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid var(--accent);padding-bottom:8px">═════ Jitter & Offset Management ═════</h3>
        <div class="form-group">
          <label>Jitter in Seconds</label>
          <div style="position:relative">
            <input type="number" id="settingsJitter" step="0.5" min="0" max="60" placeholder="0.0" style="padding-right:40px" oninput="validateJitter()" onblur="correctJitter()" />
            <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-weight:700">sec</span>
          </div>
          <div id="jitterError" class="input-error-tooltip" style="display:none;margin-top:6px;padding:8px 12px;background:rgba(239,68,68,0.1);border:1px solid var(--danger);border-radius:6px;color:var(--danger);font-size:12px;font-weight:600;animation:slideDown 0.2s ease">
            ⚠️ Value must be between 0 and 60 seconds
          </div>
          <small style="display:block;margin-top:8px;color:var(--text-muted);font-size:12px">
            Random delay (0.01 to specified value) applied before copying orders. Helps avoid simultaneous order execution across accounts.
          </small>
        </div>
        <div class="form-group">
          <label>Offset in Point <span style="font-size:11px;color:var(--text-muted)">(1 Point = 0.1 Pips)</span></label>
          <div style="position:relative">
            <input type="number" id="settingsOffset" step="1" min="0" placeholder="0" style="padding-right:55px" oninput="updateOffsetDirectionFields()" />
            <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-weight:700">point</span>
          </div>
        </div>
        
        <!-- Offset Direction Settings (shown only when Offset > 0) -->
        <div id="offsetDirectionsContainer" style="display:none;margin-top:16px;padding-top:16px;border-top:2px solid var(--border)">
          <h4 style="margin:0 0 12px 0;font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Order Offset Directions</h4>
          
          <div class="form-group">
            <label style="font-size:13px">Buy Stop Order Offset Direction</label>
            <select id="settingsBuyStopDir" class="offset-direction-select">
              <option value="above">Above Open Price</option>
              <option value="below">Below Open Price</option>
            </select>
          </div>
          
          <div class="form-group">
            <label style="font-size:13px">Sell Stop Order Offset Direction</label>
            <select id="settingsSellStopDir" class="offset-direction-select">
              <option value="above">Above Open Price</option>
              <option value="below">Below Open Price</option>
            </select>
          </div>
          
          <div class="form-group">
            <label style="font-size:13px">Buy Limit Order Offset Direction</label>
            <select id="settingsBuyLimitDir" class="offset-direction-select">
              <option value="above">Above Open Price</option>
              <option value="below">Below Open Price</option>
            </select>
          </div>
          
          <div class="form-group" style="margin-bottom:0">
            <label style="font-size:13px">Sell Limit Order Offset Direction</label>
            <select id="settingsSellLimitDir" class="offset-direction-select">
              <option value="above">Above Open Price</option>
              <option value="below">Below Open Price</option>
            </select>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Prop Settings -->
    <div id="propSettings" style="display:none">
      <!-- Risk Management Section (always visible) -->
      <div style="margin-bottom:24px;padding:16px;background:var(--hover);border-radius:8px">
        <h3 style="margin:0 0 16px 0;font-size:14px;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid var(--accent);padding-bottom:8px">═════ Risk Management ═════</h3>
        
        <!-- Calculation Method Dropdown (always visible) -->
        <div class="form-group">
          <label>Calculation Method</label>
          <select id="settingsPropCalcMethod" style="width:100%;padding:12px 16px;border:2px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:16px;font-weight:600" onchange="onPropCalcMethodChange()">
            <option value="none">No Calculation</option>
            <option value="simple">Simple Risk</option>
            <option value="rr">Risk/Reward Ratio</option>
          </select>
        </div>
        
        <!-- Risk Fields Container (shown/hidden based on Calculation Method) -->
        <div id="propRiskFieldsContainer">
          <div class="form-group" id="propRRMethodGroup">
            <label id="propMethodLabel">RR Method</label>
          <select id="settingsPropMethod" style="width:100%;padding:12px 16px;border:2px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:16px;font-weight:600" onchange="updatePropValueIcon()">
            <option value="amount">Amount $</option>
            <option value="percentage">Percentage %</option>
          </select>
        </div>
          
          <div class="form-group" id="propValueGroup">
          <label>Value</label>
          <div style="position:relative">
            <input type="number" id="settingsPropValue" step="0.01" min="0.01" placeholder="0.00" style="padding-right:40px" />
            <span id="propValueIcon" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-weight:700">$</span>
          </div>
        </div>
          
        <!-- Warning about Risk/Reward -->
        <div id="riskWarningProp" style="margin-top:12px;padding:12px;background:#fff3cd;border:1px solid #ffc107;border-radius:6px;color:#856404;font-size:13px">
            ⚠️ <strong>Important:</strong> If you set Risk/Reward settings here, TakeProfit is required for calculation to work properly.
          </div>
        </div>
      </div>
      
      <div style="margin-bottom:24px;padding:16px;background:var(--hover);border-radius:8px">
        <h3 style="margin:0 0 16px 0;font-size:14px;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #f59e0b;padding-bottom:8px">═════ Order Delay Management ═════</h3>
        <div class="form-group" style="margin-bottom:0">
          <label>Maximum Order Delay (seconds)</label>
          <div style="position:relative">
            <input type="number" id="settingsPropMaxTime" step="0.5" min="15" placeholder="15.00" style="padding-right:40px" oninput="validatePropMaxTime()" onblur="correctPropMaxTime()" />
            <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-weight:700">sec</span>
          </div>
          <div id="propMaxTimeError" class="input-error-tooltip" style="display:none;margin-top:6px;padding:8px 12px;background:rgba(239,68,68,0.1);border:1px solid var(--danger);border-radius:6px;color:var(--danger);font-size:12px;font-weight:600;animation:slideDown 0.2s ease">
            ⚠️ Minimum value is 15 seconds
          </div>
          <small style="display:block;margin-top:8px;color:var(--text-muted);font-size:12px">
            Maximum time difference between order open time and when web app processes it. Orders exceeding this delay won't be copied.
          </small>
        </div>
      </div>
    </div>
    
    <div style="display:flex;gap:12px;justify-content:flex-end">
      <button class="btn btn-secondary" onclick="closeSettings()">Cancel</button>
      <button class="btn btn-success" onclick="saveSettings()">💾 Save Settings</button>
    </div>
  </div>
</div>

<div class="footer">
  <div class="footer-text">
    Created by <span class="footer-brand">HeptaPower</span> © <span id="currentYear"></span> - All Rights Reserved
  </div>
</div>

<style>
/* Input error state */
input.input-error {
  border-color: var(--danger) !important;
  color: var(--danger) !important;
}

/* Slide down animation for error tooltip */
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

<script>
document.getElementById('currentYear').textContent = new Date().getFullYear();

// Theme management
function initTheme() {
  const saved = localStorage.getItem('theme');
  if(saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

function showTab(tab) {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById(tab).classList.add('active');
  
  // Reset scroll position to top when switching tabs
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // Show tabs when switching
  const tabs = document.querySelector('.tabs');
  if(tabs) tabs.classList.remove('tabs-hidden');
  
  // Load activity logs when History tab is shown
  if(tab === 'history') {
    loadHistoryLogs();
  }
  
  // Show account info panel for controller/props tabs (not overview)
  const activeTabElement = document.getElementById(tab);
  const accountInfoPanel = activeTabElement ? activeTabElement.querySelector('.account-info-panel') : null;
  
  // Hide all panels first
  document.querySelectorAll('.account-info-panel').forEach(panel => {
    panel.classList.add('panel-hidden');
  });
  
  // Show panel for current tab if it's not overview
  if(tab !== 'overview' && accountInfoPanel) {
    accountInfoPanel.classList.remove('panel-hidden');
  }
}

function logout() {
  localStorage.removeItem('userToken');
  localStorage.removeItem('accountId');
  localStorage.removeItem('username');
  window.location.href = '/logout';  // Server-side logout to destroy session
}

// Prevent cached page after logout
window.addEventListener('pageshow', function(event) {
  if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
    // Page was loaded from cache (back button)
    // Verify session is still valid
    fetch('/api/session/check')
      .then(res => res.json())
      .then(data => {
        if(!data.ok) {
          window.location.replace('/');
        }
      })
      .catch(() => {
        window.location.replace('/');
      });
  }
});

// Smart scroll behavior for tabs and account info panel
let lastScrollTop = 0;
let scrollTimeout = null;
let isScrollingDown = false;

window.addEventListener('scroll', function() {
  clearTimeout(scrollTimeout);
  
  scrollTimeout = setTimeout(() => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const tabs = document.querySelector('.tabs');
    
    // Check active tab
    const activeTab = document.querySelector('.tab-content.active');
    const isOverviewTab = activeTab && activeTab.id === 'overview';
    
    // Get account info panel in active tab only
    let accountInfoPanel = null;
    if(activeTab) {
      accountInfoPanel = activeTab.querySelector('.account-info-panel');
    }
    
    // Determine scroll direction
    isScrollingDown = scrollTop > lastScrollTop && scrollTop > 100;
    
    // Hide tabs and panel when scrolling DOWN
    if (isScrollingDown) {
      if(tabs) tabs.classList.add('tabs-hidden');
      if(!isOverviewTab && accountInfoPanel) accountInfoPanel.classList.add('panel-hidden');
    } 
    // Show tabs and panel when scrolling UP
    else if (scrollTop > 100 && scrollTop < lastScrollTop) {
      if(tabs) tabs.classList.remove('tabs-hidden');
      if(!isOverviewTab && accountInfoPanel) accountInfoPanel.classList.remove('panel-hidden');
    }
    
    // If at very top (scrollTop < 100), show both tabs and panel
    if(scrollTop < 100) {
      if(tabs) tabs.classList.remove('tabs-hidden');
      if(!isOverviewTab && accountInfoPanel) accountInfoPanel.classList.remove('panel-hidden');
    }
    
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
  }, 50);
}, false);

// SSE Connection for live data
const sse = new EventSource('/panel/stream');
const controllerEAs = new Map();
const propEAs = new Map();

// Throttle updateExpertsStatus to prevent checkbox reset on every update
let updateThrottleTimer = null;
const checkedControllers = new Set(); // Track checked controller EAs
const checkedProps = new Set();       // Track checked prop EAs

// Store last Orders data to prevent unnecessary re-renders
let lastControllerOrders = [];
let lastPropOrders = [];

// Store last Experts Status data to prevent unnecessary re-renders
let lastControllerEAsData = new Map();
let lastPropEAsData = new Map();

sse.onmessage = (e) => {
  try {
  const msg = JSON.parse(e.data);
  
  if(msg.type === 'status') {
    const ea = msg.data;
    
    // Ensure enabled field exists (default true)
    if(ea.enabled === undefined) ea.enabled = true;
    if(!ea.errors) ea.errors = [];
    
    // Get user account ID from page
    const pageAccountId = document.getElementById('userAccountId')?.textContent?.trim() || '';
    
    // Filter EAs by userId - only show EAs that belong to this user
    if(ea.userId && pageAccountId && ea.userId !== pageAccountId) {
      return; // Skip this EA, doesn't belong to current user
    }
    
    // FIX: MERGE status data into existing EA (don't replace!)
    // This preserves accountInfo.balance from account_info messages
    const map = ea.role === 'prop' ? propEAs : controllerEAs;
    const existing = map.get(ea.id);
    
    if(existing) {
      // Merge new status data into existing EA (preserves accountInfo)
      Object.assign(existing, ea);
    } else {
      // New EA, add it
      map.set(ea.id, ea);
    }
    
    updateExpertsStatusThrottled(); // Use throttled version
  }
  
  if(msg.type === 'tick') {
    // Update tick data for EA
    const ea = controllerEAs.get(msg.data.id) || propEAs.get(msg.data.id);
    if(ea) {
      ea.lastTick = msg.data;
    }
  }
  
  // REMOVED: equity message handler - now using account_info for all account data
  // This reduces message processing and improves UI performance
  
  if(msg.type === 'error') {
    // Update error count for EA
    const ea = controllerEAs.get(msg.data.id) || propEAs.get(msg.data.id);
    if(ea) {
      updateExpertsStatusThrottled(); // Use throttled version
    }
  }
  
  if(msg.type === 'account_info') {
    const { id, balance, equity, freeMargin, marginLevel } = msg.data;
    const ea = controllerEAs.get(id) || propEAs.get(id);
    if(ea) {
      // Store full account info for Account Info Panel (Master Controller/Props tabs)
      ea.accountInfo = { balance, equity, freeMargin, marginLevel };
      
      // OPTIMIZATION: Reuse balance for Experts Status table (Overview tab)
      ea.balance = balance;
      ea.equity = equity;
      
      updateAccountInfoDisplay();
      updateExpertsStatusThrottled(); // Update Overview table with new balance
    }
  }
  
  if(msg.type === 'broker_time') {
    const { id, brokerTime } = msg.data;
    const ea = controllerEAs.get(id) || propEAs.get(id);
    if(ea) {
      ea.brokerTime = brokerTime;
      updateBrokerTimeDisplay();
    }
  }
  
  if(msg.type === 'trades_live') {
    const { id, positions, orders, posStats, ordStats, posPL, ordPL } = msg.data;
    const ea = controllerEAs.get(id) || propEAs.get(id);
    if(ea) {
      ea.tradesLive = { positions, orders, posStats, ordStats, posPL, ordPL };
      
      // Store full data for filtering
      if(ea.role === 'controller') {
        if(!controllerTradesData) {
          controllerTradesData = { positions: [], orders: [], deals: [], deletedOrders: [] };
        }
        // Merge positions from this EA
        controllerTradesData.positions = controllerTradesData.positions.filter(p => p.eaId !== id);
        controllerTradesData.positions.push(...positions);
        // Merge orders
        controllerTradesData.orders = controllerTradesData.orders.filter(o => o.eaId !== id);
        controllerTradesData.orders.push(...orders);
      } else if(ea.role === 'prop') {
        if(!propTradesData) {
          propTradesData = { positions: [], orders: [], deals: [], deletedOrders: [] };
        }
        propTradesData.positions = propTradesData.positions.filter(p => p.eaId !== id);
        propTradesData.positions.push(...positions);
        propTradesData.orders = propTradesData.orders.filter(o => o.eaId !== id);
        propTradesData.orders.push(...orders);
      }
      
      // Only update live tables (Positions & Orders)
      filterAndDisplayLiveTrades();
    }
  }
  
  if(msg.type === 'trades_history') {
    const { id, deals, deletedOrders, dealStats, ordStats, dealPL, ordPL } = msg.data;
    const ea = controllerEAs.get(id) || propEAs.get(id);
    if(ea) {
      ea.tradesHistory = { deals, deletedOrders, dealStats, ordStats, dealPL, ordPL };
      
      // Store full data for filtering
      if(ea.role === 'controller') {
        if(!controllerTradesData) {
          controllerTradesData = { positions: [], orders: [], deals: [], deletedOrders: [] };
        }
        // Merge deals from this EA
        controllerTradesData.deals = controllerTradesData.deals.filter(d => d.eaId !== id);
        controllerTradesData.deals.push(...deals);
        // Merge deleted orders
        controllerTradesData.deletedOrders = controllerTradesData.deletedOrders.filter(o => o.eaId !== id);
        controllerTradesData.deletedOrders.push(...deletedOrders);
      } else if(ea.role === 'prop') {
        if(!propTradesData) {
          propTradesData = { positions: [], orders: [], deals: [], deletedOrders: [] };
        }
        propTradesData.deals = propTradesData.deals.filter(d => d.eaId !== id);
        propTradesData.deals.push(...deals);
        propTradesData.deletedOrders = propTradesData.deletedOrders.filter(o => o.eaId !== id);
        propTradesData.deletedOrders.push(...deletedOrders);
      }
      
      // Only update history tables (Deals & Deleted Orders)
      filterAndDisplayHistoryTrades();
    }
  }
  
  if(msg.type === 'activity_log') {
    // New activity log received via SSE
    const log = msg.data;
    
    // Add to beginning of all logs
    allHistoryLogs.unshift(log);
    
    // Check if it should be visible (after clear timestamp and matches filter)
    const logTime = new Date(log.timestamp).getTime();
    
    if(logTime > userClearTimestamp) {
      const searchBox = document.getElementById('historySearchBox');
      const query = searchBox ? searchBox.value.trim().toLowerCase() : '';
      
      if(query === '' || matchesSearchQuery(log, query)) {
        filteredHistoryLogs.unshift(log);
        renderHistoryLogs();
      }
    }
  }
  
  if(msg.type === 'deinit_confirmed') {
    const { id, reason, reasonText, wasRemoveCommand } = msg.data;
    const pending = pendingRemovals.get(id);
    
    // Manual removal from chart
    if(reason === 1) {
      if(pending) {
        clearTimeout(pending.timeout);
        pendingRemovals.delete(id);
      }
      
      controllerEAs.delete(id);
      propEAs.delete(id);
      updateExpertsStatus();
      showNotification('ℹ️ EA manually removed from chart', 'info');
      return;
    }
    
    // Dashboard remove command
    if(reason === 0 && wasRemoveCommand) {
      if(pending) {
        clearTimeout(pending.timeout);
        pendingRemovals.delete(id);
        
        if(pending.type === 'controller') {
          controllerEAs.delete(id);
        } else {
          propEAs.delete(id);
        }
        
        updateExpertsStatus();
        showNotification('✅ EA removed from chart successfully', 'success');
      }
      return;
    }
    
    // Settings changed
    if(reason === 5) {
      if(pending) {
        clearTimeout(pending.timeout);
        pendingRemovals.delete(id);
      }
      
      controllerEAs.delete(id);
      propEAs.delete(id);
      updateExpertsStatus();
      showNotification('⚙️ EA settings updated - reconnecting...', 'info');
      return;
    }
    
    // Other reasons
    if(pending) {
      clearTimeout(pending.timeout);
      pendingRemovals.delete(id);
      
      if(pending.type === 'controller') {
        controllerEAs.delete(id);
      } else {
        propEAs.delete(id);
      }
      
      updateExpertsStatus();
    } else {
      const ea = controllerEAs.get(id) || propEAs.get(id);
      if(ea) {
        ea.state = 'offline';
        updateExpertsStatusThrottled();
      }
    }
  }
  
  } catch(err) {
    console.error('[SSE] ❌ Error processing message:', err);
    console.error('[SSE] Message data:', e.data);
  }
};

// Throttled version - max 1 update per 500ms
function updateExpertsStatusThrottled() {
  if(updateThrottleTimer) return;
  
  updateThrottleTimer = setTimeout(() => {
    updateExpertsStatus();
    updateThrottleTimer = null;
  }, 500);
}

function saveCheckboxState() {
  checkedControllers.clear();
  checkedProps.clear();
  
  document.querySelectorAll('.ea-check-controller:checked').forEach(cb => {
    checkedControllers.add(cb.value);
  });
  
  document.querySelectorAll('.ea-check-prop:checked').forEach(cb => {
    checkedProps.add(cb.value);
  });
}

function restoreCheckboxState() {
  checkedControllers.forEach(id => {
    const checkbox = document.querySelector('.ea-check-controller[value="' + id + '"]');
    if(checkbox) checkbox.checked = true;
  });
  
  checkedProps.forEach(id => {
    const checkbox = document.querySelector('.ea-check-prop[value="' + id + '"]');
    if(checkbox) checkbox.checked = true;
  });
  
  updateRemoveButtons();
}

// Helper function to check if EA data has changed
function eaDataHasChanged(newEA, oldData) {
  if(!oldData) return true; // No previous data
  
  // Get balance value (same logic as rendering)
  let newBalance = 0;
  if (newEA.accountInfo && newEA.accountInfo.balance !== undefined) {
    newBalance = newEA.accountInfo.balance;
  } else if (newEA.equity !== undefined) {
    newBalance = newEA.equity;
  }
  
  // Compare critical fields
  return oldData.id !== newEA.id ||
         oldData.accountNumber !== newEA.accountNumber ||
         oldData.accountName !== newEA.accountName ||
         oldData.balance !== newBalance ||
         oldData.state !== newEA.state ||
         oldData.enabled !== newEA.enabled ||
         oldData.errorCount !== ((newEA.errors && newEA.errors.length) || 0);
}

function updateExpertsStatus() {
  saveCheckboxState();
  
  // Update Controller EAs table
  const controllerBody = document.getElementById('controllerEAs');
  if(!controllerBody) return;
  
  const controllers = Array.from(controllerEAs.values());
  
  // Check if any controller EA data has changed
  let controllersChanged = controllers.length !== lastControllerEAsData.size;
  
  if(!controllersChanged) {
    for(const ea of controllers) {
      const oldData = lastControllerEAsData.get(ea.id);
      if(eaDataHasChanged(ea, oldData)) {
        controllersChanged = true;
        break;
      }
    }
  }
  
  // Only update if data has changed
  if(controllersChanged) {
    // Store current data for next comparison
    lastControllerEAsData.clear();
    for(const ea of controllers) {
      let balanceValue = 0;
      if (ea.accountInfo && ea.accountInfo.balance !== undefined) {
        balanceValue = ea.accountInfo.balance;
      } else if (ea.equity !== undefined) {
        balanceValue = ea.equity;
      }
      
      lastControllerEAsData.set(ea.id, {
        id: ea.id,
        accountNumber: ea.accountNumber,
        accountName: ea.accountName,
        balance: balanceValue,
        state: ea.state,
        enabled: ea.enabled,
        errorCount: (ea.errors && ea.errors.length) || 0
      });
    }
    
    // Render Controller EAs table
  
  if(controllers.length === 0) {
    controllerBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No controllers connected</td></tr>';
    document.getElementById('removeControllerBtn').disabled = true;
  } else {
    controllerBody.innerHTML = controllers.map(ea => {
      const errorCount = (ea.errors && ea.errors.length) || 0;
      const warningBtn = errorCount > 0 
        ? '<span class="warning-btn has-errors"><button class="btn btn-warning" style="padding:4px 8px;font-size:11px" onclick="showErrors(\\'' + ea.id + '\\', \\'controller\\')">⚠️</button><span class="warning-badge">' + errorCount + '</span></span>'
        : '<button class="btn btn-secondary" style="padding:4px 8px;font-size:11px;opacity:0.3;cursor:not-allowed" disabled>⚠️</button>';
      
      // Format account info: "AccNumber - AccName" with max 25 chars
      const accNum = String(ea.accountNumber || 'N/A');
      const accName = String(ea.accountName || 'N/A');
      let accountInfo = accNum + ' - ' + accName;
      if(accountInfo.length > 25) {
        accountInfo = accountInfo.substring(0, 22) + '...';
      }
      
      // FIX: Use SAME data source as Master Controller tables (ea.accountInfo.balance)
      // This ensures consistency and prevents balance/equity switching
      let balanceValue = 0;
      if (ea.accountInfo && ea.accountInfo.balance !== undefined) {
        balanceValue = ea.accountInfo.balance;  // Primary source (same as Master Controller tables)
      } else if (ea.equity !== undefined) {
        balanceValue = ea.equity;   // Fallback until account_info arrives
      }
      
      return '<tr>' +
      '<td><input type="checkbox" class="ea-check-controller" value="' + ea.id + '" onchange="updateRemoveButtons()"></td>' +
      '<td><code>' + (ea.id || 'N/A') + '</code></td>' +
      '<td title="' + accNum + ' - ' + accName + '"><small>' + accountInfo + '</small></td>' +
      '<td style="font-weight:700;color:var(--primary)">$' + balanceValue.toFixed(2) + '</td>' +
      '<td><span class="badge badge-' + (ea.state === 'online' ? 'active' : 'blocked') + '">' + ea.state.toUpperCase() + '</span></td>' +
      '<td style="text-align:center"><button class="ea-toggle ' + (ea.enabled !== false ? 'enabled' : '') + '" onclick="toggleEA(\\'' + ea.id + '\\', \\'controller\\')"></button></td>' +
      '<td style="text-align:center">' + warningBtn + '</td>' +
      '</tr>';
    }).join('');
    updateRemoveButtons();
  }
  } // End if(controllersChanged)
  
  // Update Prop EAs table
  const propBody = document.getElementById('propEAs');
  if(!propBody) return;
  
  const props = Array.from(propEAs.values());
  
  // Check if any prop EA data has changed
  let propsChanged = props.length !== lastPropEAsData.size;
  
  if(!propsChanged) {
    for(const ea of props) {
      const oldData = lastPropEAsData.get(ea.id);
      if(eaDataHasChanged(ea, oldData)) {
        propsChanged = true;
        break;
      }
    }
  }
  
  // Only update if data has changed
  if(propsChanged) {
    // Store current data for next comparison
    lastPropEAsData.clear();
    for(const ea of props) {
      let balanceValue = 0;
      if (ea.accountInfo && ea.accountInfo.balance !== undefined) {
        balanceValue = ea.accountInfo.balance;
      } else if (ea.equity !== undefined) {
        balanceValue = ea.equity;
      }
      
      lastPropEAsData.set(ea.id, {
        id: ea.id,
        accountNumber: ea.accountNumber,
        accountName: ea.accountName,
        balance: balanceValue,
        state: ea.state,
        enabled: ea.enabled,
        errorCount: (ea.errors && ea.errors.length) || 0
      });
    }
    
    // Render Prop EAs table
  
  if(props.length === 0) {
    propBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No props connected</td></tr>';
    document.getElementById('removePropBtn').disabled = true;
  } else {
    propBody.innerHTML = props.map(ea => {
      const errorCount = (ea.errors && ea.errors.length) || 0;
      const warningBtn = errorCount > 0 
        ? '<span class="warning-btn has-errors"><button class="btn btn-warning" style="padding:4px 8px;font-size:11px" onclick="showErrors(\\'' + ea.id + '\\', \\'prop\\')">⚠️</button><span class="warning-badge">' + errorCount + '</span></span>'
        : '<button class="btn btn-secondary" style="padding:4px 8px;font-size:11px;opacity:0.3;cursor:not-allowed" disabled>⚠️</button>';
      
      // Format account info: "AccNumber - AccName" with max 25 chars
      const accNum = String(ea.accountNumber || 'N/A');
      const accName = String(ea.accountName || 'N/A');
      let accountInfo = accNum + ' - ' + accName;
      if(accountInfo.length > 25) {
        accountInfo = accountInfo.substring(0, 22) + '...';
      }
      
      // FIX: Use SAME data source as Master Props tables (ea.accountInfo.balance)
      // This ensures consistency and prevents balance/equity switching
      let balanceValue = 0;
      if (ea.accountInfo && ea.accountInfo.balance !== undefined) {
        balanceValue = ea.accountInfo.balance;  // Primary source (same as Master Props tables)
      } else if (ea.equity !== undefined) {
        balanceValue = ea.equity;   // Fallback until account_info arrives
      }
      
      return '<tr>' +
      '<td><input type="checkbox" class="ea-check-prop" value="' + ea.id + '" onchange="updateRemoveButtons()"></td>' +
      '<td><code>' + (ea.id || 'N/A') + '</code></td>' +
      '<td title="' + accNum + ' - ' + accName + '"><small>' + accountInfo + '</small></td>' +
      '<td style="font-weight:700;color:var(--primary)">$' + balanceValue.toFixed(2) + '</td>' +
      '<td><span class="badge badge-' + (ea.state === 'online' ? 'active' : 'blocked') + '">' + ea.state.toUpperCase() + '</span></td>' +
      '<td style="text-align:center"><button class="ea-toggle ' + (ea.enabled !== false ? 'enabled' : '') + '" onclick="toggleEA(\\'' + ea.id + '\\', \\'prop\\')"></button></td>' +
      '<td style="text-align:center">' + warningBtn + '</td>' +
      '</tr>';
    }).join('');
    updateRemoveButtons();
  }
  } // End if(propsChanged)
  
  // Update EA filters dropdown (always update, doesn't cause flicker)
  updateEAFilters();
  
  // Restore checkbox state
  restoreCheckboxState();
}

async function toggleEA(id, type) {
  try {
    const ea = type === 'controller' ? controllerEAs.get(id) : propEAs.get(id);
    if(!ea) return;
    
    const newState = !ea.enabled;
    ea.enabled = newState;
    updateExpertsStatus();
    
    await fetch('/api/ea-toggle', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({id, enabled: newState, type})
    });
  } catch(err) {
    console.error('[ERROR] EA Toggle failed:', err);
  }
}

function toggleSelectAll(type) {
  const checkbox = document.getElementById('selectAll' + (type === 'controller' ? 'Controller' : 'Prop'));
  const checkboxes = document.querySelectorAll('.ea-check-' + type);
  checkboxes.forEach(cb => cb.checked = checkbox.checked);
  updateRemoveButtons();
}

function updateRemoveButtons() {
  const controllerChecked = document.querySelectorAll('.ea-check-controller:checked').length;
  const propChecked = document.querySelectorAll('.ea-check-prop:checked').length;
  
  // Update Remove buttons
  document.getElementById('removeControllerBtn').disabled = controllerChecked === 0;
  document.getElementById('removePropBtn').disabled = propChecked === 0;
  
  // Update Settings buttons
  document.getElementById('settingsControllerBtn').disabled = controllerChecked === 0;
  document.getElementById('settingsPropBtn').disabled = propChecked === 0;
}

// Track pending removals
const pendingRemovals = new Map(); // id -> {timestamp, timeout, type}

async function removeSelectedEAs(type) {
  const checkboxes = document.querySelectorAll('.ea-check-' + type + ':checked');
  const ids = Array.from(checkboxes).map(cb => cb.value);
  
  if(ids.length === 0) return;
  
  const result = await showConfirm('⚠️ Remove ' + ids.length + ' EA(s)?', 'This will send shutdown command to the EAs.');
  if(!result) return;
  
  showNotification('⏳ Removing EAs... Waiting for MT5 confirmation...', 'info', 15000);
  
  for(const id of ids) {
    await fetch('/api/ea-remove', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({id, type})
    });
    
    const timeout = setTimeout(() => {
      handleRemovalTimeout(id, type);
    }, 15000);
    
    pendingRemovals.set(id, {
      timestamp: Date.now(),
      timeout: timeout,
      type: type
    });
  }
}

async function handleRemovalTimeout(id, type) {
  const pending = pendingRemovals.get(id);
  if(!pending) return;
  
  pendingRemovals.delete(id);
  
  const ea = (type === 'controller' ? controllerEAs.get(id) : propEAs.get(id));
  const eaName = ea ? ea.id : id;
  const userId = ea ? ea.userId : null;
  
  // Remove from dashboard list (user can't wait)
    if(type === 'controller') {
      controllerEAs.delete(id);
    } else {
      propEAs.delete(id);
    }
  
  // Remove from server permanently (won't re-appear on refresh)
  try {
    await fetch('/api/ea-force-delete', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({id, userId})
    });
  } catch(err) {
    console.error('[ERROR] Failed to delete EA from server:', err);
  }
  
  updateExpertsStatus();
  showNotification('⚠️ EA removed from list (no MT5 confirmation)', 'warning');
}

// Settings Modal Functions
let currentSettingsType = null;
let propMaxTimeLastValid = 15; // Track last valid value for auto-correction

function openSettings(type) {
  const checkboxes = document.querySelectorAll('.ea-check-' + type + ':checked');
  const ids = Array.from(checkboxes).map(cb => cb.value);
  
  if(ids.length === 0) return;
  
  currentSettingsType = type;
  
  // Update modal title
  const count = ids.length > 1 ? ' (' + ids.length + ' EAs)' : '';
  const title = type === 'controller' ? '⚙️ Controller EA Settings' + count : '⚙️ Prop EA Settings' + count;
  document.getElementById('settingsModalTitle').textContent = title;
  
  // Show appropriate settings form
  document.getElementById('controllerSettings').style.display = type === 'controller' ? 'block' : 'none';
  document.getElementById('propSettings').style.display = type === 'prop' ? 'block' : 'none';
  
  // Check if all selected EAs have the same settings
  const allEAs = ids.map(id => type === 'controller' ? controllerEAs.get(id) : propEAs.get(id));
  const firstSettings = allEAs[0]?.settings;
  let allSame = true;
  
  if(ids.length > 1 && firstSettings) {
    for(let i = 1; i < allEAs.length; i++) {
      const currentSettings = allEAs[i]?.settings;
      if(!currentSettings || JSON.stringify(currentSettings) !== JSON.stringify(firstSettings)) {
        allSame = false;
        break;
      }
    }
  }
  
  if(type === 'controller') {
    // If multiple EAs with different settings, show empty. If same, show common values
    const showSettings = ids.length === 1 || allSame ? firstSettings : null;
    document.getElementById('settingsJitter').value = showSettings?.jitter || '';
    document.getElementById('settingsOffset').value = showSettings?.offset || '';
    
    // Offset direction dropdowns (orders only)
    document.getElementById('settingsBuyStopDir').value = showSettings?.buyStopDir || 'above';
    document.getElementById('settingsSellStopDir').value = showSettings?.sellStopDir || 'below';
    document.getElementById('settingsBuyLimitDir').value = showSettings?.buyLimitDir || 'below';
    document.getElementById('settingsSellLimitDir').value = showSettings?.sellLimitDir || 'above';
    
    updateOffsetDirectionFields(); // Enable/disable based on offset value
  } else {
    // Prop settings
    const showSettings = ids.length === 1 || allSame ? firstSettings : null;
    const calcMethod = showSettings?.calcMethod || 'none';
    
    document.getElementById('settingsPropCalcMethod').value = calcMethod;
    document.getElementById('settingsPropMethod').value = showSettings?.method || 'amount';
    document.getElementById('settingsPropValue').value = showSettings?.value ?? '';
    
    const maxTimeValue = showSettings?.maxTime ?? 15;
    document.getElementById('settingsPropMaxTime').value = maxTimeValue;
    propMaxTimeLastValid = maxTimeValue; // Store as last valid value
    
    onPropCalcMethodChange(); // Show/hide sections based on calculation method
    updatePropValueIcon(); // Update icon based on method
  }
  
  // Show modal
  document.getElementById('settingsModal').style.display = 'flex';
}

function updatePropValueIcon() {
  const calcMethod = document.getElementById('settingsPropCalcMethod')?.value || 'none';
  const iconElement = document.getElementById('propValueIcon');
  if(!iconElement) return;
  
  if(calcMethod === 'simple') {
    // Always percentage for Simple Risk
    iconElement.textContent = '%';
    return;
  }
  
  if(calcMethod === 'rr') {
    const method = document.getElementById('settingsPropMethod')?.value || 'amount';
    iconElement.textContent = (method === 'amount') ? '$' : '%';
    return;
  }
  
  // 'none' or unknown: default to '$' but section is hidden anyway
  iconElement.textContent = '$';
}

function onPropCalcMethodChange() {
  const calcMethod = document.getElementById('settingsPropCalcMethod').value;
  const fieldsContainer = document.getElementById('propRiskFieldsContainer');
  const rrGroup = document.getElementById('propRRMethodGroup');
  const valueGroup = document.getElementById('propValueGroup');
  const methodSelect = document.getElementById('settingsPropMethod');
  const valueInput = document.getElementById('settingsPropValue');
  const icon = document.getElementById('propValueIcon');
  const warning = document.getElementById('riskWarningProp');
  
  if(!fieldsContainer) return;
  
  if(calcMethod === 'none') {
    // Hide only the fields container, not the entire section
    fieldsContainer.style.display = 'none';
    if(warning) warning.style.display = 'none';
    return;
  }
  
  // Show fields container for 'simple' and 'rr'
  fieldsContainer.style.display = 'block';
  
  if(calcMethod === 'simple') {
    // Simple risk: percentage only, hide RR method
    if(rrGroup) rrGroup.style.display = 'none';
    if(valueGroup) valueGroup.style.display = 'block';
    if(warning) warning.style.display = 'none';
    
    // Force method to 'percentage' internally
    if(methodSelect) methodSelect.value = 'percentage';
    
    // Icon always %
    if(icon) icon.textContent = '%';
    
    if(valueInput) {
      valueInput.step = '0.01';
      valueInput.min = '0.01';
    }
  } else if(calcMethod === 'rr') {
    // Risk/Reward Ratio: show RR method + value
    if(rrGroup) rrGroup.style.display = 'block';
    if(valueGroup) valueGroup.style.display = 'block';
    if(warning) warning.style.display = 'block';
    
    if(valueInput) {
      valueInput.step = '0.01';
      valueInput.min = '0.01';
    }
    
    // Let updatePropValueIcon decide if $ or %
    updatePropValueIcon();
  }
}

function updateOffsetDirectionFields() {
  const offsetValue = parseFloat(document.getElementById('settingsOffset').value);
  const isEnabled = !isNaN(offsetValue) && offsetValue > 0;
  
  const directionFields = [
    'settingsBuyStopDir', 'settingsSellStopDir',
    'settingsBuyLimitDir', 'settingsSellLimitDir'
  ];
  
  const container = document.getElementById('offsetDirectionsContainer');
  
  if(isEnabled) {
    container.style.display = 'block';
    directionFields.forEach(id => {
      document.getElementById(id).disabled = false;
    });
  } else {
    container.style.display = 'none';
    directionFields.forEach(id => {
      document.getElementById(id).disabled = true;
    });
  }
}

function validatePropMaxTime() {
  const input = document.getElementById('settingsPropMaxTime');
  const errorTooltip = document.getElementById('propMaxTimeError');
  
  if(!input || !errorTooltip) return;
  
  const value = parseFloat(input.value);
  
  if(input.value === '') {
    // Empty is allowed during typing
    input.classList.remove('input-error');
    errorTooltip.style.display = 'none';
    return;
  }
  
  if(isNaN(value) || value < 15) {
    // Invalid: show error state
    input.classList.add('input-error');
    errorTooltip.style.display = 'block';
  } else {
    // Valid: clear error state and store as last valid
    input.classList.remove('input-error');
    errorTooltip.style.display = 'none';
    propMaxTimeLastValid = value;
  }
}

function correctPropMaxTime() {
  const input = document.getElementById('settingsPropMaxTime');
  const errorTooltip = document.getElementById('propMaxTimeError');
  
  if(!input) return;
  
  const value = parseFloat(input.value);
  
  if(input.value === '' || isNaN(value) || value < 15) {
    // Auto-correct to 15 (default minimum)
    input.value = 15;
    propMaxTimeLastValid = 15;
  }
  
  // Clear error state
  input.classList.remove('input-error');
  if(errorTooltip) errorTooltip.style.display = 'none';
}

// Track last valid Jitter value
let jitterLastValid = 0;

function validateJitter() {
  const input = document.getElementById('settingsJitter');
  const errorTooltip = document.getElementById('jitterError');
  
  if(!input || !errorTooltip) return;
  
  const value = parseFloat(input.value);
  
  if(input.value === '') {
    // Empty is allowed during typing
    input.classList.remove('input-error');
    errorTooltip.style.display = 'none';
    return;
  }
  
  if(isNaN(value) || value < 0 || value > 60) {
    // Invalid: show error state
    input.classList.add('input-error');
    errorTooltip.style.display = 'block';
  } else {
    // Valid: clear error state and store as last valid
    input.classList.remove('input-error');
    errorTooltip.style.display = 'none';
    jitterLastValid = value;
  }
}

function correctJitter() {
  const input = document.getElementById('settingsJitter');
  const errorTooltip = document.getElementById('jitterError');
  
  if(!input) return;
  
  const value = parseFloat(input.value);
  
  if(input.value === '' || isNaN(value)) {
    // Auto-correct to 0 (no jitter)
    input.value = 0;
    jitterLastValid = 0;
  } else if(value < 0) {
    // Negative value - correct to 0
    input.value = 0;
    jitterLastValid = 0;
  } else if(value > 60) {
    // Too large - correct to 60
    input.value = 60;
    jitterLastValid = 60;
  }
  
  // Clear error state
  input.classList.remove('input-error');
  if(errorTooltip) errorTooltip.style.display = 'none';
}

function closeSettings() {
  document.getElementById('settingsModal').style.display = 'none';
  currentSettingsType = null;
}

async function saveSettings() {
  if(!currentSettingsType) return;
  
  // Get selected EAs first
  const checkboxes = document.querySelectorAll('.ea-check-' + currentSettingsType + ':checked');
  const ids = Array.from(checkboxes).map(cb => cb.value);
  const isMultiEA = ids.length > 1;
  
  if(ids.length === 0) {
    closeSettings();
    return;
  }
  
  let settingsData = {};
  let hasAtLeastOne = false;
  
  // Build settings based on EA type
  if(currentSettingsType === 'controller') {
    const jitterInput = document.getElementById('settingsJitter').value.trim();
    const offsetInput = document.getElementById('settingsOffset').value.trim();
    
    // For multi-EA: Always include all fields (empty = 0 to clear)
    // For single EA: Only include filled fields (partial update)
    
    if(jitterInput !== '') {
      const jitter = parseFloat(jitterInput);
      if(isNaN(jitter) || jitter < 0 || jitter > 60) {
        showNotification('❌ Invalid Jitter value (must be between 0 and 60 seconds)', 'error');
        return;
      }
      settingsData.jitter = jitter;
      hasAtLeastOne = true;
    } else if(isMultiEA) {
      settingsData.jitter = 0; // Clear for multi-EA
      hasAtLeastOne = true;
    }
    
    if(offsetInput !== '') {
      const offset = parseInt(offsetInput, 10);
      if(isNaN(offset) || offset < 0) {
        showNotification('❌ Invalid Offset value', 'error');
        return;
      }
      settingsData.offset = offset;
      hasAtLeastOne = true;
      
      // Include offset direction settings if offset > 0 (orders only)
      if(offset > 0) {
        settingsData.buyStopDir = document.getElementById('settingsBuyStopDir').value;
        settingsData.sellStopDir = document.getElementById('settingsSellStopDir').value;
        settingsData.buyLimitDir = document.getElementById('settingsBuyLimitDir').value;
        settingsData.sellLimitDir = document.getElementById('settingsSellLimitDir').value;
      }
    } else if(isMultiEA) {
      settingsData.offset = 0; // Clear for multi-EA
      // Also clear offset directions (orders only)
      settingsData.buyStopDir = 'above';
      settingsData.sellStopDir = 'below';
      settingsData.buyLimitDir = 'below';
      settingsData.sellLimitDir = 'above';
      hasAtLeastOne = true;
    }
  } else {
    // Prop settings
    const calcMethod = document.getElementById('settingsPropCalcMethod').value;
    const method = document.getElementById('settingsPropMethod').value;
    const valueInput = document.getElementById('settingsPropValue').value.trim();
    const maxTimeInput = document.getElementById('settingsPropMaxTime').value.trim();
    
    // Always store calcMethod
    settingsData.calcMethod = calcMethod;
    
    if(calcMethod === 'none') {
      // No risk calculation, only store calcMethod (and maxTime below if needed)
      hasAtLeastOne = true;
    } else if(calcMethod === 'simple') {
      // Simple Risk: percentage value is required for single EA, optional (clear to 0) for multi-EA
    if(valueInput !== '') {
      const value = parseFloat(valueInput);
      if(isNaN(value) || value <= 0) {
        showNotification('❌ Invalid Value (must be > 0)', 'error');
        return;
      }
        settingsData.method = 'percentage';
        settingsData.value = value;
        hasAtLeastOne = true;
      } else if(isMultiEA) {
        settingsData.method = 'percentage';
        settingsData.value = 0; // Clear for multi-EA
        hasAtLeastOne = true;
      }
    } else if(calcMethod === 'rr') {
      // Risk/Reward Ratio: method + value
      if(valueInput !== '') {
        const value = parseFloat(valueInput);
        if(isNaN(value) || value <= 0) {
          showNotification('❌ Invalid Value (must be > 0)', 'error');
          return;
        }
        settingsData.method = method;  // 'amount' or 'percentage'
      settingsData.value = value;
      hasAtLeastOne = true;
    } else if(isMultiEA) {
      settingsData.method = method;
      settingsData.value = 0; // Clear for multi-EA
      hasAtLeastOne = true;
      }
    }
    
    // Handle maxTime (independent of calcMethod)
    if(maxTimeInput !== '') {
      const maxTime = parseFloat(maxTimeInput);
      if(isNaN(maxTime) || maxTime < 15) {
        showNotification('❌ Invalid Maximum Delay (minimum 15 seconds)', 'error');
        return;
      }
      settingsData.maxTime = maxTime;
      hasAtLeastOne = true;
    } else if(isMultiEA) {
      settingsData.maxTime = 15; // Default to 15 seconds for multi-EA
      hasAtLeastOne = true;
    }
  }
  
  // Send settings to server for each EA
  showNotification('⏳ Updating settings for ' + ids.length + ' EA(s)...', 'info');
  
  try {
    for(const id of ids) {
      const response = await fetch('/api/ea-settings', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          id,
          type: currentSettingsType,
          settings: settingsData
        })
      });
      
      const result = await response.json();
      if(result.ok) {
        // Update local EA object with merged settings from server
        const ea = currentSettingsType === 'controller' ? controllerEAs.get(id) : propEAs.get(id);
        if(ea) {
          // Merge new settings with existing ones
          if(!ea.settings) ea.settings = {};
          Object.assign(ea.settings, result.settings || settingsData);
        }
      }
    }
    
    showNotification('✅ Settings updated successfully!', 'success');
    closeSettings();
    
    // Uncheck all checkboxes
    checkboxes.forEach(cb => cb.checked = false);
    document.getElementById('selectAll' + (currentSettingsType === 'controller' ? 'Controller' : 'Prop')).checked = false;
    updateRemoveButtons();
    
  } catch(err) {
    console.error('[ERROR] Failed to save settings:', err);
    showNotification('❌ Failed to save settings', 'error');
  }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
  const modal = document.getElementById('settingsModal');
  if (event.target === modal) {
    closeSettings();
  }
});

let currentErrorEA = null;

function showErrors(id, type) {
  const ea = type === 'controller' ? controllerEAs.get(id) : propEAs.get(id);
  if(!ea) return;
  
  currentErrorEA = {id, type};
  
  document.getElementById('errorEAName').textContent = 'Errors: ' + (ea.accountName || ea.id);
  const errorsList = document.getElementById('errorsList');
  
  if(!ea.errors || ea.errors.length === 0) {
    errorsList.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">No errors reported</td></tr>';
  } else {
    errorsList.innerHTML = ea.errors.map(err => 
      '<tr>' +
      '<td>' + (err.time || new Date().toLocaleTimeString()) + '</td>' +
      '<td><code>' + (err.symbol || 'N/A') + '</code></td>' +
      '<td>' + (err.description || err.message || 'Unknown error') + '</td>' +
      '</tr>'
    ).join('');
  }
  
  document.getElementById('errorModal').classList.add('show');
}

function hideErrors() {
  document.getElementById('errorModal').classList.remove('show');
  currentErrorEA = null;
}

function clearErrors() {
  if(!currentErrorEA) return;
  
  const ea = currentErrorEA.type === 'controller' ? controllerEAs.get(currentErrorEA.id) : propEAs.get(currentErrorEA.id);
  if(ea) {
    ea.errors = [];
    updateExpertsStatusThrottled(); // Use throttled version
    hideErrors();
  }
}

// ========== Notifications ==========
function showNotification(message, type = 'info', duration = 5000) {
  // Remove existing notification
  const existing = document.querySelector('.custom-notification');
  if(existing) existing.remove();
  
  // Create notification
  const notif = document.createElement('div');
  notif.className = 'custom-notification show ' + type;
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  notif.innerHTML = 
    '<div class="notif-icon">' + icons[type] + '</div>' +
    '<div class="notif-message">' + message + '</div>' +
    '<button class="notif-close" onclick="this.parentElement.remove()">×</button>';
  
  document.body.appendChild(notif);
  
  if(duration > 0) {
    setTimeout(() => {
      if(notif && notif.parentElement) notif.remove();
    }, duration);
  }
}

// ========== Confirm Dialog ==========
function showConfirm(title, message) {
  return new Promise((resolve) => {
    // Remove existing dialog
    const existing = document.querySelector('.custom-confirm');
    if(existing) existing.remove();
    
    // Create confirm dialog
    const dialog = document.createElement('div');
    dialog.className = 'custom-confirm show';
    dialog.innerHTML = 
      '<div class="confirm-overlay"></div>' +
      '<div class="confirm-dialog">' +
        '<div class="confirm-header">' + title + '</div>' +
        '<div class="confirm-body">' + message + '</div>' +
        '<div class="confirm-footer">' +
          '<button class="btn btn-secondary" onclick="window.confirmResolve(false)">Cancel</button>' +
          '<button class="btn btn-primary" onclick="window.confirmResolve(true)">Confirm</button>' +
        '</div>' +
      '</div>';
    
    document.body.appendChild(dialog);
    
    window.confirmResolve = (result) => {
      dialog.remove();
      delete window.confirmResolve;
      resolve(result);
    };
  });
}

initTheme();

// Initialize account info panels visibility on page load
setTimeout(function() {
  const activeTab = document.querySelector('.tab-content.active');
  const isOverviewTab = activeTab && activeTab.id === 'overview';
  
  // Show account info panel if we're not on overview tab
  if(!isOverviewTab && activeTab) {
    const accountInfoPanel = activeTab.querySelector('.account-info-panel');
    if(accountInfoPanel) {
      accountInfoPanel.classList.remove('panel-hidden');
    }
  }
}, 100);

// ========== EA Filtering ==========
let controllerTradesData = { positions: [], orders: [], deals: [], deletedOrders: [] };
let propTradesData = { positions: [], orders: [], deals: [], deletedOrders: [] };

function updateBrokerTimeDisplay() {
  const ctrlFilter = document.getElementById('ctrl-ea-filter');
  const propFilter = document.getElementById('prop-ea-filter');
  
  // Update Controller Broker Time
  if(ctrlFilter) {
    const selectedEA = ctrlFilter.value;
    let brokerTime = '--/--/---- --:--';
    let timezone = '';
    
    if(selectedEA !== 'all') {
      const ea = controllerEAs.get(selectedEA);
      if(ea && ea.brokerTime) {
        brokerTime = ea.brokerTime;
      }
      if(ea && ea.timezoneOffset !== undefined) {
        const offset = ea.timezoneOffset;
        timezone = ' (UTC ' + (offset >= 0 ? '+' : '') + offset + ')';
      }
    }
    
    const ctrlBrokerTimeEl = document.getElementById('ctrl-broker-time');
    if(ctrlBrokerTimeEl) {
      ctrlBrokerTimeEl.textContent = brokerTime + timezone;
    }
  }
  
  // Update Prop Broker Time
  if(propFilter) {
    const selectedEA = propFilter.value;
    let brokerTime = '--/--/---- --:--';
    let timezone = '';
    
    if(selectedEA !== 'all') {
      const ea = propEAs.get(selectedEA);
      if(ea && ea.brokerTime) {
        brokerTime = ea.brokerTime;
      }
      if(ea && ea.timezoneOffset !== undefined) {
        const offset = ea.timezoneOffset;
        timezone = ' (UTC ' + (offset >= 0 ? '+' : '') + offset + ')';
      }
    }
    
    const propBrokerTimeEl = document.getElementById('prop-broker-time');
    if(propBrokerTimeEl) {
      propBrokerTimeEl.textContent = brokerTime + timezone;
    }
  }
}

function updateAccountInfoDisplay() {
  const ctrlFilter = document.getElementById('ctrl-ea-filter');
  const propFilter = document.getElementById('prop-ea-filter');
  
  // Update Controller Account Info
  if(ctrlFilter) {
    const selectedEA = ctrlFilter.value;
    let accountInfo = { balance: 0, equity: 0, freeMargin: 0, marginLevel: 0 };
    
    if(selectedEA !== 'all') {
      // Show specific EA data
      const ea = controllerEAs.get(selectedEA);
      if(ea && ea.accountInfo) {
        accountInfo = ea.accountInfo;
      }
    }
    
    // Update display with color coding
    if(accountInfo) {
      document.getElementById('ctrl-balance').textContent = '$' + accountInfo.balance.toFixed(2);
      
      const equityEl = document.getElementById('ctrl-equity');
      equityEl.textContent = '$' + accountInfo.equity.toFixed(2);
      // Color code equity
      if(accountInfo.equity > accountInfo.balance) {
        equityEl.style.color = 'var(--success)';
      } else if(accountInfo.equity < accountInfo.balance) {
        equityEl.style.color = 'var(--danger)';
      } else {
        equityEl.style.color = 'var(--text)';
      }
      
      document.getElementById('ctrl-free-margin').textContent = '$' + accountInfo.freeMargin.toFixed(2);
      document.getElementById('ctrl-margin-level').textContent = accountInfo.marginLevel.toFixed(2) + '%';
    }
  }
  
  // Update Prop Account Info
  if(propFilter) {
    const selectedEA = propFilter.value;
    let accountInfo = { balance: 0, equity: 0, freeMargin: 0, marginLevel: 0 };
    
    if(selectedEA !== 'all') {
      // Show specific EA data
      const ea = propEAs.get(selectedEA);
      if(ea && ea.accountInfo) {
        accountInfo = ea.accountInfo;
      }
    }
    
    // Update display with color coding
    if(accountInfo) {
      document.getElementById('prop-balance').textContent = '$' + accountInfo.balance.toFixed(2);
      
      const equityEl = document.getElementById('prop-equity');
      equityEl.textContent = '$' + accountInfo.equity.toFixed(2);
      // Color code equity
      if(accountInfo.equity > accountInfo.balance) {
        equityEl.style.color = 'var(--success)';
      } else if(accountInfo.equity < accountInfo.balance) {
        equityEl.style.color = 'var(--danger)';
      } else {
        equityEl.style.color = 'var(--text)';
      }
      
      document.getElementById('prop-free-margin').textContent = '$' + accountInfo.freeMargin.toFixed(2);
      document.getElementById('prop-margin-level').textContent = accountInfo.marginLevel.toFixed(2) + '%';
    }
  }
}

// Only update LIVE tables (Positions & Orders)
function filterAndDisplayLiveTrades() {
  const ctrlFilter = document.getElementById('ctrl-ea-filter');
  const propFilter = document.getElementById('prop-ea-filter');
  
  if(ctrlFilter) filterControllerLiveTrades();
  if(propFilter) filterPropLiveTrades();
}

// Only update HISTORY tables (Deals & Deleted Orders)
function filterAndDisplayHistoryTrades() {
  const ctrlFilter = document.getElementById('ctrl-ea-filter');
  const propFilter = document.getElementById('prop-ea-filter');
  
  if(ctrlFilter) filterControllerHistoryTrades();
  if(propFilter) filterPropHistoryTrades();
}

function formatNumber(value, digits = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return num.toFixed(digits);
}

// Helper function to check if orders have changed
function ordersHaveChanged(newOrders, oldOrders) {
  if (!oldOrders || newOrders.length !== oldOrders.length) return true;
  
  // Compare key properties of each order
  for (let i = 0; i < newOrders.length; i++) {
    const newO = newOrders[i];
    const oldO = oldOrders[i];
    if (!oldO || 
        newO.ticket !== oldO.ticket || 
        newO.volume !== oldO.volume ||
        newO.stopLoss !== oldO.stopLoss ||
        newO.takeProfit !== oldO.takeProfit) {
      return true;
    }
  }
  return false;
}

function formatSignedNumber(value, digits = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  const sign = num > 0 ? '+' : '';
  return sign + num.toFixed(digits);
}

function calculateStats(items, itemType) {
  const stats = { total: 0, buy: 0, sell: 0, buyStop: 0, sellStop: 0, buyLimit: 0, sellLimit: 0 };
  
  items.forEach(item => {
    stats.total++;
    const type = item.type?.toLowerCase() || '';
    
    if(type.includes('buy') && !type.includes('stop') && !type.includes('limit')) {
      stats.buy++;
    } else if(type.includes('sell') && !type.includes('stop') && !type.includes('limit')) {
      stats.sell++;
    } else if(type === 'buy stop') {
      stats.buyStop++;
    } else if(type === 'sell stop') {
      stats.sellStop++;
    } else if(type === 'buy limit') {
      stats.buyLimit++;
    } else if(type === 'sell limit') {
      stats.sellLimit++;
    }
  });
  
  return stats;
}

function calculatePL(items) {
  let brut = 0, net = 0;
  
  items.forEach(item => {
    brut += item.profitBrut || 0;
    net += item.profitNet || 0;
  });
  
  return { brut, net };
}

function updateEAFilters() {
  // Update Controller EA filter
  const ctrlFilter = document.getElementById('ctrl-ea-filter');
  if(ctrlFilter) {
    const currentValue = ctrlFilter.value;
    ctrlFilter.innerHTML = '<option value="all">Choose ...</option>';
    
    const controllerIds = new Set();
    for(const [id, ea] of controllerEAs) {
      if(ea.role === 'controller') {
        controllerIds.add(id);
      }
    }
    
    for(const id of Array.from(controllerIds).sort()) {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = id;
      ctrlFilter.appendChild(option);
    }
    
    ctrlFilter.value = currentValue || 'all';
  }
  
  // Update Prop EA filter
  const propFilter = document.getElementById('prop-ea-filter');
  if(propFilter) {
    const currentValue = propFilter.value;
    propFilter.innerHTML = '<option value="all">Choose ...</option>';
    
    const propIds = new Set();
    for(const [id, ea] of propEAs) {
      if(ea.role === 'prop') {
        propIds.add(id);
      }
    }
    
    for(const id of Array.from(propIds).sort()) {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = id;
      propFilter.appendChild(option);
    }
    
    propFilter.value = currentValue || 'all';
  }
}

// Only filter and render LIVE trades (Positions & Orders)
function filterControllerLiveTrades() {
  if(!controllerTradesData) return;
  
  const selectedEA = document.getElementById('ctrl-ea-filter').value;
  updateAccountInfoDisplay();
  updateBrokerTimeDisplay();
  
  // If "Choose..." is selected, show empty (no data)
  if(selectedEA === 'all') {
    renderControllerLiveTrades({ 
      positions: [], 
      orders: [], 
      posStats: { total: 0, buy: 0, sell: 0 }, 
      ordStats: { total: 0, buyStop: 0, sellStop: 0, buyLimit: 0, sellLimit: 0 }, 
      posPL: { brut: 0, net: 0 } 
    });
    return;
  }
  
  const positions = controllerTradesData.positions.filter(p => p.eaId === selectedEA);
  const orders = controllerTradesData.orders.filter(o => o.eaId === selectedEA);
  
  const posStats = calculateStats(positions, 'position');
  const ordStats = calculateStats(orders, 'order');
  const posPL = calculatePL(positions);
  
  renderControllerLiveTrades({ id: selectedEA, positions, orders, posStats, ordStats, posPL });
}

// Only filter and render HISTORY trades (Deals & Deleted Orders)
function filterControllerHistoryTrades() {
  if(!controllerTradesData) return;
  
  const selectedEA = document.getElementById('ctrl-ea-filter').value;
  
  // If "Choose..." is selected, show empty (no data)
  if(selectedEA === 'all') {
    renderControllerHistoryTrades({ 
      deals: [], 
      deletedOrders: [], 
      dealStats: { total: 0, buy: 0, sell: 0 }, 
      delOrdStats: { total: 0, buyStop: 0, sellStop: 0, buyLimit: 0, sellLimit: 0 }, 
      dealPL: { brut: 0, net: 0 } 
    });
    return;
  }
  
  const deals = controllerTradesData.deals.filter(d => d.eaId === selectedEA);
  const deletedOrders = controllerTradesData.deletedOrders.filter(o => o.eaId === selectedEA);
  
  const dealStats = calculateStats(deals, 'deal');
  const delOrdStats = calculateStats(deletedOrders, 'order');
  const dealPL = calculatePL(deals);
  
  renderControllerHistoryTrades({ deals, deletedOrders, dealStats, delOrdStats, dealPL });
}

// Only filter and render LIVE trades for Props
function filterPropLiveTrades() {
  if(!propTradesData) return;
  
  const selectedEA = document.getElementById('prop-ea-filter').value;
  updateAccountInfoDisplay();
  updateBrokerTimeDisplay();
  
  // If "Choose..." is selected, show empty (no data)
  if(selectedEA === 'all') {
    renderPropLiveTrades({ 
      positions: [], 
      orders: [], 
      posStats: { total: 0, buy: 0, sell: 0 }, 
      ordStats: { total: 0, buyStop: 0, sellStop: 0, buyLimit: 0, sellLimit: 0 }, 
      posPL: { brut: 0, net: 0 } 
    });
    return;
  }
  
  const positions = propTradesData.positions.filter(p => p.eaId === selectedEA);
  const orders = propTradesData.orders.filter(o => o.eaId === selectedEA);
  
  const posStats = calculateStats(positions, 'position');
  const ordStats = calculateStats(orders, 'order');
  const posPL = calculatePL(positions);
  
  renderPropLiveTrades({ id: selectedEA, positions, orders, posStats, ordStats, posPL });
}

// Only filter and render HISTORY trades for Props
function filterPropHistoryTrades() {
  if(!propTradesData) return;
  
  const selectedEA = document.getElementById('prop-ea-filter').value;
  
  // If "Choose..." is selected, show empty (no data)
  if(selectedEA === 'all') {
    renderPropHistoryTrades({ 
      deals: [], 
      deletedOrders: [], 
      dealStats: { total: 0, buy: 0, sell: 0 }, 
      delOrdStats: { total: 0, buyStop: 0, sellStop: 0, buyLimit: 0, sellLimit: 0 }, 
      dealPL: { brut: 0, net: 0 } 
    });
    return;
  }
  
  const deals = propTradesData.deals.filter(d => d.eaId === selectedEA);
  const deletedOrders = propTradesData.deletedOrders.filter(o => o.eaId === selectedEA);
  
  const dealStats = calculateStats(deals, 'deal');
  const delOrdStats = calculateStats(deletedOrders, 'order');
  const dealPL = calculatePL(deals);
  
  renderPropHistoryTrades({ deals, deletedOrders, dealStats, delOrdStats, dealPL });
}

// Render only LIVE trades (Positions & Orders)
function renderControllerLiveTrades(data) {
  renderControllerTrades(data, true, false); // liveOnly=true, historyOnly=false
  
  // Update copy status for all positions & orders after rendering
  updateCopyStatusForPositions(data.id, data.positions || []);
  updateCopyStatusForOrders(data.id, data.orders || []);
}

// Render only HISTORY trades (Deals & Deleted Orders)
function renderControllerHistoryTrades(data) {
  renderControllerTrades(data, false, true); // liveOnly=false, historyOnly=true
}

// Update copy status for all positions (async)
async function updateCopyStatusForPositions(controllerEAId, positions) {
  if(!controllerEAId || positions.length === 0) return;
  
  for(const position of positions) {
    try {
      const res = await fetch(\`/api/copy-status/\${controllerEAId}/\${position.ticket}\`);
      if(!res.ok) continue;
      
      const data = await res.json();
      if(!data.ok || !data.status) continue;
      
      const statusCell = document.getElementById(\`copy-status-\${position.ticket}\`);
      if(statusCell) {
        statusCell.innerHTML = data.status.icon + ' ' + data.status.text;
        statusCell.title = \`Status: \${data.status.status}\`;
      }
    } catch(err) {
      // Silently ignore errors (status will remain as "⏳")
    }
  }
}

// Update copy status for all orders (async)
async function updateCopyStatusForOrders(controllerEAId, orders) {
  if(!controllerEAId || orders.length === 0) return;
  
  for(const order of orders) {
    try {
      const res = await fetch(\`/api/copy-status/\${controllerEAId}/\${order.ticket}\`);
      if(!res.ok) continue;
      
      const data = await res.json();
      if(!data.ok || !data.status) continue;
      
      const statusCell = document.getElementById(\`copy-status-ord-\${order.ticket}\`);
      if(statusCell) {
        statusCell.innerHTML = data.status.icon + ' ' + data.status.text;
        statusCell.title = \`Status: \${data.status.status}\`;
      }
    } catch(err) {
      // Silently ignore errors (status will remain as "⏳")
    }
  }
}

function renderControllerTrades(data, liveOnly = false, historyOnly = false) {
  // Update stats
  if(!historyOnly && data.posStats) {
    const statsEl = document.getElementById('ctrl-pos-stats');
    if(statsEl) {
      statsEl.textContent = 'Total: ' + data.posStats.total + ' | Buy: ' + data.posStats.buy + ' | Sell: ' + data.posStats.sell;
    }
  }
  
  if(!historyOnly && data.ordStats) {
    const statsEl = document.getElementById('ctrl-orders-stats');
    if(statsEl) {
      statsEl.textContent = 'Total: ' + data.ordStats.total + ' | Buy Limit: ' + data.ordStats.buyLimit + ' | Sell Limit: ' + data.ordStats.sellLimit + ' | Buy Stop: ' + data.ordStats.buyStop + ' | Sell Stop: ' + data.ordStats.sellStop;
    }
  }
  
  if(!liveOnly && data.dealStats) {
    const statsEl = document.getElementById('ctrl-deals-stats');
    if(statsEl) {
      statsEl.textContent = 'Total: ' + data.dealStats.total + ' | Buy: ' + data.dealStats.buy + ' | Sell: ' + data.dealStats.sell;
    }
  }
  
  if(!liveOnly && data.delOrdStats) {
    const statsEl = document.getElementById('ctrl-deleted-stats');
    if(statsEl) {
      statsEl.textContent = 'Total: ' + data.delOrdStats.total + ' | Buy Limit: ' + data.delOrdStats.buyLimit + ' | Sell Limit: ' + data.delOrdStats.sellLimit + ' | Buy Stop: ' + data.delOrdStats.buyStop + ' | Sell Stop: ' + data.delOrdStats.sellStop;
    }
  }
  
  // Update P&L with colors
  if(!historyOnly && data.posPL) {
    const brutEl = document.getElementById('ctrl-pos-pl-brut');
    const netEl = document.getElementById('ctrl-pos-pl-net');
    if(brutEl) {
      brutEl.textContent = (data.posPL.brut >= 0 ? '+' : '') + '$' + data.posPL.brut.toFixed(2);
      brutEl.className = 'pl-summary-value ' + (data.posPL.brut > 0 ? 'positive' : data.posPL.brut < 0 ? 'negative' : 'neutral');
    }
    if(netEl) {
      netEl.textContent = (data.posPL.net >= 0 ? '+' : '') + '$' + data.posPL.net.toFixed(2);
      netEl.className = 'pl-summary-value ' + (data.posPL.net > 0 ? 'positive' : data.posPL.net < 0 ? 'negative' : 'neutral');
    }
  }
  
  if(!liveOnly && data.dealPL) {
    const brutEl = document.getElementById('ctrl-deals-pl-brut');
    const netEl = document.getElementById('ctrl-deals-pl-net');
    if(brutEl) {
      brutEl.textContent = (data.dealPL.brut >= 0 ? '+' : '') + '$' + data.dealPL.brut.toFixed(2);
      brutEl.className = 'pl-summary-value ' + (data.dealPL.brut > 0 ? 'positive' : data.dealPL.brut < 0 ? 'negative' : 'neutral');
    }
    if(netEl) {
      netEl.textContent = (data.dealPL.net >= 0 ? '+' : '') + '$' + data.dealPL.net.toFixed(2);
      netEl.className = 'pl-summary-value ' + (data.dealPL.net > 0 ? 'positive' : data.dealPL.net < 0 ? 'negative' : 'neutral');
    }
  }
  
  // Positions
  if(!historyOnly) {
  const posBody = document.getElementById('controllerPositions');
  if(posBody) {
    if(!data.positions || data.positions.length === 0) {
      posBody.innerHTML = '<tr><td colspan="12" style="text-align:center;color:var(--text-muted)">No positions</td></tr>';
    } else {
      posBody.innerHTML = data.positions.map(p => {
        const brutValue = Number(p.profitBrut);
        const netValue = Number(p.profitNet);
        const brutColor = Number.isFinite(brutValue) ? (brutValue > 0 ? 'color:var(--success)' : brutValue < 0 ? 'color:var(--danger)' : 'color:var(--text-muted)') : 'color:var(--text-muted)';
        const netColor = Number.isFinite(netValue) ? (netValue > 0 ? 'color:var(--success)' : netValue < 0 ? 'color:var(--danger)' : 'color:var(--text-muted)') : 'color:var(--text-muted)';
        const sl = formatNumber(p.stopLoss, 5);
        const tp = formatNumber(p.takeProfit, 5);
        return '<tr>' +
        '<td>' + (p.ticket ?? '-') + '</td>' +
        '<td><code>' + (p.symbol || '-') + '</code></td>' +
        '<td><span class="badge ' + (p.type === 'Buy' ? 'badge-success' : 'badge-danger') + '">' + p.type + '</span></td>' +
        '<td>' + formatNumber(p.volume, 2) + '</td>' +
        '<td>' + formatNumber(p.priceOpen, 5) + '</td>' +
        '<td>' + (p.timeOpen || '-') + '</td>' +
        '<td style="color:var(--text-muted)">' + (sl === '-' ? '-' : sl) + '</td>' +
        '<td style="color:var(--text-muted)">' + (tp === '-' ? '-' : tp) + '</td>' +
        '<td style="font-weight:600;' + brutColor + '">' + formatSignedNumber(p.profitBrut, 2) + '</td>' +
        '<td style="font-weight:600;' + netColor + '">' + formatSignedNumber(p.profitNet, 2) + '</td>' +
        '<td style="font-size:11px;color:var(--text-muted)">' + (p.reason || '-') + '</td>' +
        '<td id="copy-status-' + p.ticket + '" style="text-align:center;font-size:14px">⏳</td>' +
        '</tr>';
      }).join('');
    }
  }
  
  // Orders - Only re-render if orders have actually changed
  const ordBody = document.getElementById('controllerOrders');
  if(ordBody) {
    // Check if orders have changed before re-rendering
    if(ordersHaveChanged(data.orders || [], lastControllerOrders)) {
      lastControllerOrders = data.orders || [];
      
      if(!data.orders || data.orders.length === 0) {
        ordBody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--text-muted)">No pending orders</td></tr>';
      } else {
        ordBody.innerHTML = data.orders.map(o => {
          const sl = formatNumber(o.stopLoss, 5);
          const tp = formatNumber(o.takeProfit, 5);
          return '<tr>' +
          '<td>' + (o.ticket ?? '-') + '</td>' +
          '<td><code>' + (o.symbol || '-') + '</code></td>' +
          '<td><span class="badge badge-secondary">' + o.type + '</span></td>' +
          '<td>' + formatNumber(o.volume, 2) + '</td>' +
          '<td>' + formatNumber(o.priceOpen, 5) + '</td>' +
          '<td>' + (o.timeOpen || '-') + '</td>' +
          '<td style="color:var(--text-muted)">' + (sl === '-' ? '-' : sl) + '</td>' +
          '<td style="color:var(--text-muted)">' + (tp === '-' ? '-' : tp) + '</td>' +
          '<td style="font-size:11px;color:var(--text-muted)">' + (o.reason || '-') + '</td>' +
          '<td id="copy-status-ord-' + o.ticket + '" style="text-align:center;font-size:14px">⏳</td>' +
          '</tr>';
        }).join('');
      }
    }
  }
  }
  
  // Deals
  if(!liveOnly) {
  const dealBody = document.getElementById('controllerDeals');
  if(dealBody) {
    if(!data.deals || data.deals.length === 0) {
      dealBody.innerHTML = '<tr><td colspan="14" style="text-align:center;color:var(--text-muted)">No deals</td></tr>';
    } else {
      dealBody.innerHTML = data.deals.map(d => {
        const brutValue = Number(d.profitBrut);
        const netValue = Number(d.profitNet);
        const brutColor = Number.isFinite(brutValue) ? (brutValue > 0 ? 'color:var(--success)' : brutValue < 0 ? 'color:var(--danger)' : 'color:var(--text-muted)') : 'color:var(--text-muted)';
        const netColor = Number.isFinite(netValue) ? (netValue > 0 ? 'color:var(--success)' : netValue < 0 ? 'color:var(--danger)' : 'color:var(--text-muted)') : 'color:var(--text-muted)';
        const sl = formatNumber(d.stopLoss, 5);
        const tp = formatNumber(d.takeProfit, 5);
        return '<tr>' +
        '<td>' + (d.ticket ?? '-') + '</td>' +
        '<td><code>' + (d.symbol || '-') + '</code></td>' +
        '<td><span class="badge ' + (d.type === 'Buy' ? 'badge-success' : 'badge-danger') + '">' + d.type + '</span></td>' +
        '<td>' + formatNumber(d.volume, 2) + '</td>' +
        '<td>' + formatNumber(d.priceOpen, 5) + '</td>' +
        '<td>' + (d.timeOpen || '-') + '</td>' +
        '<td style="color:var(--text-muted)">' + (sl === '-' ? '-' : sl) + '</td>' +
        '<td style="color:var(--text-muted)">' + (tp === '-' ? '-' : tp) + '</td>' +
        '<td>' + formatNumber(d.priceClose, 5) + '</td>' +
        '<td>' + (d.timeClose || '-') + '</td>' +
        '<td style="font-weight:600;' + brutColor + '">' + formatSignedNumber(d.profitBrut, 2) + '</td>' +
        '<td style="font-weight:600;' + netColor + '">' + formatSignedNumber(d.profitNet, 2) + '</td>' +
        '<td style="font-size:11px;color:var(--text-muted)">' + (d.reason || '-') + '</td>' +
        '<td style="text-align:center;font-size:16px">✗</td>' +
        '</tr>';
      }).join('');
    }
  }
  
  // Deleted Orders
  const delBody = document.getElementById('controllerDeletedOrders');
  if(delBody) {
    if(!data.deletedOrders || data.deletedOrders.length === 0) {
      delBody.innerHTML = '<tr><td colspan="12" style="text-align:center;color:var(--text-muted)">No deleted orders</td></tr>';
    } else {
      delBody.innerHTML = data.deletedOrders.map(o => {
        const sl = formatNumber(o.stopLoss, 5);
        const tp = formatNumber(o.takeProfit, 5);
        return '<tr>' +
        '<td>' + (o.ticket ?? '-') + '</td>' +
        '<td><code>' + (o.symbol || '-') + '</code></td>' +
        '<td><span class="badge badge-secondary">' + o.type + '</span></td>' +
        '<td>' + formatNumber(o.volume, 2) + '</td>' +
        '<td>' + formatNumber(o.orderPrice, 5) + '</td>' +
        '<td>' + (o.orderTime || '-') + '</td>' +
        '<td style="color:var(--text-muted)">' + (sl === '-' ? '-' : sl) + '</td>' +
        '<td style="color:var(--text-muted)">' + (tp === '-' ? '-' : tp) + '</td>' +
        '<td>' + formatNumber(o.deletePrice, 5) + '</td>' +
        '<td>' + (o.deleteTime || '-') + '</td>' +
        '<td style="font-size:11px;color:var(--text-muted)">' + (o.reason || '-') + '</td>' +
        '<td style="text-align:center;font-size:16px">✗</td>' +
        '</tr>';
      }).join('');
    }
  }
  }
}

// Render only LIVE trades for Props
function renderPropLiveTrades(data) {
  renderPropTrades(data, true, false);
}

// Render only HISTORY trades for Props
function renderPropHistoryTrades(data) {
  renderPropTrades(data, false, true);
}

function renderPropTrades(data, liveOnly = false, historyOnly = false) {
  // Update stats
  if(!historyOnly && data.posStats) {
    const statsEl = document.getElementById('prop-pos-stats');
    if(statsEl) {
      statsEl.textContent = 'Total: ' + data.posStats.total + ' | Buy: ' + data.posStats.buy + ' | Sell: ' + data.posStats.sell;
    }
  }
  
  if(!historyOnly && data.ordStats) {
    const statsEl = document.getElementById('prop-orders-stats');
    if(statsEl) {
      statsEl.textContent = 'Total: ' + data.ordStats.total + ' | Buy Limit: ' + data.ordStats.buyLimit + ' | Sell Limit: ' + data.ordStats.sellLimit + ' | Buy Stop: ' + data.ordStats.buyStop + ' | Sell Stop: ' + data.ordStats.sellStop;
    }
  }
  
  if(!liveOnly && data.dealStats) {
    const statsEl = document.getElementById('prop-deals-stats');
    if(statsEl) {
      statsEl.textContent = 'Total: ' + data.dealStats.total + ' | Buy: ' + data.dealStats.buy + ' | Sell: ' + data.dealStats.sell;
    }
  }
  
  if(!liveOnly && data.delOrdStats) {
    const statsEl = document.getElementById('prop-deleted-stats');
    if(statsEl) {
      statsEl.textContent = 'Total: ' + data.delOrdStats.total + ' | Buy Limit: ' + data.delOrdStats.buyLimit + ' | Sell Limit: ' + data.delOrdStats.sellLimit + ' | Buy Stop: ' + data.delOrdStats.buyStop + ' | Sell Stop: ' + data.delOrdStats.sellStop;
    }
  }
  
  // Update P&L with colors
  if(!historyOnly && data.posPL) {
    const brutEl = document.getElementById('prop-pos-pl-brut');
    const netEl = document.getElementById('prop-pos-pl-net');
    if(brutEl) {
      brutEl.textContent = (data.posPL.brut >= 0 ? '+' : '') + '$' + data.posPL.brut.toFixed(2);
      brutEl.className = 'pl-summary-value ' + (data.posPL.brut > 0 ? 'positive' : data.posPL.brut < 0 ? 'negative' : 'neutral');
    }
    if(netEl) {
      netEl.textContent = (data.posPL.net >= 0 ? '+' : '') + '$' + data.posPL.net.toFixed(2);
      netEl.className = 'pl-summary-value ' + (data.posPL.net > 0 ? 'positive' : data.posPL.net < 0 ? 'negative' : 'neutral');
    }
  }
  
  if(!liveOnly && data.dealPL) {
    const brutEl = document.getElementById('prop-deals-pl-brut');
    const netEl = document.getElementById('prop-deals-pl-net');
    if(brutEl) {
      brutEl.textContent = (data.dealPL.brut >= 0 ? '+' : '') + '$' + data.dealPL.brut.toFixed(2);
      brutEl.className = 'pl-summary-value ' + (data.dealPL.brut > 0 ? 'positive' : data.dealPL.brut < 0 ? 'negative' : 'neutral');
    }
    if(netEl) {
      netEl.textContent = (data.dealPL.net >= 0 ? '+' : '') + '$' + data.dealPL.net.toFixed(2);
      netEl.className = 'pl-summary-value ' + (data.dealPL.net > 0 ? 'positive' : data.dealPL.net < 0 ? 'negative' : 'neutral');
    }
  }
  
  // Positions (with "Received from" column)
  if(!historyOnly) {
  const posBody = document.getElementById('propsPositions');
  if(posBody) {
    if(!data.positions || data.positions.length === 0) {
      posBody.innerHTML = '<tr><td colspan="12" style="text-align:center;color:var(--text-muted)">No positions</td></tr>';
    } else {
      posBody.innerHTML = data.positions.map(p => {
        const brutValue = Number(p.profitBrut);
        const netValue = Number(p.profitNet);
        const brutColor = Number.isFinite(brutValue) ? (brutValue > 0 ? 'color:var(--success)' : brutValue < 0 ? 'color:var(--danger)' : 'color:var(--text-muted)') : 'color:var(--text-muted)';
        const netColor = Number.isFinite(netValue) ? (netValue > 0 ? 'color:var(--success)' : netValue < 0 ? 'color:var(--danger)' : 'color:var(--text-muted)') : 'color:var(--text-muted)';
        const sl = formatNumber(p.stopLoss, 5);
        const tp = formatNumber(p.takeProfit, 5);
        return '<tr>' +
        '<td><code>' + (p.eaId || 'N/A') + '</code></td>' +
        '<td>' + (p.ticket ?? '-') + '</td>' +
        '<td><code>' + (p.symbol || '-') + '</code></td>' +
        '<td><span class="badge ' + (p.type === 'Buy' ? 'badge-success' : 'badge-danger') + '">' + p.type + '</span></td>' +
        '<td>' + formatNumber(p.volume, 2) + '</td>' +
        '<td>' + formatNumber(p.priceOpen, 5) + '</td>' +
        '<td>' + (p.timeOpen || '-') + '</td>' +
        '<td style="color:var(--text-muted)">' + (sl === '-' ? '-' : sl) + '</td>' +
        '<td style="color:var(--text-muted)">' + (tp === '-' ? '-' : tp) + '</td>' +
        '<td style="font-weight:600;' + brutColor + '">' + formatSignedNumber(p.profitBrut, 2) + '</td>' +
        '<td style="font-weight:600;' + netColor + '">' + formatSignedNumber(p.profitNet, 2) + '</td>' +
        '<td style="font-size:11px;color:var(--text-muted)">' + (p.reason || '-') + '</td>' +
        '</tr>';
      }).join('');
    }
  }
  
  // Orders (with "Received from" column) - Only re-render if orders have actually changed
  const ordBody = document.getElementById('propsOrders');
  if(ordBody) {
    // Check if orders have changed before re-rendering
    if(ordersHaveChanged(data.orders || [], lastPropOrders)) {
      lastPropOrders = data.orders || [];
      
      if(!data.orders || data.orders.length === 0) {
        ordBody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--text-muted)">No pending orders</td></tr>';
      } else {
        ordBody.innerHTML = data.orders.map(o => {
          const sl = formatNumber(o.stopLoss, 5);
          const tp = formatNumber(o.takeProfit, 5);
          return '<tr>' +
          '<td><code>' + (o.eaId || 'N/A') + '</code></td>' +
          '<td>' + (o.ticket ?? '-') + '</td>' +
          '<td><code>' + (o.symbol || '-') + '</code></td>' +
          '<td><span class="badge badge-secondary">' + o.type + '</span></td>' +
          '<td>' + formatNumber(o.volume, 2) + '</td>' +
          '<td>' + formatNumber(o.priceOpen, 5) + '</td>' +
          '<td>' + (o.timeOpen || '-') + '</td>' +
          '<td style="color:var(--text-muted)">' + (sl === '-' ? '-' : sl) + '</td>' +
          '<td style="color:var(--text-muted)">' + (tp === '-' ? '-' : tp) + '</td>' +
          '<td style="font-size:11px;color:var(--text-muted)">' + (o.reason || '-') + '</td>' +
          '</tr>';
        }).join('');
      }
    }
  }
  }
  
  // Deals (with "Received from" column)
  if(!liveOnly) {
  const dealBody = document.getElementById('propsDeals');
  if(dealBody) {
    if(!data.deals || data.deals.length === 0) {
      dealBody.innerHTML = '<tr><td colspan="14" style="text-align:center;color:var(--text-muted)">No deals</td></tr>';
    } else {
      dealBody.innerHTML = data.deals.map(d => {
        const brutValue = Number(d.profitBrut);
        const netValue = Number(d.profitNet);
        const brutColor = Number.isFinite(brutValue) ? (brutValue > 0 ? 'color:var(--success)' : brutValue < 0 ? 'color:var(--danger)' : 'color:var(--text-muted)') : 'color:var(--text-muted)';
        const netColor = Number.isFinite(netValue) ? (netValue > 0 ? 'color:var(--success)' : netValue < 0 ? 'color:var(--danger)' : 'color:var(--text-muted)') : 'color:var(--text-muted)';
        const sl = formatNumber(d.stopLoss, 5);
        const tp = formatNumber(d.takeProfit, 5);
        return '<tr>' +
        '<td><code>' + (d.eaId || 'N/A') + '</code></td>' +
        '<td>' + (d.ticket ?? '-') + '</td>' +
        '<td><code>' + (d.symbol || '-') + '</code></td>' +
        '<td><span class="badge ' + (d.type === 'Buy' ? 'badge-success' : 'badge-danger') + '">' + d.type + '</span></td>' +
        '<td>' + formatNumber(d.volume, 2) + '</td>' +
        '<td>' + formatNumber(d.priceOpen, 5) + '</td>' +
        '<td>' + (d.timeOpen || '-') + '</td>' +
        '<td style="color:var(--text-muted)">' + (sl === '-' ? '-' : sl) + '</td>' +
        '<td style="color:var(--text-muted)">' + (tp === '-' ? '-' : tp) + '</td>' +
        '<td>' + formatNumber(d.priceClose, 5) + '</td>' +
        '<td>' + (d.timeClose || '-') + '</td>' +
        '<td style="font-weight:600;' + brutColor + '">' + formatSignedNumber(d.profitBrut, 2) + '</td>' +
        '<td style="font-weight:600;' + netColor + '">' + formatSignedNumber(d.profitNet, 2) + '</td>' +
        '<td style="font-size:11px;color:var(--text-muted)">' + (d.reason || '-') + '</td>' +
        '</tr>';
      }).join('');
    }
  }
  
  // Deleted Orders (with "Received from" column)
  const delBody = document.getElementById('propsDeletedOrders');
  if(delBody) {
    if(!data.deletedOrders || data.deletedOrders.length === 0) {
      delBody.innerHTML = '<tr><td colspan="12" style="text-align:center;color:var(--text-muted)">No deleted orders</td></tr>';
    } else {
      delBody.innerHTML = data.deletedOrders.map(o => {
        const sl = formatNumber(o.stopLoss, 5);
        const tp = formatNumber(o.takeProfit, 5);
        return '<tr>' +
        '<td><code>' + (o.eaId || 'N/A') + '</code></td>' +
        '<td>' + (o.ticket ?? '-') + '</td>' +
        '<td><code>' + (o.symbol || '-') + '</code></td>' +
        '<td><span class="badge badge-secondary">' + o.type + '</span></td>' +
        '<td>' + formatNumber(o.volume, 2) + '</td>' +
        '<td>' + formatNumber(o.orderPrice, 5) + '</td>' +
        '<td>' + (o.orderTime || '-') + '</td>' +
        '<td style="color:var(--text-muted)">' + (sl === '-' ? '-' : sl) + '</td>' +
        '<td style="color:var(--text-muted)">' + (tp === '-' ? '-' : tp) + '</td>' +
        '<td>' + formatNumber(o.deletePrice, 5) + '</td>' +
        '<td>' + (o.deleteTime || '-') + '</td>' +
        '<td style="font-size:11px;color:var(--text-muted)">' + (o.reason || '-') + '</td>' +
        '</tr>';
      }).join('');
    }
  }
  }
}

// ========== HISTORY REQUEST FUNCTIONS ==========

let allHistoryLogs = []; // Store all logs
let filteredHistoryLogs = []; // Store filtered logs

// Load clear timestamp from localStorage (per user)
const userId = '${accountData.accountId}';
const clearTimestampKey = 'historyLogClearTime_' + userId;
let userClearTimestamp = parseInt(localStorage.getItem(clearTimestampKey) || '0', 10);

// Load activity logs from server
async function loadHistoryLogs() {
  try {
    const res = await fetch('/api/activity-logs?userId=' + userId);
    if(!res.ok) throw new Error('Failed to load logs');
    
    const data = await res.json();
    if(!data.ok) throw new Error(data.error || 'Unknown error');
    
    allHistoryLogs = data.logs || [];
    
    // Filter out logs before user's clear timestamp
    filteredHistoryLogs = allHistoryLogs.filter(log => new Date(log.timestamp).getTime() > userClearTimestamp);
    
    renderHistoryLogs();
  } catch(err) {
    console.error('[HISTORY] Failed to load logs:', err);
    showNotification('❌ Failed to load logs', 'error');
  }
}

// Render activity logs to the container
function renderHistoryLogs() {
  const container = document.getElementById('historyLogsContainer');
  if(!container) return;
  
  if(filteredHistoryLogs.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:40px">No logs available. Logs will appear here once EA activities are recorded.</div>';
    return;
  }
  
  // Render logs based on activity type
  container.innerHTML = filteredHistoryLogs.map(log => {
    const timestamp = new Date(log.timestamp).toLocaleString();
    let icon, logText, color;
    
    switch(log.type) {
      case 'ea_connected':
        icon = '🟢';
        color = 'var(--success)';
        logText = \`EA Connected: \${log.eaType.toUpperCase()} \${log.eaId} (Acc: \${log.accountNumber})\`;
        break;
        
      case 'ea_disconnected':
        icon = '🔴';
        color = 'var(--error)';
        logText = \`EA Disconnected: \${log.eaType.toUpperCase()} \${log.eaId} (Acc: \${log.accountNumber})\`;
        break;
        
      case 'settings_updated':
        icon = '⚙️';
        color = 'var(--warning)';
        logText = \`Settings Updated: \${log.eaType.toUpperCase()} \${log.eaId}\`;
        break;
        
      case 'warning':
        icon = '⚠️';
        color = 'var(--warning)';
        logText = \`Warning: \${log.warningMessage || 'Unknown'}\`;
        break;
        
      case 'trade_copied':
        icon = log.success ? '✅' : '❌';
        color = log.success ? 'var(--success)' : 'var(--error)';
        const action = (log.action || 'entry').toUpperCase();
        logText = \`[\${action}] \${log.controllerEAId} (Acc: \${log.controllerAccount}) #\${log.controllerTicket} → \${log.propEAId} (Acc: \${log.propAccount}) #\${log.propTicket}\`;
        break;
        
      default:
        icon = '📋';
        color = 'var(--text)';
        logText = \`Activity: \${log.type}\`;
    }
    
    return '<div style="padding:8px 12px;border-bottom:1px solid var(--border);display:flex;gap:12px;align-items:center">' +
           '<span style="color:var(--text-muted);font-size:11px;min-width:140px">' + timestamp + '</span>' +
           '<span style="font-size:14px">' + icon + '</span>' +
           '<span style="color:' + color + ';font-family:monospace;font-size:12px;flex:1">' + logText + '</span>' +
           '</div>';
  }).join('');
  
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

// Helper: Check if log matches search query
function matchesSearchQuery(log, query) {
  const timestamp = new Date(log.timestamp).toLocaleString().toLowerCase();
  const eaId = (log.eaId || log.controllerEAId || log.propEAId || '').toLowerCase();
  const accountNumber = (log.accountNumber || log.controllerAccount || log.propAccount || '').toLowerCase();
  const ctrlTicket = (log.controllerTicket || '').toString();
  const propTicket = (log.propTicket || '').toString();
  const type = (log.type || '').toLowerCase();
  const eaType = (log.eaType || '').toLowerCase();
  const action = (log.action || '').toLowerCase();
  const warning = (log.warningMessage || '').toLowerCase();
  
  return timestamp.includes(query) || 
         eaId.includes(query) || 
         accountNumber.includes(query) ||
         ctrlTicket.includes(query) || 
         propTicket.includes(query) || 
         type.includes(query) || 
         eaType.includes(query) ||
         action.includes(query) ||
         warning.includes(query);
}

// Filter logs based on search query (Activity Logs)
function filterHistoryLogs() {
  const searchBox = document.getElementById('historySearchBox');
  if(!searchBox) return;
  
  const query = searchBox.value.trim().toLowerCase();
  
  if(query === '') {
    // No filter, show all logs after clear timestamp
    filteredHistoryLogs = allHistoryLogs.filter(log => new Date(log.timestamp).getTime() > userClearTimestamp);
  } else {
    // Filter by query (search in all text fields)
    filteredHistoryLogs = allHistoryLogs.filter(log => {
      if(new Date(log.timestamp).getTime() <= userClearTimestamp) return false;
      return matchesSearchQuery(log, query);
    });
  }
  
  renderHistoryLogs();
}

// Clear logs from UI (user clears, but stays in DB)
async function clearHistoryLogs() {
  const confirmed = await showConfirm(
    '🗑️ Clear Activity Logs?',
    'Are you sure you want to clear all activity logs?'
  );
  
  if(!confirmed) return;
  
  try {
    // Use the userId defined at the top of this section
    const res = await fetch('/api/activity-logs/clear', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ userId })
    });
    
    if(!res.ok) throw new Error('Failed to clear logs');
    
    const data = await res.json();
    if(!data.ok) throw new Error(data.error || 'Unknown error');
    
    // Update clear timestamp - future logs after this will show
    userClearTimestamp = data.clearTimestamp || Date.now();
    
    // Save clear timestamp to localStorage (per user)
    localStorage.setItem(clearTimestampKey, userClearTimestamp.toString());
    
    // Filter out old logs
    filteredHistoryLogs = allHistoryLogs.filter(log => new Date(log.timestamp).getTime() > userClearTimestamp);
    
    renderHistoryLogs();
    showNotification('✅ Logs cleared from display', 'success');
  } catch(err) {
    console.error('[HISTORY] Failed to clear logs:', err);
    showNotification('❌ Failed to clear logs', 'error');
  }
}

// Helper: Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

</script>

<style>
/* Custom Notifications */
.custom-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  z-index: 10000;
  min-width: 300px;
  max-width: 500px;
  opacity: 0;
  transform: translateX(400px);
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}

.custom-notification.show {
  opacity: 1;
  transform: translateX(0);
}

.custom-notification.success {
  border-left: 4px solid var(--success);
}

.custom-notification.error {
  border-left: 4px solid var(--danger);
}

.custom-notification.warning {
  border-left: 4px solid var(--warning);
}

.custom-notification.info {
  border-left: 4px solid var(--primary);
}

.custom-notification .notif-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.custom-notification .notif-message {
  flex: 1;
  color: var(--text);
  font-size: 14px;
  line-height: 1.5;
}

.custom-notification .notif-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color 0.2s;
}

.custom-notification .notif-close:hover {
  color: var(--text);
}

/* Custom Confirm Dialog */
.custom-confirm {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.custom-confirm.show {
  opacity: 1;
}

.custom-confirm .confirm-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
}

.custom-confirm .confirm-dialog {
  position: relative;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  animation: slideDown 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}

@keyframes slideDown {
  from {
    transform: translateY(-50px) scale(0.9);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.custom-confirm .confirm-header {
  padding: 24px;
  border-bottom: 1px solid var(--border);
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

.custom-confirm .confirm-body {
  padding: 24px;
  color: var(--text-muted);
  line-height: 1.6;
  white-space: pre-line;
}

.custom-confirm .confirm-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>

</body></html>`;
};

