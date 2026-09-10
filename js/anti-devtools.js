
/*=============================================
  ANTI-DEVTOOLS.JS
  KPI Dashboard - Mondelez International
  
  Proteksi:
  - Disable View Source (Ctrl+U)
  - Deteksi DevTools terbuka → redirect/block (hanya desktop)
  - Console warning message
=============================================*/

const ANTI_DEV = {

  // ============== KONFIGURASI ==============

  REDIRECT_URL: "",
  BLOCK_MESSAGE: "⚠️ Akses tidak diizinkan. DevTools terdeteksi.",

  // ============== INISIALISASI ==============

  init() {
    this.disableViewSource();
    // Deteksi DevTools hanya di desktop (di mobile sering false positive)
    if (!this.isMobile()) {
      this.detectDevTools();
    }
    this.consoleWarning();
  },

  // ============== CEK MOBILE ==============

  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (window.innerWidth <= 768 && 'ontouchstart' in window);
  },

  // ============== 1. DISABLE VIEW SOURCE (Ctrl+U) ==============

  disableViewSource() {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "u") {
        e.preventDefault();
        return false;
      }
    });
  },

  // ============== 2. DETEKSI DEVTOOLS TERBUKA (DESKTOP ONLY) ==============

  detectDevTools() {
    const threshold = 160;

    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;

      if (widthThreshold || heightThreshold) {
        this.onDevToolsOpen();
      }
    };

    setInterval(checkDevTools, 1000);

    const detectDebugger = () => {
      const start = performance.now();
      debugger;
      const end = performance.now();

      if (end - start > 100) {
        this.onDevToolsOpen();
      }
    };

    setInterval(detectDebugger, 3000);
  },

  // Aksi saat DevTools terdeteksi
  onDevToolsOpen() {
    if (this.REDIRECT_URL) {
      window.location.href = this.REDIRECT_URL;
    } else {
      document.body.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: linear-gradient(135deg, #1a0533, #4A1A7A);
          color: white;
          font-family: 'Poppins', sans-serif;
          text-align: center;
          padding: 20px;
        ">
          <div>
            <h1 style="font-size: 3rem; margin-bottom: 10px;">🚫</h1>
            <h2 style="margin-bottom: 10px;">${this.BLOCK_MESSAGE}</h2>
            <p style="opacity: 0.6; font-size: 0.9rem;">Tutup Developer Tools untuk melanjutkan.</p>
            <button onclick="location.reload()" style="
              margin-top: 20px;
              padding: 12px 24px;
              border: 1px solid rgba(255,255,255,0.3);
              border-radius: 8px;
              background: rgba(255,255,255,0.1);
              color: white;
              font-size: 0.9rem;
              cursor: pointer;
            ">🔄 Refresh Halaman</button>
          </div>
        </div>
      `;
    }
  },

  // ============== 3. CONSOLE WARNING ==============

  consoleWarning() {
    const warningStyle = "color: red; font-size: 2rem; font-weight: bold;";
    const textStyle = "color: white; font-size: 1rem;";

    console.log("%c⚠️ PERINGATAN!", warningStyle);
    console.log("%cArea ini hanya untuk developer. Jika seseorang menyuruh kamu paste sesuatu di sini, itu adalah penipuan.", textStyle);
    console.log("%cMenutup tab ini sekarang adalah langkah yang aman.", textStyle);
  }
};

// Auto-run
document.addEventListener("DOMContentLoaded", () => ANTI_DEV.init());