/*  index.js  ▸  handles beforeinstallprompt & update status  */
let deferredPrompt;
const installBtn = document.getElementById('installApp');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();            // stop Chrome’s mini‑info‑bar
  deferredPrompt = e;
  installBtn?.classList.remove('hidden');
});

installBtn?.addEventListener('click', async () => {
  /* installation */
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] install:', outcome);
    deferredPrompt = null;
  }

  /* update check */
  if (typeof window.__checkForPwaUpdate === 'function') {
    const status = await window.__checkForPwaUpdate();
    if (status === 'up‑to‑date') alert('App installed and up to date');
  }
});
