// Login Page Component
module.exports = function() {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Admin Login - HeptaPower</title>
<link rel="stylesheet" href="/public/css/admin-login.css">
</head><body>
<div class="login-card">
  <div class="logo">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  </div>
  <h1>Admin Portal</h1>
  <p>HeptaPower Master Controller</p>
  <div class="error" id="error"></div>
  <form id="loginForm">
    <div class="form-group">
      <label>Username</label>
      <input type="text" id="username" required autocomplete="username" placeholder="Username">
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" id="password" required autocomplete="current-password" placeholder="Password">
    </div>
    <button type="submit" class="btn">Continue</button>
  </form>
</div>
<script>
document.getElementById('loginForm').onsubmit = async (e) => {
  e.preventDefault();
  const error = document.getElementById('error');
  error.style.display = 'none';
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  try {
    const res = await fetch('/admin/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username, password})
    });
    const data = await res.json();
    
    if(data.ok) {
      if(data.require2FA) {
        // Store temp token and redirect to 2FA page
        sessionStorage.setItem('tempToken', data.tempToken);
        window.location.href = '/admin/verify';
      } else {
        // No 2FA, direct access
        localStorage.setItem('adminToken', data.token);
        window.location.href = '/admin/dashboard';
      }
    } else {
      error.textContent = data.error || 'Invalid credentials';
      error.style.display = 'block';
    }
  } catch(err) {
    error.textContent = 'Connection error';
    error.style.display = 'block';
  }
};
</script>
</body></html>`;
};

