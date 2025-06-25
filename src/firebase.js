import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDgFvzPiIJSFB0B72NMjMylf9Ddw4J-rAU',
  authDomain: 'claender-6544d.firebaseapp.com',
  projectId: 'claender-6544d',
  // ...other config
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth, GoogleAuthProvider, signInWithPopup, signOut }; 