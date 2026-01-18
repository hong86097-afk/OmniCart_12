/* ui.js - small UI helpers for a more professional feel ✨
   - Toast notifications (success/error/info)
   - Loading state for buttons
   - fetchJSON wrapper with friendly errors
*/

(function () {
  const TOAST_THEMES = [
    "text-bg-success",
    "text-bg-danger",
    "text-bg-warning",
    "text-bg-info",
    "text-bg-dark",
    "text-dark",
  ];

  function toast(message, type = "success") {
    const el = document.getElementById("appToast");
    const body = document.getElementById("appToastBody");

    // If toast isn't available for some reason, just log.
    if (!el || !window.bootstrap) {
      console.log(`[${type}]`, message);
      return;
    }

    if (body) body.textContent = message;

    el.classList.remove(...TOAST_THEMES);

    const theme =
      type === "success" ? "text-bg-success" :
      type === "error" ? "text-bg-danger" :
      type === "warning" ? "text-bg-warning" :
      type === "info" ? "text-bg-info" :
      "text-bg-dark";

    el.classList.add(theme);
    if (theme === "text-bg-warning") el.classList.add("text-dark");

    const t = window.bootstrap.Toast.getOrCreateInstance(el, { delay: 2600 });
    t.show();
  }

  function setBtnLoading(btn, loading, loadingLabel = "Loading...") {
    if (!btn) return;

    if (loading) {
      if (!btn.dataset._oldHtml) btn.dataset._oldHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML =
        `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>` +
        loadingLabel;
      return;
    }

    btn.disabled = false;
    if (btn.dataset._oldHtml) {
      btn.innerHTML = btn.dataset._oldHtml;
      delete btn.dataset._oldHtml;
    }
  }

  async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);

    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }

    if (!res.ok) {
      const msg = data && (data.error || data.message)
        ? (data.error || data.message)
        : `Request failed (${res.status})`;
      throw new Error(msg);
    }

    return data;
  }

  window.ui = { toast, setBtnLoading, fetchJSON };
})();
