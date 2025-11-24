/* Admin Dashboard JavaScript - HeptaPower */

// Set current year in footer
document.getElementById('currentYear').textContent = new Date().getFullYear();

// ========== Confirm Modal ==========
function showConfirm(title, message, onConfirm) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  document.getElementById('confirmModal').classList.add('show');
  
  const confirmBtn = document.getElementById('confirmYes');
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
  
  newBtn.onclick = () => {
    hideConfirm();
    onConfirm();
  };
}

function hideConfirm() {
  document.getElementById('confirmModal').classList.remove('show');
}

// ========== Notification System ==========
function showNotification(type, title, message) {
  const notif = document.getElementById('notification');
  const icons = { success: '✓', error: '✕', warning: '⚠' };

  notif.className = 'notification show ' + type;
  notif.innerHTML =
    '<div class="notification-icon">' + icons[type] + '</div>' +
    '<div class="notification-content">' +
    '<div class="notification-title">' + title + '</div>' +
    '<div class="notification-message">' + message + '</div>' +
    '</div>' +
    '<div class="notification-close" onclick="hideNotification()">×</div>';

  setTimeout(hideNotification, 5000);
}

function hideNotification() {
  document.getElementById('notification').classList.remove('show');
}

// ========== Theme Management ==========
function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
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

// ========== Tab Management ==========
function showTab(tab) {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById(tab).classList.add('active');
  if (tab === 'accounts') loadAccounts();
}

// ========== Account Generation ==========
function generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  document.getElementById('newId').value = id;
}

function generateUsername() {
  const adjectives = ['swift', 'bold', 'bright', 'quick', 'smart', 'cool', 'fast', 'pro'];
  const nouns = ['trader', 'master', 'expert', 'hawk', 'wolf', 'eagle', 'lion', 'tiger'];
  const user =
    adjectives[Math.floor(Math.random() * adjectives.length)] +
    nouns[Math.floor(Math.random() * nouns.length)] +
    Math.floor(Math.random() * 100);
  document.getElementById('newUsername').value = user;
}

function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let pwd = '';
  for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  document.getElementById('newPassword').value = pwd;
}

function clearForm() {
  document.getElementById('createForm').reset();
}

// ========== Account Management ==========
async function loadAccounts() {
  try {
    const res = await fetch('/admin/api/accounts');
    const data = await res.json();
    const tbody = document.getElementById('accountsList');

    if (!data.accounts || data.accounts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94a3b8">No accounts yet</td></tr>';
      return;
    }

    tbody.innerHTML = data.accounts
      .map(
        acc =>
          '<tr>' +
          '<td><input type="checkbox" class="account-check" value="' + acc.id + '"></td>' +
          '<td><code>' + acc.id + '</code></td>' +
          '<td>' + acc.username + '</td>' +
          '<td><code>' + acc.password + '</code></td>' +
          '<td><span class="badge badge-' +
          (acc.active ? 'active' : 'blocked') +
          '">' +
          (acc.active ? 'Active' : 'Blocked') +
          '</span></td>' +
          '<td>' + new Date(acc.createdAt).toLocaleString() + '</td>' +
          '<td class="actions">' +
          '<button class="btn btn-secondary" onclick="editAccount(\'' + acc.id + '\')">Edit</button>' +
          '<button class="btn ' +
          (acc.active ? 'btn-warning' : 'btn-success') +
          '" onclick="toggleBlock(\'' + acc.id + '\')">' +
          (acc.active ? 'Block' : 'Unblock') +
          '</button>' +
          '<button class="btn btn-danger" onclick="removeAccount(\'' + acc.id + '\')">Remove</button>' +
          '</td>' +
          '</tr>'
      )
      .join('');

    document.getElementById('selectAll').checked = false;
  } catch (err) {
    console.error(err);
  }
}

function toggleSelectAll() {
  const checked = document.getElementById('selectAll').checked;
  document.querySelectorAll('.account-check').forEach(cb => (cb.checked = checked));
}

async function bulkAction(action) {
  const selected = Array.from(document.querySelectorAll('.account-check:checked')).map(cb => cb.value);
  if (selected.length === 0) {
    showNotification('warning', 'No Selection', 'Please select at least one account');
    return;
  }

  const actions = { block: 'Block', unblock: 'Unblock', remove: 'Remove' };
  
  showConfirm(
    'Confirm Bulk Action',
    'Are you sure you want to ' + actions[action].toLowerCase() + ' ' + selected.length + ' account(s)?',
    async () => {
      for (const id of selected) {
        if (action === 'remove') {
          await fetch('/admin/api/accounts/' + id, { method: 'DELETE' });
        } else {
          const shouldBlock = action === 'block';
          await fetch('/admin/api/accounts/' + id + '/setactive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: !shouldBlock })
          });
        }
      }
      
      showNotification('success', 'Bulk Action Complete', actions[action] + ' completed for ' + selected.length + ' account(s)');
      loadAccounts();
    }
  );
}

// ========== Create Account ==========
document.getElementById('createForm').onsubmit = async e => {
  e.preventDefault();

  let id = document.getElementById('newId').value.trim().toUpperCase();
  let username = document.getElementById('newUsername').value.trim().toLowerCase();
  let password = document.getElementById('newPassword').value.trim();

  // Auto-generate if empty
  if (!id) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    id = '';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  }

  if (!username) {
    const adjectives = ['swift', 'bold', 'bright', 'quick', 'smart'];
    const nouns = ['trader', 'master', 'expert', 'hawk', 'wolf'];
    username =
      adjectives[Math.floor(Math.random() * adjectives.length)] +
      nouns[Math.floor(Math.random() * nouns.length)] +
      Math.floor(Math.random() * 100);
  }

  if (!password) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
    password = '';
    for (let i = 0; i < 12; i++) password += chars[Math.floor(Math.random() * chars.length)];
  }

  try {
    const res = await fetch('/admin/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, username, password })
    });
    const data = await res.json();

    if (data.ok) {
      showNotification('success', 'Account Created', 'ID: ' + id + ' | Username: ' + username);
      clearForm();
      document.querySelector('.tabs button[onclick*="accounts"]').click();
      setTimeout(() => loadAccounts(), 100);
    } else {
      showNotification('error', 'Creation Failed', data.error);
    }
  } catch (err) {
    showNotification('error', 'Connection Error', 'Failed to connect to server');
  }
};

// ========== Edit Account ==========
async function editAccount(id) {
  try {
    const res = await fetch('/admin/api/accounts');
    const data = await res.json();
    const acc = data.accounts.find(a => a.id === id);
    if (!acc) {
      showNotification('error', 'Not Found', 'Account not found');
      return;
    }

    document.getElementById('editId').value = acc.id;
    document.getElementById('editUsername').value = acc.username;
    document.getElementById('editPassword').value = '';
    document.getElementById('editModal').classList.add('show');
  } catch (err) {
    showNotification('error', 'Load Error', 'Failed to load account details');
  }
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('show');
}

async function saveEdit() {
  const id = document.getElementById('editId').value;
  const username = document.getElementById('editUsername').value.trim().toLowerCase();
  const password = document.getElementById('editPassword').value.trim();

  if (!username) {
    showNotification('warning', 'Validation Error', 'Username is required');
    return;
  }

  try {
    const res = await fetch('/admin/api/accounts/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: password || undefined })
    });
    const data = await res.json();

    if (data.ok) {
      showNotification('success', 'Account Updated', 'Changes saved successfully');
      closeEditModal();
      loadAccounts();
    } else {
      showNotification('error', 'Update Failed', data.error);
    }
  } catch (err) {
    showNotification('error', 'Connection Error', 'Failed to connect to server');
  }
}

// ========== Toggle Block/Unblock ==========
async function toggleBlock(id) {
  showConfirm(
    'Confirm Status Change',
    'Are you sure you want to change the status of this account?',
    async () => {
      try {
        const res = await fetch('/admin/api/accounts/' + id + '/toggle', { method: 'POST' });
        const data = await res.json();
        if (data.ok) {
          showNotification('success', 'Status Updated', 'Account status changed successfully');
          loadAccounts();
        } else {
          showNotification('error', 'Update Failed', data.error);
        }
      } catch (err) {
        showNotification('error', 'Connection Error', 'Failed to connect to server');
      }
    }
  );
}

// ========== Remove Account ==========
async function removeAccount(id) {
  showConfirm(
    'Delete Account',
    '⚠️ Are you sure you want to DELETE this account? This action cannot be undone!',
    async () => {
      try {
        const res = await fetch('/admin/api/accounts/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
          showNotification('success', 'Account Deleted', 'Account removed successfully');
          loadAccounts();
        } else {
          showNotification('error', 'Delete Failed', data.error);
        }
      } catch (err) {
        showNotification('error', 'Connection Error', 'Failed to connect to server');
      }
    }
  );
}

// ========== Logout ==========
function logout() {
  localStorage.removeItem('adminToken');
  window.location.href = '/admin/logout';  // Server-side logout to destroy session
}

// ========== Prevent cached page after logout ==========
window.addEventListener('pageshow', function(event) {
  if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
    // Page was loaded from cache (back button)
    // Force reload to verify session
    window.location.reload();
  }
});

// ========== Initialize ==========
initTheme();
loadAccounts();

