import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { type LessonPlan, type QuestionPaper } from './gemini';

export interface SavedLessonPlan extends LessonPlan {
  id: string;
  userId: string;
  createdAt: any;
}

export interface ActivityLog {
  userId?: string;
  classLevel: string;
  subject: string;
  lesson?: string;
  topic?: string;
  activities: string[];
}

export interface SavedActivityLog extends ActivityLog {
  id: string;
  userId: string;
  createdAt: any;
}

export interface QuestionPaperLog {
  userId?: string;
  classLevel: string;
  subject: string;
  paper: QuestionPaper;
}

export interface SavedQuestionPaperLog extends QuestionPaperLog {
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

export async function fetchUserActivities(userId: string): Promise<SavedActivityLog[]> {
  try {
    const actsRef = collection(db, 'activities');
    const q = query(
      actsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SavedActivityLog[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'activities');
    return [];
  }
}

export async function saveActivityLog(userId: string, log: ActivityLog): Promise<SavedActivityLog | null> {
  try {
    const actsRef = collection(db, 'activities');
    const data = {
      ...log,
      userId,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(actsRef, data);
    return {
      id: docRef.id,
      ...data,
      userId,
      createdAt: new Date().toISOString() // optimistic
    } as SavedActivityLog;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'activities');
    return null;
  }
}

export async function fetchUserQuestionPapers(userId: string): Promise<SavedQuestionPaperLog[]> {
  try {
    const papersRef = collection(db, 'questionPapers');
    const q = query(
      papersRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SavedQuestionPaperLog[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'questionPapers');
    return [];
  }
}

export async function saveQuestionPaper(userId: string, log: QuestionPaperLog): Promise<SavedQuestionPaperLog | null> {
  try {
    const papersRef = collection(db, 'questionPapers');
    const data = {
      ...log,
      userId,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(papersRef, data);
    return {
      id: docRef.id,
      ...data,
      userId,
      createdAt: new Date().toISOString() // optimistic
    } as SavedQuestionPaperLog;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'questionPapers');
    return null;
  }
}

