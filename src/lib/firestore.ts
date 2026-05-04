import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { type LessonPlan } from './gemini';

export interface SavedLessonPlan extends LessonPlan {
  id: string;
  userId: string;
  createdAt: any;
}

export async function fetchUserLessonPlans(userId: string): Promise<SavedLessonPlan[]> {
  try {
    const plansRef = collection(db, 'lessonPlans');
    const q = query(
      plansRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SavedLessonPlan[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'lessonPlans');
    return [];
  }
}

export async function saveLessonPlan(userId: string, plan: LessonPlan): Promise<SavedLessonPlan | null> {
  try {
    const plansRef = collection(db, 'lessonPlans');
    const data = {
      ...plan,
      userId,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(plansRef, data);
    return {
      id: docRef.id,
      ...data,
      createdAt: new Date().toISOString() // optimistic
    } as SavedLessonPlan;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'lessonPlans');
    return null;
  }
}
