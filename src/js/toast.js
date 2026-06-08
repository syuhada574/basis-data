import './supabase.js';

function getToastRoot() {
  let el = document.getElementById('toast-root');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-root';
    el.style.position = 'fixed';
    el.style.right = '16px';
    el.style.bottom = '16px';
    el.style.zIndex = '10000';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.gap = '10px';
    document.body.appendChild(el);
  }
  return el;
}

function toast(message, type = 'success', timeoutMs = 3000) {
  const root = getToastRoot();

  const node = document.createElement('div');
  node.textContent = message;
  node.style.background = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
  node.style.color = 'white';
  node.style.padding = '12px 14px';
  node.style.borderRadius = '12px';
  node.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';
  node.style.maxWidth = '360px';
  node.style.fontWeight = '600';
  node.style.transform = 'translateY(10px)';
  node.style.opacity = '0';
  node.style.transition = 'all 180ms ease';

  root.appendChild(node);

  requestAnimationFrame(() => {
    node.style.transform = 'translateY(0)';
    node.style.opacity = '1';
  });

  window.setTimeout(() => {
    node.style.opacity = '0';
    node.style.transform = 'translateY(10px)';
    window.setTimeout(() => node.remove(), 220);
  }, timeoutMs);
}

function showLoading(containerEl, text = 'Loading...') {
  if (!containerEl) return null;
  const existing = containerEl.querySelector('[data-loading]');
  if (existing) return existing;

  const node = document.createElement('div');
  node.dataset.loading = 'true';
  node.textContent = text;
  node.style.padding = '2rem';
  node.style.textAlign = 'center';
  node.style.color = '#6b7280';
  node.className = 'loading';
  containerEl.appendChild(node);
  return node;
}

function removeLoading(containerEl) {
  if (!containerEl) return;
  const existing = containerEl.querySelector('[data-loading]');
  existing?.remove();
}

export const Toast = {
  success: (msg) => toast(msg, 'success'),
  error: (msg) => toast(msg, 'error'),
  info: (msg) => toast(msg, 'info'),
  toast,
  showLoading,
  removeLoading,
};

