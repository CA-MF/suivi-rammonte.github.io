import { CLOUDINARY_CONFIG } from '../config/cloudinary-config.js';

export async function uploadPhotoToCloudinary(file) {
  return new Promise((resolve, reject) => {
    if (file.size > CLOUDINARY_CONFIG.maxSizeMB * 1024 * 1024) {
      reject(new Error(`Le fichier ne doit pas dépasser ${CLOUDINARY_CONFIG.maxSizeMB} Mo`));
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', CLOUDINARY_CONFIG.folder);
    formData.append('transformation', JSON.stringify([
      { width: 120, height: 160, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good' }
    ]));
    
    fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) reject(new Error(data.error.message));
      else resolve(data.secure_url);
    })
    .catch(error => reject(new Error('Erreur de connexion à Cloudinary: ' + error.message)));
  });
}
