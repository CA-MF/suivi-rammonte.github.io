import { db, doc, setDoc, getDoc, onSnapshot, collection, deleteDoc, getDocs } from '../config/firebase-config.js';

export async function createDocument(collectionName, docId, data) {
  return await setDoc(doc(db, collectionName, docId), data);
}

export async function readDocument(collectionName, docId) {
  const docSnap = await getDoc(doc(db, collectionName, docId));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

export async function updateDocument(collectionName, docId, data) {
  return await setDoc(doc(db, collectionName, docId), data, { merge: true });
}

export async function deleteDocument(collectionName, docId) {
  return await deleteDoc(doc(db, collectionName, docId));
}

export async function getAllDocuments(collectionName) {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export function listenCollection(collectionName, callback) {
  return onSnapshot(collection(db, collectionName), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  });
}

export function listenDocument(collectionName, docId, callback) {
  return onSnapshot(doc(db, collectionName, docId), (docSnap) => {
    callback(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null);
  });
}
