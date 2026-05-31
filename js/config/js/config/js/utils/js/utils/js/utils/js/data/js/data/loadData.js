import { db, getDoc, doc } from '../config/firebase-config.js';
import { 
  setClassesList, setPensionnairesList, setProgrammesData, setAttendanceRecords,
  setClassesDetails, setClassSubjects, setAppDataSubjects, setAlertThreshold,
  setCustomLogos, setCurrentUser
} from '../utils/constants.js';
import { loadClassSubjects, loadRapports, loadLogos, loadCipsData } from './realtime.js';
import { showLoader, hideLoader } from '../utils/helpers.js';

export async function loadAllData() {
  showLoader('Chargement des données...', 'Connexion à la base de données');
  try {
    if (db && currentUser && currentUser.uid) {
      const logosSnap = await getDoc(doc(db, "settings", "logos"));
      if (logosSnap.exists()) setCustomLogos(logosSnap.data());
      
      const thresholdSnap = await getDoc(doc(db, "settings", "threshold"));
      if (thresholdSnap.exists()) setAlertThreshold(thresholdSnap.data().value || 3);
      
      const classSubjectsSnap = await getDoc(doc(db, "settings", "classSubjects"));
      if (classSubjectsSnap.exists()) setClassSubjects(classSubjectsSnap.data().subjects || {});
      
      const subjectsSnap = await getDoc(doc(db, "settings", "subjects"));
      if (subjectsSnap.exists()) setAppDataSubjects(subjectsSnap.data().subjects || appDataSubjects);
    }
    
    setClassesList([]);
    setPensionnairesList([]);
    setProgrammesData({});
    setAttendanceRecords([]);
    setClassesDetails({});
    
    loadClassSubjects();
    loadRapports();
    loadLogos();
    loadCipsData();
    applyCustomLogos();
    
    if (currentUser && currentUser.role === 'superadmin') loadAllUsers();
    
    setTimeout(() => hideLoader(), 500);
  } catch (error) {
    console.error("Erreur chargement:", error);
    hideLoader();
    Swal.fire('Erreur', 'Impossible de charger les données', 'error');
  }
}
