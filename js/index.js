import { auth } from './firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

function showAlert(msg) {
  const modal = document.getElementById('alert-modal');
  const msgEl = document.getElementById('alert-msg');
  if (modal && msgEl) {
    msgEl.textContent = msg;
    modal.classList.remove('hidden');
  } else {
    alert(msg);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btnCloseAlert = document.getElementById('btn-close-alert');
  if (btnCloseAlert) {
    btnCloseAlert.addEventListener('click', () => {
      document.getElementById('alert-modal').classList.add('hidden');
    });
  }

  // Email 密碼登入
  const btnEmailLogin = document.getElementById('btn-email-login');
  if (btnEmailLogin) {
    btnEmailLogin.addEventListener('click', async () => {
      const email = document.getElementById('email-input').value.trim();
      const password = document.getElementById('password-input').value;

      if (!email || !password) {
        showAlert('請輸入電子郵件與密碼');
        return;
      }

      try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = 'athletes.html';
      } catch (err) {
        showAlert('登入失敗：' + err.message);
      }
    });
  }

  // Google 帳戶快捷登入
  const btnGoogleLogin = document.getElementById('btn-google-login');
  if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener('click', async () => {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
        window.location.href = 'athletes.html';
      } catch (err) {
        showAlert('Google 登入失敗：' + err.message);
      }
    });
  }
});
