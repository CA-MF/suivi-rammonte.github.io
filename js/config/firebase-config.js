import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, doc, setDoc, getDoc, onSnapshot, collection, deleteDoc, getDocs 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { 
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBPR_S_DZF39NvEuJyqcZok16U-Gp_M4TU",
  authDomain: "rammonte-1d482.firebaseapp.com",
  projectId: "rammonte-1d482",
  storageBucket: "rammonte-1d482.firebasestorage.app",
  messagingSenderId: "890219607845",
  appId: "1:890219607845:web:0eabb28d38d9a124f14ccc"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { 
  auth, db, storage,
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  doc, setDoc, getDoc, onSnapshot, collection, deleteDoc, getDocs,
  ref, uploadBytes, getDownloadURL, deleteObject
};
