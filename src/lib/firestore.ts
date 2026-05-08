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

const generateId = () => Math.random().toString(36).substr(2, 9);

export async function fetchUserLessonPlans(userId: string): Promise<SavedLessonPlan[]> {
  const data = localStorage.getItem('lessonPlans');
  if (data) {
    const plans: SavedLessonPlan[] = JSON.parse(data);
    return plans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return [];
}

export async function saveLessonPlan(userId: string, plan: LessonPlan): Promise<SavedLessonPlan | null> {
  const plans = await fetchUserLessonPlans(userId);
  const newPlan: SavedLessonPlan = {
    ...plan,
    id: generateId(),
    userId,
    createdAt: new Date().toISOString()
  };
  plans.push(newPlan);
  localStorage.setItem('lessonPlans', JSON.stringify(plans));
  return newPlan;
}

export async function fetchUserActivities(userId: string): Promise<SavedActivityLog[]> {
  const data = localStorage.getItem('activities');
  if (data) {
    const activities: SavedActivityLog[] = JSON.parse(data);
    return activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return [];
}

export async function saveActivityLog(userId: string, log: ActivityLog): Promise<SavedActivityLog | null> {
  const activities = await fetchUserActivities(userId);
  const newLog: SavedActivityLog = {
    ...log,
    id: generateId(),
    userId,
    createdAt: new Date().toISOString()
  };
  activities.push(newLog);
  localStorage.setItem('activities', JSON.stringify(activities));
  return newLog;
}

export async function fetchUserQuestionPapers(userId: string): Promise<SavedQuestionPaperLog[]> {
  const data = localStorage.getItem('questionPapers');
  if (data) {
    const papers: SavedQuestionPaperLog[] = JSON.parse(data);
    return papers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return [];
}

export async function saveQuestionPaper(userId: string, log: QuestionPaperLog): Promise<SavedQuestionPaperLog | null> {
  const papers = await fetchUserQuestionPapers(userId);
  const newPaper: SavedQuestionPaperLog = {
    ...log,
    id: generateId(),
    userId,
    createdAt: new Date().toISOString()
  };
  papers.push(newPaper);
  localStorage.setItem('questionPapers', JSON.stringify(papers));
  return newPaper;
}

