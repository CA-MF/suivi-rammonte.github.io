import { 
  auth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  db, doc, getDoc, setDoc
} from '../config/firebase-config.js';
import { currentUser, setCurrentUser } from '../utils/constants.js';
import { showLoader, hideLoader } from '../utils/helpers.js';
import { addAuditLog } from './audit.js';
import { buildFullApp } from './ui.js';
import { loadAllData } from '../data/loadData.js';
import { startRealtimeListeners } from '../data/realtime.js';
import { preloadLogos, applyCustomLogos } from '../modules/logos.js';

export async function doLogin() {
  const u = document.getElementById('inp-user').value.trim();
  const p = document.getElementById('inp-pass').value.trim();
  const err = document.getElementById('login-err');

  if (!u || !p) {
    err.textContent = 'Veuillez remplir tous les champs.';
    err.style.display = 'block';
    return;
  }

  const email = u.includes('@') ? u : u + "@rammonte.sn";

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, p);
    const user = userCredential.user;

    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      setCurrentUser(docSnap.data());
      currentUser.uid = user.uid;
    } else {
      const newUser = {
        uid: user.uid,
        username: u,
        role: "teacher",
        name: email.split('@')[0],
        avatar: email.substring(0,2).toUpperCase(),
        structure: "Non définie",
        email: email,
        createdAt: new Date().toLocaleDateString()
      };
      setCurrentUser(newUser);
      await setDoc(docRef, newUser);
    }

    err.style.display = 'none';
    showLoader('Connexion en cours...', 'Vérification de vos identifiants');
    await preloadLogos();
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('app-page').style.display = 'flex';
    document.getElementById('header-avatar').innerText = currentUser.commission || 'PF';
    document.getElementById('header-name').innerText = currentUser.name;
    buildFullApp();
    await loadAllData();
    startRealtimeListeners();
    
    await addAuditLog('LOGIN', 'user', currentUser.uid, {
      email: currentUser.email,
      commission: currentUser.commission,
      role: currentUser.role
    });
  } catch (error) {
    console.error("Erreur Firebase:", error.code, error.message);
    if (error.code === 'auth/invalid-credential') {
      err.textContent = 'Email ou mot de passe incorrect.';
    } else if (error.code === 'auth/invalid-email') {
      err.textContent = 'Format d\'email invalide.';
    } else if (error.code === 'auth/too-many-requests') {
      err.textContent = 'Trop de tentatives. Réessayez plus tard.';
    } else {
      err.textContent = 'Erreur : ' + error.message;
    }
    err.style.display = 'block';
  }
}

export async function doLogout() {
  stopRealtimeListeners();
  
  if (currentUser) {
    await addAuditLog('LOGOUT', 'user', currentUser.uid, {
      email: currentUser.email,
      commission: currentUser.commission
    });
  }
  
  try {
    await signOut(auth);
  } catch (e) {
    console.error("Erreur déconnexion:", e);
  }
  
  setCurrentUser(null);
  document.getElementById('app-page').style.display = 'none';
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('inp-user').value = '';
  document.getElementById('inp-pass').value = '';
  
  if (charts.bar) charts.bar.destroy();
  if (charts.pie) charts.pie.destroy();
  if (charts.radar) charts.radar.destroy();
  if (programChart) programChart.destroy();
  if (absenceChart) absenceChart.destroy();
}

export function checkSession() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      showLoader('Récupération de votre session...', '');
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) {
        setCurrentUser(docSnap.data());
        currentUser.uid = user.uid;
        await preloadLogos();
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('app-page').style.display = 'flex';
        document.getElementById('header-avatar').innerText = currentUser.commission || 'PF';
        document.getElementById('header-name').innerText = currentUser.name;
        buildFullApp();
        await loadAllData();
        startRealtimeListeners();
      }
    }
  });
}
