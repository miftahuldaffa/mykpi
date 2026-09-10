
/*=============================================
  AUTH.JS - Password Protection dari Google Sheets
  KPI Dashboard - Mondelez International
  
  Fitur:
  - Password diambil dari Google Sheets
  - WAJIB login setiap buka browser/tab (sessionStorage)
  - Tombol Logout di navbar
  - Support dark & light theme
  - Responsive (mobile friendly)
=============================================*/

const AUTH = {

  // ============== KONFIGURASI ==============

  // URL Google Sheets password
  SHEET_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSm4yRk_EJFy60oCN41JCs6nShf4XcI0vxhUmJy56xTrb-YR0sONOggFVBZafsSnHO1UuwcPosjSrwu/pub?output=csv",

  // Key untuk sessionStorage
  STORAGE_KEY: "kpi_auth_token",

  // ============== INTERNAL ==============

  _validHash: null,

  // ============== FUNGSI UTAMA ==============

  async fetchPassword() {
    try {
      const res = await fetch(this.SHEET_URL);
      const csv = await res.text();
      const rows = csv.trim().split("\n");

      if (rows.length >= 2) {
        const password = rows[1].replace(/"/g, "").trim();
        this._validHash = await this.sha256(password);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Gagal fetch password:", e);
      return false;
    }
  },

  isAuthenticated() {
    const token = sessionStorage.getItem(this.STORAGE_KEY);
    if (!token) return false;

    try {
      const data = JSON.parse(atob(token));
      return data.authenticated === true;
    } catch (e) {
      this.logout();
      return false;
    }
  },

  async login(password) {
    const inputHash = await this.sha256(password);

    if (inputHash === this._validHash) {
      const token = btoa(JSON.stringify({
        authenticated: true,
        login: new Date().toISOString()
      }));

      sessionStorage.setItem(this.STORAGE_KEY, token);
      return true;
    }
    return false;
  },

  logout() {
    sessionStorage.removeItem(this.STORAGE_KEY);
  },

  // ============== UTILITY ==============

  async sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  },

  // ============== UI: TOMBOL LOGOUT ==============

  addLogoutButton() {
    const navbar = document.querySelector(".nav-actions");
    if (!navbar) return;

    if (document.getElementById("btn-logout")) return;

    const logoutBtn = document.createElement("button");
    logoutBtn.id = "btn-logout";
    logoutBtn.className = "btn-logout";
    logoutBtn.innerHTML = `<span>🚪</span><span>Logout</span>`;
    logoutBtn.title = "Keluar dari dashboard";

    logoutBtn.addEventListener("click", () => {
      if (confirm("Yakin ingin logout?")) {
        AUTH.logout();
        location.reload();
      }
    });

    navbar.appendChild(logoutBtn);

    if (!document.getElementById("auth-logout-styles")) {
      const style = document.createElement("style");
      style.id = "auth-logout-styles";
      style.textContent = `
        .btn-logout {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: 1px solid rgba(255, 107, 107, 0.3);
          border-radius: 8px;
          background: rgba(255, 107, 107, 0.1);
          color: #ff6b6b;
          font-family: 'Poppins', sans-serif;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .btn-logout:hover {
          background: rgba(255, 107, 107, 0.2);
          border-color: rgba(255, 107, 107, 0.5);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 107, 107, 0.2);
        }
        .btn-logout:active {
          transform: translateY(0);
        }
        [data-theme="light"] .btn-logout {
          background: rgba(220, 53, 69, 0.08);
          border-color: rgba(220, 53, 69, 0.3);
          color: #dc3545;
        }
        [data-theme="light"] .btn-logout:hover {
          background: rgba(220, 53, 69, 0.15);
          border-color: rgba(220, 53, 69, 0.5);
        }
        @media (max-width: 768px) {
          .btn-logout span:last-child {
            display: none;
          }
          .btn-logout {
            padding: 8px 10px;
          }
        }
      `;
      document.head.appendChild(style);
    }
  },

  // ============== UI: LOGIN SCREEN ==============

  showLoginScreen() {
    document.body.style.visibility = "hidden";

    const overlay = document.createElement("div");
    overlay.id = "auth-overlay";
    overlay.innerHTML = `
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-logo">
            <img src="img/favicon.png" alt="Logo" onerror="this.style.display='none'">
          </div>
          <h2 class="auth-title">KPI Dashboard</h2>
          <p class="auth-subtitle">Mondelez International</p>
          <form id="auth-form">
            <div class="auth-input-group">
              <input 
                type="password" 
                id="auth-password" 
                placeholder="Masukkan password"
                autocomplete="current-password"
                required
              >
              <button type="button" id="auth-toggle-pw" class="auth-toggle-btn">
                👁️
              </button>
            </div>
            <div id="auth-error" class="auth-error"></div>
            <button type="submit" id="auth-submit" class="auth-btn">
              🔓 Masuk
            </button>
          </form>
          <p class="auth-footer">Hubungi admin jika lupa password</p>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const styles = document.createElement("style");
    styles.id = "auth-login-styles";
    styles.textContent = `
      #auth-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #1a0533 0%, #4A1A7A 50%, #2d1050 100%);
        visibility: visible !important;
      }
      .auth-container {
        width: 100%;
        max-width: 400px;
        padding: 20px;
      }
      .auth-card {
        background: rgba(255,255,255,0.05);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 20px;
        padding: 40px 30px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      }
      .auth-logo img {
        width: 64px;
        height: 64px;
        border-radius: 12px;
        margin-bottom: 16px;
      }
      .auth-title {
        color: #fff;
        font-family: 'Poppins', sans-serif;
        font-size: 1.5rem;
        margin: 0 0 4px 0;
      }
      .auth-subtitle {
        color: rgba(255,255,255,0.6);
        font-family: 'Poppins', sans-serif;
        font-size: 0.85rem;
        margin: 0 0 30px 0;
      }
      .auth-input-group {
        position: relative;
        margin-bottom: 16px;
      }
      #auth-password {
        width: 100%;
        padding: 14px 50px 14px 18px;
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 12px;
        background: rgba(255,255,255,0.08);
        color: #fff;
        font-size: 1rem;
        font-family: 'Poppins', sans-serif;
        outline: none;
        transition: border-color 0.3s, box-shadow 0.3s;
        box-sizing: border-box;
      }
      #auth-password:focus {
        border-color: rgba(255,255,255,0.5);
        box-shadow: 0 0 0 3px rgba(255,255,255,0.1);
      }
      #auth-password::placeholder {
        color: rgba(255,255,255,0.4);
      }
      .auth-toggle-btn {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.1rem;
        padding: 4px;
      }
      .auth-error {
        color: #ff6b6b;
        font-size: 0.8rem;
        font-family: 'Poppins', sans-serif;
        min-height: 20px;
        margin-bottom: 8px;
      }
      .auth-btn {
        width: 100%;
        padding: 14px;
        border: none;
        border-radius: 12px;
        background: linear-gradient(135deg, #7c3aed, #a855f7);
        color: #fff;
        font-size: 1rem;
        font-family: 'Poppins', sans-serif;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .auth-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(124,58,237,0.4);
      }
      .auth-btn:active { transform: translateY(0); }
      .auth-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }
      .auth-footer {
        color: rgba(255,255,255,0.4);
        font-size: 0.75rem;
        font-family: 'Poppins', sans-serif;
        margin-top: 20px;
      }
      .auth-shake { animation: shake 0.5s ease; }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-8px); }
        75% { transform: translateX(8px); }
      }
    `;
    document.head.appendChild(styles);

    // Event listeners
    const form = document.getElementById("auth-form");
    const passInput = document.getElementById("auth-password");
    const error = document.getElementById("auth-error");
    const toggle = document.getElementById("auth-toggle-pw");

    toggle.addEventListener("click", () => {
      passInput.type = passInput.type === "password" ? "text" : "password";
      toggle.textContent = passInput.type === "password" ? "👁️" : "🙈";
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("auth-submit");
      btn.disabled = true;
      btn.textContent = "⏳ Memverifikasi...";

      const success = await AUTH.login(passInput.value);

      if (success) {
        overlay.style.opacity = "0";
        overlay.style.transition = "opacity 0.3s ease";
        setTimeout(() => {
          overlay.remove();
          document.body.style.visibility = "visible";
          AUTH.addLogoutButton();
        }, 300);
      } else {
        error.textContent = "❌ Password salah!";
        passInput.classList.add("auth-shake");
        setTimeout(() => passInput.classList.remove("auth-shake"), 500);
        passInput.value = "";
        passInput.focus();
        btn.disabled = false;
        btn.textContent = "🔓 Masuk";
      }
    });

    setTimeout(() => passInput.focus(), 100);
  },

  // ============== INISIALISASI ==============

  async init() {
    if (this.isAuthenticated()) {
      this.addLogoutButton();
      return;
    }

    const loaded = await this.fetchPassword();
    if (!loaded) {
      alert("⚠️ Tidak dapat terhubung ke server. Periksa koneksi internet.");
      return;
    }

    this.showLoginScreen();
  }
};

// Auto-run
document.addEventListener("DOMContentLoaded", () => AUTH.init());