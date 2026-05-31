import { db } from '../config/firebase-config.js';
import { createDocument } from '../data/firestore.js';
import { currentUser } from '../utils/constants.js';
import { showLoader, hideLoader } from '../utils/helpers.js';

export function getCurrentUserInfo() {
  if (!currentUser || !currentUser.uid) {
    return { 
      uid: 'unknown', 
      name: 'Inconnu', 
      commission: '?',
      email: 'unknown@rammonte.sn',
      timestamp: new Date().toISOString()
    };
  }
  return {
    uid: currentUser.uid,
    name: currentUser.name || currentUser.email?.split('@')[0] || 'Utilisateur',
    commission: currentUser.commission || 'PF',
    email: currentUser.email || '',
    role: currentUser.role || 'teacher',
    timestamp: new Date().toISOString()
  };
}

export async function addAuditLog(action, targetType, targetId, details = {}) {
  if (!db) return;
  
  const user = getCurrentUserInfo();
  const logId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  await createDocument('audit_logs', logId, {
    id: logId,
    action, targetType, targetId,
    userId: user.uid, userName: user.name,
    userCommission: user.commission, userEmail: user.email,
    timestamp: user.timestamp,
    details
  });
}

export function compareObjects(oldObj, newObj) {
  const changes = {};
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
  
  for (const key of allKeys) {
    if (key === 'updatedAt' || key === 'updatedBy' || key === 'updatedByName') continue;
    if (JSON.stringify(oldObj?.[key]) !== JSON.stringify(newObj?.[key])) {
      changes[key] = { from: oldObj?.[key], to: newObj?.[key] };
    }
  }
  return changes;
}

export async function showAuditHistory(targetType, targetId, targetName) {
  if (!db) {
    Swal.fire('Erreur', 'Base de données non disponible', 'error');
    return;
  }
  
  showLoader('Chargement de l\'historique...', '');
  
  try {
    const logsRef = collection(db, "audit_logs");
    const snapshot = await getDocs(logsRef);
    
    let logs = [];
    snapshot.forEach(doc => {
      if (doc.id === '_placeholder') return;
      const data = doc.data();
      if (data.targetType === targetType && data.targetId === targetId) {
        logs.push(data);
      }
    });
    
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (logs.length === 0) {
      hideLoader();
      Swal.fire('Historique', `Aucune modification pour ${targetName}`, 'info');
      return;
    }
    
    let html = `<div style="max-height:400px; overflow-y:auto;">
      <p><strong>${targetName}</strong> - ${logs.length} modification(s)</p>
      <table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead><tr style="background:var(--green-pale);">
          <th style="padding:8px;">Date</th><th style="padding:8px;">Action</th>
          <th style="padding:8px;">Utilisateur</th><th style="padding:8px;">Commission</th>
        <tr></thead><tbody>`;
    
    logs.forEach(log => {
      const date = new Date(log.timestamp).toLocaleString('fr-FR');
      const actionIcon = log.action === 'CREATE' ? '➕' : (log.action === 'UPDATE' ? '✏️' : '🗑️');
      const commissionBadge = log.userCommission === 'PF' ? 'bg' : (log.userCommission === 'CIPS' ? 'ba' : (log.userCommission === 'CA' ? 'bb' : 'bgr'));
      
      html += `<tr style="border-bottom:1px solid #eee;">
        <td style="padding:6px;">${date}</td>
        <td style="padding:6px;">${actionIcon} ${log.action}</td>
        <td style="padding:6px;">${escapeHtml(log.userName)}</td>
        <td style="padding:6px;"><span class="badge ${commissionBadge}">${log.userCommission}</span></td>
      </tr>`;
      
      if (Object.keys(log.details).length > 0) {
        html += `<tr><td colspan="4" style="padding:4px 6px 12px 24px; font-size:11px; color:var(--text-muted);">
          📝 ${JSON.stringify(log.details).substring(0, 200)}
        </td></tr>`;
      }
    });
    
    html += `</tbody></table></div>`;
    hideLoader();
    Swal.fire({ title: '📜 Historique', html: html, width: '700px', confirmButtonText: 'Fermer' });
    
  } catch(e) {
    hideLoader();
    console.error(e);
    Swal.fire('Erreur', 'Impossible de charger l\'historique', 'error');
  }
}
