import { db } from '../../FirebaseConfig';
import { getAuth } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export async function saveUserData(data: any) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user logged in');
  await setDoc(doc(db, 'users', user.uid), data, { merge: true });
}

export async function loadUserData() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No user logged in');
  const docSnap = await getDoc(doc(db, 'users', user.uid));
  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    return null;
  }
} 