import { db } from '../config/firebase-config.js';
import { updateDocument, createDocument, deleteDocument } from '../data/firestore.js';
import { pensionnairesList, classesList, alertThreshold, sortOrderAZ } from '../utils/constants.js';
import { escapeHtml, showToast, showLoader, hideLoader, canEdit } from '../utils/helpers.js';
import { addAuditLog, compareObjects } from './audit.js';
import { getCurrentUserInfo } from './audit.js';
import { uploadPhotoToCloudinary } from '../utils/cloudinary.js';
import { getTotalAbsencesForStudent, getTotalRetardsForStudent } from './attendance.js';

export async function saveSinglePensionnaire(pensionnaire) {
  if (!currentUser || !currentUser.uid) return;
  if (!pensionnaire.nom || !pensionnaire.classeId) return;
  
  const user = getCurrentUserInfo();
  const isNew = !pensionnaire._exists;
  const oldData = isNew ? null : JSON.parse(JSON.stringify(pensionnaire));
  
  if (isNew) {
    pensionnaire.createdBy = user.uid;
    pensionnaire.createdByName = user.name;
    pensionnaire.createdByCommission = user.commission;
    pensionnaire.createdAt = user.timestamp;
  }
  pensionnaire.updatedBy = user.uid;
  pensionnaire.updatedByName = user.name;
  pensionnaire.updatedByCommission = user.commission;
  pensionnaire.updatedAt = user.timestamp;
  
  try {
    if (isNew) {
      await createDocument('pensionnaires', pensionnaire.id, pensionnaire);
    } else {
      await updateDocument('pensionnaires', pensionnaire.id, pensionnaire);
    }
    
    const changes = !isNew ? compareObjects(oldData, pensionnaire) : {};
    await addAuditLog(isNew ? 'CREATE' : 'UPDATE', 'pensionnaire', pensionnaire.id, {
      nom: pensionnaire.nom,
      classeId: pensionnaire.classeId,
      changes: changes
    });
    
  } catch (e) {
    console.error("Erreur sauvegarde:", e);
    showToast('❌ Erreur de sauvegarde', true);
  }
}

export function renderPensionnaireList() {
  const classFilterId = document.getElementById('class-filter-select')?.value || '';
  const search = document.getElementById('pensionnaire-search')?.value.toLowerCase() || '';
  let filtered = [...pensionnairesList];
  if (classFilterId) filtered = filtered.filter(p => p.classeId === classFilterId);
  if (search) filtered = filtered.filter(p => p.nom.toLowerCase().includes(search));
  if (sortOrderAZ) {
    filtered.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  } else {
    filtered.sort((a, b) => (b.nom || '').localeCompare(a.nom || ''));
  }
  
  const container = document.getElementById('pensionnaire-list-container');
  if (!container) return;
  if (!filtered.length) { 
    container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted);">Aucun pensionnaire trouvé.</div>'; 
    return; 
  }
  
  let html = `<table class="dt" style="width:100%;"><thead><tr>
    <th>Photo</th><th>Nom</th><th>Classe</th><th>Sexe</th><th>Contact parent</th>
    <th>Tuteur</th><th>Absences</th><th>Retards</th><th>Statut</th>
    <th>Modifié par</th><th>Actions</th>
  </tr></thead><tbody>`;
  
  filtered.forEach(p => {
    const className = classesList.find(c => c.id === p.classeId)?.name || '?';
    const totalAbsences = getTotalAbsencesForStudent(p.id);
    const totalRetards = getTotalRetardsForStudent(p.id);
    let statutClass = totalAbsences > alertThreshold ? 'br' : (totalAbsences > 2 ? 'ba' : 'bg');
    let statutText = totalAbsences > alertThreshold ? 'Alerte' : (totalAbsences > 2 ? 'Attention' : 'Régulier');
    
    const photoCell = p.photo && p.photo !== 'null'
      ? `<img src="${p.photo}" style="width:36px; height:48px; object-fit:cover; border-radius:6px; border:1px solid var(--border); display:block; margin:0 auto;">`
      : `<div style="width:36px; height:48px; background:#f0f4f2; border-radius:6px; border:1px dashed #ccc; display:flex; align-items:center; justify-content:center; margin:0 auto; font-size:16px; cursor:pointer;" onclick="editPensionnaire('${p.id}')" title="Ajouter une photo">📷</div>`;
    
    html += `<tr>
      <td style="text-align:center; padding:6px;">${photoCell}</td>
      <td style="font-weight:600;">${escapeHtml(p.nom)}</td>
      <td>${escapeHtml(className)}</td>
      <td>${escapeHtml(p.sexe || '')}</td>
      <td>${escapeHtml(p.contactParent || '')}</td>
      <td>${escapeHtml(p.tuteur || '')}</td>
      <td style="text-align:center; font-weight:600; color:${totalAbsences > alertThreshold ? '#c0392b' : (totalAbsences > 2 ? '#c47a1a' : '#2c1f0e')};">${totalAbsences}</td>
      <td style="text-align:center;">${totalRetards}</td>
      <td style="text-align:center;"><span class="badge ${statutClass}">${statutText}</span></td>
      <td style="font-size:11px; color:var(--text-muted);">
        ${p.updatedByName ? escapeHtml(p.updatedByName) : '-'}<br>
        <small>${p.updatedByCommission ? p.updatedByCommission : ''}</small>
      </td>
      <td style="text-align:center;">
        <button class="btn-small" onclick="editPensionnaire('${p.id}')">✏️</button>
        <button class="btn-small" onclick="deletePensionnaire('${p.id}')">🗑️</button>
        <button class="btn-small" onclick="showAuditHistory('pensionnaire', '${p.id}', '${escapeHtml(p.nom)}')" style="background:#3A86A0;">📜</button>
      </td>
    </tr>`;
  });
  
  html += `</tbody><table>`;
  container.innerHTML = html;
}

export function editPensionnaire(id) {
  const p = pensionnairesList.find(p => p.id === id);
  if (!p) return;
  
  const photoHtml = p.photo && p.photo !== 'null'
    ? `<div style="text-align:center; margin-bottom:10px;">
        <img src="${p.photo}" style="width:60px; height:80px; object-fit:cover; border-radius:8px; border:2px solid var(--green-main); display:block; margin:0 auto 6px;">
        <button class="btn-small" onclick="removePensionnairePhoto('${p.id}')" style="background:#c0392b; font-size:11px;">🗑️ Supprimer photo</button>
       </div>`
    : `<div style="text-align:center; margin-bottom:10px; color:var(--text-muted); font-size:12px;">
        <div style="width:60px; height:80px; background:#f0f4f2; border-radius:8px; border:2px dashed #ccc; display:flex; align-items:center; justify-content:center; margin:0 auto 6px; font-size:28px;">👤</div>
        Aucune photo
       </div>`;

  Swal.fire({
    title: 'Modifier pensionnaire',
    html: `
      ${photoHtml}
      <div style="margin-bottom:10px;">
        <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; text-align:left;">📷 Photo (carte d'identité)</label>
        <input type="file" id="edit-photo-input" accept="image/*" style="width:100%; font-size:12px;">
        <div id="photo-size-info" style="font-size:11px; color:var(--text-muted); margin-top:3px;"></div>
      </div>
      <input id="edit-nom" class="swal2-input" value="${escapeHtml(p.nom)}" placeholder="Nom">
      <select id="edit-classe" class="swal2-select">${classesList.map(c => `<option value="${c.id}" ${c.id===p.classeId?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select>
      <input id="edit-sex" class="swal2-input" value="${escapeHtml(p.sexe||'')}" placeholder="Sexe">
      <input id="edit-contact" class="swal2-input" value="${escapeHtml(p.contactParent||'')}" placeholder="Contact parent">
      <input id="edit-tuteur" class="swal2-input" value="${escapeHtml(p.tuteur||'')}" placeholder="Numéro tuteur">
    `,
    showCancelButton: true,
    confirmButtonText: 'Enregistrer',
    didOpen: () => {
      const fileInput = document.getElementById('edit-photo-input');
      const sizeInfo = document.getElementById('photo-size-info');
      if (fileInput) {
        fileInput.addEventListener('change', function() {
          if (this.files[0]) {
            const sizeKo = Math.round(this.files[0].size / 1024);
            sizeInfo.textContent = `📸 Fichier : ${sizeKo} Ko`;
            sizeInfo.style.color = sizeKo > 5000 ? '#c0392b' : '#2d8a5e';
          }
        });
      }
    }
  }).then(async res => {
    if (res.isConfirmed) {
      p.nom = document.getElementById('edit-nom').value;
      p.classeId = document.getElementById('edit-classe').value;
      p.sexe = document.getElementById('edit-sex').value;
      p.contactParent = document.getElementById('edit-contact').value;
      p.tuteur = document.getElementById('edit-tuteur').value;
      
      const fileInput = document.getElementById('edit-photo-input');
      if (fileInput && fileInput.files[0]) {
        showLoader('Upload photo...', 'Téléchargement vers Cloudinary');
        try {
          const photoUrl = await uploadPhotoToCloudinary(fileInput.files[0]);
          p.photo = photoUrl;
          hideLoader();
          showToast('✅ Photo téléchargée');
        } catch(error) {
          hideLoader();
          Swal.fire('Erreur', error.message, 'error');
        }
      }
      
      await saveSinglePensionnaire(p);
      refreshAllUI();
      Swal.fire('Modifié', '', 'success');
    }
  });
}

export async function removePensionnairePhoto(id) {
  const p = pensionnairesList.find(p => p.id === id);
  if (!p) return;
  
  p.photo = '';
  await saveSinglePensionnaire(p);
  refreshAllUI();
  Swal.close();
  setTimeout(() => editPensionnaire(id), 300);
  showToast('Photo supprimée');
}

export function openAddPensionnaireModal() {
  if (!canEdit('CA', currentUser)) { Swal.fire('Accès refusé', '', 'error'); return; }
  
  if (classesList.length === 0) {
    Swal.fire('Info', 'Créez d\'abord une classe avant d\'ajouter un pensionnaire.', 'info');
    return;
  }
  
  Swal.fire({
    title: '➕ Ajouter un pensionnaire',
    html: `
      <input id="add-nom" class="swal2-input" placeholder="Nom complet *">
      <select id="add-classe" class="swal2-select" style="width:100%; margin:10px 0; padding:10px; border:1px solid #ddd; border-radius:8px;">
        <option value="">-- Choisir une classe * --</option>
        ${classesList.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
      </select>
      <input id="add-sexe" class="swal2-input" placeholder="Sexe (M/F)">
      <input id="add-contact" class="swal2-input" placeholder="Contact parent">
      <input id="add-tuteur" class="swal2-input" placeholder="Numéro tuteur">
      <div style="margin-top:10px;">
        <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; text-align:left;">📷 Photo (optionnel)</label>
        <input type="file" id="add-photo-input" accept="image/*" style="width:100%; font-size:12px;">
        <div id="add-photo-size-info" style="font-size:11px; color:var(--text-muted); margin-top:3px;"></div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '✅ Ajouter',
    confirmButtonColor: '#2E7D64',
    preConfirm: () => {
      const nom = document.getElementById('add-nom').value.trim();
      const classeId = document.getElementById('add-classe').value;
      if (!nom) { Swal.showValidationMessage('Le nom est obligatoire'); return false; }
      if (!classeId) { Swal.showValidationMessage('La classe est obligatoire'); return false; }
      return {
        nom, classeId,
        sexe: document.getElementById('add-sexe').value.trim(),
        contactParent: document.getElementById('add-contact').value.trim(),
        tuteur: document.getElementById('add-tuteur').value.trim()
      };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      const data = result.value;
      const newPensionnaire = {
        id: 'p' + Date.now() + Math.random().toString(36).substr(2, 4),
        nom: data.nom || 'Sans nom',
        classeId: data.classeId || '',
        sexe: data.sexe || 'M',
        contactParent: data.contactParent || '',
        tuteur: data.tuteur || '',
        notes: {}
      };
      
      const photoInput = document.getElementById('add-photo-input');
      if (photoInput && photoInput.files[0]) {
        showLoader('Upload photo...', 'Téléchargement vers Cloudinary');
        try {
          const photoUrl = await uploadPhotoToCloudinary(photoInput.files[0]);
          newPensionnaire.photo = photoUrl;
          hideLoader();
        } catch(error) {
          hideLoader();
          Swal.fire('Attention', error.message, 'warning');
        }
      }
      
      pensionnairesList.push(newPensionnaire);
      await saveSinglePensionnaire(newPensionnaire);
      refreshAllUI();
      
      const classeName = classesList.find(c => c.id === data.classeId)?.name || '';
      Swal.fire('✅ Ajouté', `${data.nom} a été ajouté à la classe ${classeName}.`, 'success');
    }
  });
}
