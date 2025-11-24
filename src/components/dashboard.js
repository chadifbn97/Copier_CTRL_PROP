// Dashboard Page Component
module.exports = function(serverInfo) {
  return `<!doctype html>
<html data-theme="dark"><head><meta charset="utf-8"><title>Admin Dashboard - HeptaPower</title>
<link rel="stylesheet" href="/public/css/admin-dashboard.css">
</head><body>
<div id="notification" class="notification"></div>
<div class="navbar">
  <h1>Admin Dashboard</h1>
  <div class="user">
    <button class="theme-toggle" onclick="toggleTheme()" title="Toggle theme"></button>
    <button onclick="logout()">Sign Out</button>
  </div>
</div>
<div class="container">
  <div class="tabs">
    <button class="active" onclick="showTab('accounts')">📋 Accounts</button>
    <button onclick="showTab('create')">➕ Create Account</button>
    <button onclick="showTab('logs')">📊 Logs</button>
  </div>

  <div class="tab-content active" id="accounts">
    <div class="card">
      <h2>Manage Accounts</h2>
      <div class="bulk-actions">
        <input type="checkbox" id="selectAll" onchange="toggleSelectAll()">
        <label for="selectAll" style="margin:0;cursor:pointer">Select All</label>
        <button class="btn btn-success" onclick="bulkAction('unblock')" style="margin-left:auto">Unblock Selected</button>
        <button class="btn btn-warning" onclick="bulkAction('block')">Block Selected</button>
        <button class="btn btn-danger" onclick="bulkAction('remove')">Remove Selected</button>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:40px"></th>
            <th>ID</th>
            <th>Username</th>
            <th>Password</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="accountsList">
          <tr>
            <td colspan="7" style="text-align:center;color:#94a3b8">No accounts yet</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  
  <!-- Edit Modal -->
  <div class="modal" id="editModal">
    <div class="modal-content">
      <h3>Edit Account</h3>
      <div class="form-group">
        <label>ID (readonly)</label>
        <input type="text" id="editId" disabled>
      </div>
      <div class="form-group">
        <label>Username</label>
        <input type="text" id="editUsername" style="text-transform:lowercase" oninput="this.value=this.value.toLowerCase()">
      </div>
      <div class="form-group">
        <label>New Password (leave empty to keep current)</label>
        <input type="text" id="editPassword" placeholder="Leave empty to keep current">
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="saveEdit()">Save</button>
        <button class="btn btn-secondary" onclick="closeEditModal()">Cancel</button>
      </div>
    </div>
  </div>
  
  <!-- Confirm Modal -->
  <div class="modal confirm-modal" id="confirmModal">
    <div class="modal-content">
      <div class="confirm-icon">⚠️</div>
      <h3 id="confirmTitle">Confirm Action</h3>
      <p id="confirmMessage">Are you sure?</p>
      <div class="btn-group">
        <button class="btn btn-danger" id="confirmYes">Confirm</button>
        <button class="btn btn-secondary" onclick="hideConfirm()">Cancel</button>
      </div>
    </div>
  </div>

  <div class="tab-content" id="create">
    <div class="card">
      <h2>Create New Account</h2>
      <form id="createForm">
        <div class="form-row">
          <div class="form-group">
            <label>Account ID</label>
            <input type="text" id="newId" placeholder="Leave empty to auto-generate" maxlength="6" style="text-transform:uppercase" oninput="this.value=this.value.toUpperCase()">
            <button type="button" class="generate-btn" onclick="generateId()">🎲 Generate</button>
          </div>
          <div class="form-group">
            <label>Username</label>
            <input type="text" id="newUsername" placeholder="Leave empty to auto-generate" style="text-transform:lowercase" oninput="this.value=this.value.toLowerCase()">
            <button type="button" class="generate-btn" onclick="generateUsername()">🎲 Generate</button>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="text" id="newPassword" placeholder="Leave empty to auto-generate">
            <button type="button" class="generate-btn" onclick="generatePassword()">🎲 Generate</button>
          </div>
        </div>
        <div class="btn-group">
          <button type="submit" class="btn btn-primary">Create Account</button>
          <button type="button" class="btn btn-secondary" onclick="clearForm()">Clear</button>
        </div>
      </form>
    </div>
  </div>

  <div class="tab-content" id="logs">
    <div class="card">
      <h2>System Logs</h2>
      <div style="background:var(--hover);padding:16px;border-radius:8px;font-family:monospace;font-size:13px">
        <div>🟢 Server started on port ${serverInfo.httpPort}</div>
        <div>🟢 TCP broker listening on ${serverInfo.tcpPort}</div>
        <div>🔐 HMAC authentication: ${serverInfo.hmacEnabled?'ENABLED':'DISABLED'}</div>
        <div>🔐 2FA authentication: ${serverInfo.require2FA?'ENABLED':'DISABLED'}</div>
      </div>
    </div>
  </div>
</div>

<div class="footer">
  <div class="footer-text">
    Created by <span class="footer-brand">HeptaPower</span> © <span id="currentYear"></span> - All Rights Reserved
  </div>
</div>

<script src="/public/js/admin-dashboard.js"></script>
</body></html>`;
};

