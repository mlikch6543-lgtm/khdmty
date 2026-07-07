

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getDatabase, ref, set, update, remove, onValue, off } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyD1hbtdhHeBn5_pIFup1syY5THih5_f_I8",
  authDomain: "khdmty-2.firebaseapp.com",
  databaseURL: "https://khdmty-2-default-rtdb.firebaseio.com",
  projectId: "khdmty-2",
  storageBucket: "khdmty-2.firebasestorage.app",
  messagingSenderId: "1034529182566",
  appId: "1:1034529182566:web:82b817cfc41416190c6ea7",
  measurementId: "G-59Y6N5HT1Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Initialize Services
export const db = getDatabase(app);
export const auth = getAuth(app);

// Helper to sign in anonymously with a promise
export const signIn = (): Promise<FirebaseUser> => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        resolve(user);
      } else {
        signInAnonymously(auth)
          .then((cred) => resolve(cred.user))
          .catch(reject);
      }
    });
  });
};

// Data Subscription with Prioritized Loading
// We separate "Essential Data" (Users/Classes) from "Heavy Data" (Attendance/Preparations)
export const subscribeToData = (
  onData: (data: any, isEssentialLoaded: boolean) => void,
  onError: (error: Error) => void
) => {
  let unsubscribers: (() => void)[] = [];

  // Listen to auth changes to manage subscriptions
  const authUnsubscribe = onAuthStateChanged(auth, (user) => {
    // Clear previous subscriptions if any
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];

    if (!user) {
      console.warn("No authenticated user, waiting...");
      return;
    }

    // 1. ESSENTIAL Paths: Required to show the UI immediately
    const essentialPaths = ['users', 'sectors', 'classes', 'students', 'notifications'];
    
    // 2. HEAVY Paths: Can load in the background (Images, deep history)
    // Added 'requests' to heavy paths
    const heavyPaths = ['attendance', 'occasions', 'occasion_payments', 'preparations', 'requests'];
    
    const allPaths = [...essentialPaths, ...heavyPaths];
    const loadedPaths = new Set<string>();
    
    const dataCache: any = {
      users: [],
      sectors: [],
      classes: [],
      students: [],
      attendance: {},
      notifications: [],
      occasions: [],
      occasion_payments: {},
      preparations: [],
      requests: {}
    };

    allPaths.forEach(path => {
      const dbRef = ref(db, path);
      
      const listener = onValue(dbRef, (snapshot) => {
        const val = snapshot.val();
        loadedPaths.add(path);

        if (path === 'attendance' || path === 'occasion_payments' || path === 'requests') {
           dataCache[path] = val || {};
        } else {
           const list = val ? Object.keys(val).map(key => ({ ...val[key], id: key })) : [];
           // Sort lists that need it
           if (path === 'notifications' || path === 'preparations') {
              list.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
           }
           dataCache[path] = list;
        }

        // CRITICAL: We check if ESSENTIAL paths are loaded.
        // We do NOT wait for heavy paths to declare the app "Ready".
        const isEssentialReady = essentialPaths.every(p => loadedPaths.has(p));

        onData({ ...dataCache }, isEssentialReady);
      }, (error) => {
        console.warn(`Access restricted for path: ${path} (User role may limit access)`);
        
        // Handle Permission Denied gracefully:
        // 1. Mark as loaded so the app doesn't hang
        loadedPaths.add(path);
        
        // 2. Ensure empty data is set if not already
        if (!dataCache[path]) {
            if (path === 'attendance' || path === 'occasion_payments' || path === 'requests') {
                dataCache[path] = {};
            } else {
                dataCache[path] = [];
            }
        }

        // 3. Check readiness again
        const isEssentialReady = essentialPaths.every(p => loadedPaths.has(p));
        onData({ ...dataCache }, isEssentialReady);
        
        // Only trigger fatal error for other types of failures, not permission denied
        if ((error as any).code !== 'PERMISSION_DENIED' && (error as any).code !== 'CLIENT_INSUFFICIENT_PERMISSION') {
             onError(error);
        }
      });
      
      unsubscribers.push(() => off(dbRef, 'value', listener));
    });
  });

  return () => {
    authUnsubscribe();
    unsubscribers.forEach(unsub => unsub());
  };
};

// CRUD Helpers
export const addData = async (path: string, data: any) => {
  await set(ref(db, path), data);
};

export const updateData = async (path: string, data: any) => {
  await update(ref(db, path), data);
};

export const deleteData = async (path: string) => {
  await remove(ref(db, path));
};

export const logSystemAccess = async (data: any) => {
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  await addData(`system_logs/${logId}`, {
    ...data,
    timestamp: new Date().toISOString()
  });
};