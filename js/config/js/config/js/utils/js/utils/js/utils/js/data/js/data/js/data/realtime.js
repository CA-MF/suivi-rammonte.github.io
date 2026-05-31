import { db, onSnapshot, collection, doc } from '../config/firebase-config.js';
import { 
  setClassesList, setPensionnairesList, setAttendanceRecords, setProgrammesData,
  setClassesDetails, setRapportsList, setCustomLogos, setCipsMembersList,
  setCipsAttendanceRecords, setClassSubjects, setAppDataSubjects, setAlertThreshold,
  unsubscribeFunctions, setUnsubscribeFunctions, refreshAllUI
} from '../utils/constants.js';

export function stopRealtimeListeners() {
  unsubscribeFunctions.forEach(unsub => {
    if (typeof unsub === 'function') unsub();
  });
  setUnsubscribeFunctions([]);
}

export function startRealtimeListeners() {
  stopRealtimeListeners();
  
  const classesUnsub = onSnapshot(collection(db, "classes"), (snapshot) => {
    const classes = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      classes.push({ id: doc.id, name: data.name });
      if (data.details) setClassesDetails(prev => ({ ...prev, [doc.id]: data.details }));
      if (data.programme) setProgrammesData(prev => ({ ...prev, [doc.id]: data.programme }));
    });
    setClassesList(classes);
    refreshAllUI();
  });
  unsubscribeFunctions.push(classesUnsub);
  
  const pensionnairesUnsub = onSnapshot(collection(db, "pensionnaires"), (snapshot) => {
    const pensionnaires = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      pensionnaires.push({
        id: doc.id,
        nom: data.nom,
        classeId: data.classeId,
        sexe: data.sexe || '',
        contactParent: data.contactParent || '',
        tuteur: data.tuteur || '',
        notes: data.notes || {},
        photo: data.photo || ''
      });
    });
    setPensionnairesList(pensionnaires);
    refreshAllUI();
  });
  unsubscribeFunctions.push(pensionnairesUnsub);
  
  const attendanceUnsub = onSnapshot(collection(db, "attendance"), (snapshot) => {
    const attendance = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      attendance.push({
        pensionnaireId: data.pensionnaireId,
        date: data.date,
        status: data.status
      });
    });
    setAttendanceRecords(attendance);
    refreshAllUI();
  });
  unsubscribeFunctions.push(attendanceUnsub);
  
  const subjectsUnsub = onSnapshot(doc(db, "settings", "subjects"), (docSnap) => {
    if (docSnap.exists()) setAppDataSubjects(docSnap.data().subjects || appDataSubjects);
    refreshAllUI();
  });
  unsubscribeFunctions.push(subjectsUnsub);
  
  const thresholdUnsub = onSnapshot(doc(db, "settings", "threshold"), (docSnap) => {
    if (docSnap.exists()) setAlertThreshold(docSnap.data().value || 3);
  });
  unsubscribeFunctions.push(thresholdUnsub);
  
  const classSubjectsUnsub = onSnapshot(doc(db, "settings", "classSubjects"), (docSnap) => {
    if (docSnap.exists()) setClassSubjects(docSnap.data().subjects || {});
    refreshAllUI();
  });
  unsubscribeFunctions.push(classSubjectsUnsub);
  
  const rapportsUnsub = onSnapshot(collection(db, "rapports"), (snapshot) => {
    const rapports = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.deleted) rapports.push({
        id: doc.id,
        titre: data.titre,
        date: data.date,
        downloadURL: data.downloadURL,
        storagePath: data.storagePath,
        fileName: data.fileName,
        fileSize: data.fileSize,
        auteur: data.auteur,
        dateAjout: data.dateAjout
      });
    });
    setRapportsList(rapports);
    refreshAllUI();
  });
  unsubscribeFunctions.push(rapportsUnsub);
  
  const logosUnsub = onSnapshot(doc(db, "settings", "logos"), (docSnap) => {
    if (docSnap.exists()) setCustomLogos(docSnap.data());
    applyCustomLogos();
  });
  unsubscribeFunctions.push(logosUnsub);
  
  const cipsMembresUnsub = onSnapshot(doc(db, "settings", "cipsMembres"), (docSnap) => {
    setCipsMembersList(docSnap.exists() ? docSnap.data().membres || [] : []);
    if (document.getElementById('cips-members-list')) renderCipsMembersList();
    if (document.getElementById('cips-recap-container')) renderCipsRecap();
  });
  unsubscribeFunctions.push(cipsMembresUnsub);
  
  const cipsAttendanceUnsub = onSnapshot(doc(db, "settings", "cipsAttendance"), (docSnap) => {
    setCipsAttendanceRecords(docSnap.exists() ? docSnap.data().records || [] : []);
    if (document.getElementById('cips-members-list')) renderCipsMembersList();
    if (document.getElementById('cips-recap-container')) renderCipsRecap();
  });
  unsubscribeFunctions.push(cipsAttendanceUnsub);
  
  console.log("✅ Synchronisation temps réel activée.");
}
