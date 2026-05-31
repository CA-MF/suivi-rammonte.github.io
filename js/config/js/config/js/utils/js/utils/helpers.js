// ========== FONCTIONS UTILITAIRES ==========
export function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  })[m]);
}

export function showToast(message, isError = false) {
  const oldToast = document.querySelector('.toast-confirm');
  if (oldToast) oldToast.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast-confirm';
  if (isError) toast.style.background = '#c0392b';
  toast.innerHTML = message || 'Note enregistrée';
  document.body.appendChild(toast);
  
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 2500);
}

export function showLoader(message, subMessage) {
  const existingLoader = document.querySelector('.loader-overlay');
  if (existingLoader) existingLoader.remove();
  const loader = document.createElement('div');
  loader.className = 'loader-overlay';
  loader.innerHTML = `
    <div class="loader-content">
      <div class="loader-spinner"></div>
      <div class="loader-text">${message || 'Chargement...'}</div>
      <div class="loader-subtext">${subMessage || 'Veuillez patienter'}</div>
    </div>
  `;
  document.body.appendChild(loader);
}

export function hideLoader() {
  const loader = document.querySelector('.loader-overlay');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => { if (loader.parentNode) loader.remove(); }, 300);
  }
}

export function getCommissionLabel(commission) {
  if (commission === 'PF') return 'PF - Accès complet';
  if (commission === 'CIPS') return 'CIPS - Pédagogique';
  if (commission === 'CA') return 'CA - Administrative';
  return 'Non définie';
}

export function getWeekNumber(d) {
  const copy = new Date(d);
  copy.setHours(0,0,0,0);
  copy.setDate(copy.getDate() + 3 - (copy.getDay() + 6) % 7);
  const week1 = new Date(copy.getFullYear(), 0, 4);
  return 1 + Math.round(((copy - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

export function getWeekendDatesFromDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  const day = date.getDay();
  let saturday = new Date(date);
  if (day === 0) saturday.setDate(date.getDate() - 1);
  else if (day !== 6) saturday.setDate(date.getDate() - (day + 1) % 7);
  let sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);
  return [saturday.toISOString().split('T')[0], sunday.toISOString().split('T')[0]];
}

export function canAccess(module, currentUser) {
  if (!currentUser) return false;
  const commission = currentUser.commission || 'PF';
  if (commission === 'PF') return true;
  if (module === 'read') return true;
  if (commission === 'CIPS' && module === 'CIPS') return true;
  if (commission === 'CA' && module === 'CA') return true;
  return false;
}

export function canEdit(module, currentUser) {
  if (!currentUser) return false;
  if (currentUser.role === 'superadmin') return true;
  const commission = currentUser.commission || 'PF';
  if (commission === 'PF') return true;
  if (commission === 'CA' && (module === 'CA' || module === 'users')) return true;
  if (commission === 'CIPS' && module === 'CIPS') return true;
  return false;
}
