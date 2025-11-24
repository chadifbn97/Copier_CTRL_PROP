// User Login Page Component (for EA Accounts)
module.exports = function() {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Login - HeptaPower Live Panel</title>
<link rel="stylesheet" href="/public/css/admin-login.css">
</head><body>
<div class="login-card">
  <div class="logo">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  </div>
  <h1>Live Panel</h1>
  <p>HeptaPower Master Controller</p>
  <div class="error" id="error"></div>
  <form id="loginForm">
    <div class="form-group">
      <label>Username</label>
      <input type="text" id="username" required autocomplete="username" placeholder="Username" style="text-transform:lowercase" oninput="this.value=this.value.toLowerCase()">
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" id="password" required autocomplete="current-password" placeholder="Password">
    </div>
    <button type="submit" class="btn">Access Live Panel</button>
    <p style="text-align:center;margin-top:20px;font-size:13px">
      <a href="/admin" style="color:rgba(255,255,255,0.5);text-decoration:none">Admin Login →</a>
    </p>
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
    const res = await fetch('/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username, password})
    });
    const data = await res.json();
    
    if(data.ok) {
      localStorage.setItem('userToken', data.token);
      localStorage.setItem('accountId', data.accountId);
      localStorage.setItem('username', data.username);
      window.location.href = '/dashboard';  // Session-based, no ID in URL
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

