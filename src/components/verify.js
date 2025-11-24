// 2FA Verification Page Component
module.exports = function() {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>2FA Verification - HeptaPower</title>
<link rel="stylesheet" href="/public/css/admin-login.css">
</head><body>
<div class="login-card">
  <div class="logo">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  </div>
  <h1>2FA Verification</h1>
  <p>Enter your authenticator code</p>
  <div class="error" id="error"></div>
  <form id="verifyForm">
    <div class="form-group">
      <label>6-Digit Code</label>
      <input type="text" id="totp" required pattern="[0-9]{6}" maxlength="6" placeholder="000000" autocomplete="one-time-code" autofocus style="text-align:center;font-size:24px;letter-spacing:8px;font-weight:700">
      <p style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:8px;text-align:center">Enter the code from your Google Authenticator app</p>
    </div>
    <button type="submit" class="btn">Verify & Access</button>
    <button type="button" class="btn" onclick="goBack()" style="background:rgba(255,255,255,0.1);margin-top:12px;box-shadow:none">← Back to Login</button>
  </form>
</div>
<script>
// Check if we have temp token
if(!sessionStorage.getItem('tempToken')) {
  window.location.href = '/admin';
}

document.getElementById('verifyForm').onsubmit = async (e) => {
  e.preventDefault();
  const error = document.getElementById('error');
  error.style.display = 'none';
  
  const totp = document.getElementById('totp').value;
  const tempToken = sessionStorage.getItem('tempToken');
  
  try {
    const res = await fetch('/admin/verify-2fa', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({tempToken, totp})
    });
    const data = await res.json();
    
    if(data.ok) {
      sessionStorage.removeItem('tempToken');
      localStorage.setItem('adminToken', data.token);
      window.location.href = '/admin/dashboard';
    } else {
      error.textContent = data.error || 'Invalid code';
      error.style.display = 'block';
      document.getElementById('totp').value = '';
      document.getElementById('totp').focus();
    }
  } catch(err) {
    error.textContent = 'Connection error';
    error.style.display = 'block';
  }
};

function goBack() {
  sessionStorage.removeItem('tempToken');
  window.location.href = '/admin';
}

// Auto-focus on code input
document.getElementById('totp').focus();
</script>
</body></html>`;
};

