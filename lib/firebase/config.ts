const defaultFirebaseEnv = {
  apiKey: "AIzaSyBO6Co6K3c2pTcNpDPaCTj_2fnDkOhnMJ0",
  authDomain: "pharma-path.firebaseapp.com",
  projectId: "pharma-path",
  storageBucket: "pharma-path.firebasestorage.app",
  messagingSenderId: "47289058958",
  appId: "1:47289058958:web:501a543fdbaa3adb2debdf",
  measurementId: "G-F11572K6VQ",
};

const firebaseEnv = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() || defaultFirebaseEnv.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || defaultFirebaseEnv.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || defaultFirebaseEnv.projectId,
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || defaultFirebaseEnv.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() ||
    defaultFirebaseEnv.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() || defaultFirebaseEnv.appId,
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim() || defaultFirebaseEnv.measurementId,
};

export const missingFirebaseEnv = Object.entries(firebaseEnv)
  .filter(([key, value]) => key !== "measurementId" && !value)
  .map(([key]) => key);

export const isFirebaseConfigured = missingFirebaseEnv.length === 0;

export const firebaseConfig = firebaseEnv;
