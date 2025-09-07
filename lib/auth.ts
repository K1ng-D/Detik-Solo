import { auth } from './firebase';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export type UserRole = 'user' | 'admin';

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date | { seconds: number; nanoseconds: number } | null;
}

// Configuration for admin domain patterns
const ADMIN_DOMAINS = ['portalberita.com']; // Add other admin domains if needed

// Fungsi untuk menentukan role berdasarkan email
const determineUserRole = (email: string): UserRole => {
  if (!email) return 'user';
  
  const emailDomain = email.toLowerCase().split('@')[1];
  return ADMIN_DOMAINS.includes(emailDomain) ? 'admin' : 'user';
};

export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  
  // Cek jika user ada di Firestore, jika tidak buat otomatis
  const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
  if (!userDoc.exists()) {
    const role = determineUserRole(email);
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName || 'User',
      role,
      createdAt: serverTimestamp()
    });
  }
  
  return userCredential.user;
};

export const registerUser = async (email: string, password: string, displayName: string) => {
  // Buat user di Firebase Auth
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Update profile dengan display name
  await updateProfile(user, { displayName });
  
  // Tentukan role berdasarkan email
  const role = determineUserRole(email);
  
  // Simpan data user ke Firestore
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email,
    displayName,
    role,
    createdAt: serverTimestamp()
  });
  
  return user;
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export const getUserData = async (uid: string): Promise<UserData | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        createdAt: data.createdAt
      } as UserData;
    }
    
    // Jika user tidak ada di Firestore, buat otomatis
    const user = auth.currentUser;
    if (user && user.uid === uid) {
      const role = determineUserRole(user.email || '');
      await setDoc(doc(db, 'users', uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'User',
        role,
        createdAt: serverTimestamp()
      });
      
      return {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'User',
        role,
        createdAt: new Date()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

export const verifyRole = async (uid: string, requiredRole: UserRole): Promise<boolean> => {
  const userData = await getUserData(uid);
  return userData?.role === requiredRole;
};