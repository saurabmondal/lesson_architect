import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Loader2, Sparkles, AlertCircle, Printer, ChevronLeft, ChevronRight, Download, LogIn, LogOut, Menu, X, Rocket, FileText, CheckSquare, Plus, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { useReactToPrint } from 'react-to-print';
import { type LessonPlan, type QuestionPaper } from './lib/gemini';
import { generateLessonPlanWithGroq, generateActivitiesWithGroq, generateQuestionPaperWithGroq } from './lib/groq';
import { useAuth } from './components/AuthProvider';
import { fetchUserLessonPlans, saveLessonPlan, SavedLessonPlan } from './lib/firestore';
import mathTemplate from './data/math_template.json';
import csTemplate from './data/cs_template.json';
import { topicsData } from './data/topics';

export default function App() {
  const { user, signIn, logOut, loading } = useAuth();
  const [classLevel, setClassLevel] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [lesson, setLesson] = useState<string>('');
  const [topic, setTopic] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [error, setError] = useState<string>('');
  const [savedPlans, setSavedPlans] = useState<SavedLessonPlan[]>([]);
  
  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Page Routing State
  const [activePage, setActivePage] = useState<'generator' | 'history' | 'activities' | 'test'>('generator');

  // Standalone Activities State
  const [activityClassLevel, setActivityClassLevel] = useState<string>('');
  const [activitySubject, setActivitySubject] = useState<string>('');
  const [activityLesson, setActivityLesson] = useState<string>('');
  const [activityTopic, setActivityTopic] = useState<string>('');
  const [standaloneActivities, setStandaloneActivities] = useState<string[]>([]);
  const [isGeneratingActivities, setIsGeneratingActivities] = useState(false);
  const [activityError, setActivityError] = useState('');

  // Test Generator State
  const [testClassLevel, setTestClassLevel] = useState<string>('');
  const [testSubject, setTestSubject] = useState<string>('');
  const [testSelectedLessons, setTestSelectedLessons] = useState<string[]>([]);
  const [testSelectedTopics, setTestSelectedTopics] = useState<string[]>([]);
  const [testTotalMarks, setTestTotalMarks] = useState<number>(25);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [testError, setTestError] = useState('');
  const [questionPaper, setQuestionPaper] = useState<QuestionPaper | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserLessonPlans(user.uid).then(plans => {
        setSavedPlans(plans);
      });
    } else {
      setSavedPlans([]);
    }
  }, [user]);

  const getLessonsList = (c: string, s: string) => {
    if (!c || !s) return [];
    const data = topicsData[c as keyof typeof topicsData]?.[s as 'Mathematics' | 'Computer Science'];
    return data ? Object.keys(data) : [];
  };

  const getTopicsList = (c: string, s: string, l: string) => {
    if (!c || !s) return [];
    const data = topicsData[c as keyof typeof topicsData]?.[s as 'Mathematics' | 'Computer Science'];
    return (data && (data as any)[l]) ? (data as any)[l] : [];
  };

  const getLessons = () => getLessonsList(classLevel, subject);
  const getTopics = (l: string) => getTopicsList(classLevel, subject, l);

  const getActivityLessons = () => getLessonsList(activityClassLevel, activitySubject);
  const getActivityTopics = (l: string) => getTopicsList(activityClassLevel, activitySubject, l);

  useEffect(() => {
    setLesson('');
  }, [classLevel, subject]);

  useEffect(() => {
    setTopic('');
  }, [lesson]);

  useEffect(() => {
    setActivityLesson('');
  }, [activityClassLevel, activitySubject]);

  useEffect(() => {
    setActivityTopic('');
  }, [activityLesson]);

  useEffect(() => {
    setTestSelectedLessons([]);
    setTestSelectedTopics([]);
  }, [testClassLevel, testSubject]);

  const getTestLessons = () => getLessonsList(testClassLevel, testSubject);
  const getTestTopics = (l: string) => getTopicsList(testClassLevel, testSubject, l);

  const handleToggleTestLesson = (l: string) => {
    setTestSelectedLessons(prev => 
      prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]
    );
    // Remove topics associated with unselected lesson
    setTestSelectedTopics(prev => prev.filter(t => {
      const lessonTopics = getTestTopics(l);
      if (lessonTopics.includes(t)) {
        return false;
      }
      return true;
    }));
  };

  const handleToggleTestTopic = (t: string) => {
    setTestSelectedTopics(prev => 
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const handleGenerateTest = async () => {
    if (testSelectedLessons.length === 0) {
      setTestError("Please select at least one lesson.");
      return;
    }
    if (testTotalMarks <= 0) {
      setTestError("Please enter a valid total marks greater than 0.");
      return;
    }
    setTestError('');
    setIsGeneratingTest(true);
    setQuestionPaper(null);
    try {
      const paper = await generateQuestionPaperWithGroq({
        classLevel: testClassLevel,
        subject: testSubject,
        lessons: testSelectedLessons,
        topics: testSelectedTopics,
        totalMarks: testTotalMarks
      });
      setQuestionPaper(paper);
    } catch (err: any) {
      setTestError(err.message || "An error occurred while generating test.");
    } finally {
      setIsGeneratingTest(false);
    }
  };

  const handleGenerateActivities = async () => {
    if (!activityLesson.trim() || !activityTopic.trim()) {
      setActivityError("Please ensure a lesson and topic are selected.");
      return;
    }
    setActivityError('');
    setIsGeneratingActivities(true);
    setStandaloneActivities([]);
    try {
      const activities = await generateActivitiesWithGroq({
        classLevel: activityClassLevel,
        subject: activitySubject,
        lesson: activityLesson,
        topic: activityTopic
      });
      setStandaloneActivities(activities);
    } catch (err: any) {
      setActivityError(err.message || "An error occurred while generating activities.");
    } finally {
      setIsGeneratingActivities(false);
    }
  };

  const handleGenerate = async () => {
    if (!lesson.trim() || !topic.trim()) {
      setError("Please ensure a lesson and topic are selected.");
      return;
    }

    setError('');
    setIsGenerating(true);
    setLessonPlan(null);

    try {
      const activeTemplate = subject === 'Mathematics' ? mathTemplate : csTemplate;
      const templateJsonStr = JSON.stringify(activeTemplate);

      const plan = await generateLessonPlanWithGroq({
        lesson,
        topic,
        classLevel,
        subject,
        templateJson: templateJsonStr
      });
      setLessonPlan(plan);
      
      if (user) {
        const savedPlan = await saveLessonPlan(user.uid, plan);
        if (savedPlan) {
          setSavedPlans([savedPlan, ...savedPlans]);
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while generating the lesson plan. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: contentRef,
    documentTitle: `${lessonPlan?.preliminaryInformation.lessonName || 'Lesson'}_Plan`,
  });

  const handleDownloadPdf = async () => {
    const element = contentRef.current;
    if (!element) return;
    
    setIsDownloadingPdf(true);
    
    // Slight delay to ensure React renders the loading state
    setTimeout(async () => {
      try {
        const dataUrl = await toPng(element, { 
          quality: 1, 
          pixelRatio: 2,
          skipFonts: true, // Prevents hanging on font loads
          backgroundColor: '#ffffff'
        });
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        
        const imgProps = pdf.getImageProperties(dataUrl);
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        const pageHeight = pdf.internal.pageSize.getHeight();
        let heightLeft = pdfHeight;
        let position = 0;
        
        // Add a slight margin at the top
        const margin = 10;
        
        pdf.addImage(dataUrl, 'PNG', 0, position + margin, pdfWidth, pdfHeight);
        heightLeft -= (pageHeight - margin);
        
        while (heightLeft > 0) {
          position = heightLeft - pdfHeight;
          pdf.addPage();
          pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
        }
        
        pdf.save(`${lessonPlan?.preliminaryInformation.lessonName || 'Lesson'}_Plan.pdf`);
      } catch (e: any) {
        console.error("Error generating PDF:", e);
        alert("There was an issue generating the PDF format directly. Please try printing to a PDF using your browser's print dialog.");
      } finally {
        setIsDownloadingPdf(false);
      }
    }, 200);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-gradient-to-br from-fuchsia-50 via-violet-100 to-cyan-100 text-slate-900 selection:bg-fuchsia-200 selection:text-fuchsia-900 print:bg-white font-sans antialiased overflow-hidden">
      
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-violet-900/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar (Print hidden) */}
      <aside className={`fixed z-50 w-80 flex-shrink-0 bg-white/80 backdrop-blur-2xl border-r border-violet-200 shadow-2xl print:hidden flex flex-col h-screen top-0 left-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo and App Name */}
        <div className="p-6 border-b border-violet-100 bg-white/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white p-2 rounded-xl shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-bold tracking-tight text-violet-900">Lesson Architect</span>
          </div>
          <button 
            className="text-violet-500 hover:text-violet-700 p-2 -mr-2 bg-violet-50 rounded-lg transition-colors hover:bg-violet-100"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 mt-4">
          <button 
            onClick={() => { setActivePage('generator'); setIsSidebarOpen(false); setLessonPlan(null); }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${
              activePage === 'generator' ? 'bg-violet-100 text-violet-800' : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            New Lesson Plan
          </button>
          
          <button 
            onClick={() => { setActivePage('history'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${
              activePage === 'history' ? 'bg-violet-100 text-violet-800' : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            History
          </button>

          <button 
            onClick={() => { setActivePage('activities'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${
              activePage === 'activities' ? 'bg-fuchsia-100 text-fuchsia-800' : 'text-slate-600 hover:bg-fuchsia-50 hover:text-fuchsia-700'
            }`}
          >
            <Rocket className="w-5 h-5" />
            Activities
          </button>

          <button 
            onClick={() => { setActivePage('test'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${
              activePage === 'test' ? 'bg-cyan-100 text-cyan-800' : 'text-slate-600 hover:bg-cyan-50 hover:text-cyan-700'
            }`}
          >
            <FileText className="w-5 h-5" />
            Test Generator
          </button>
        </div>

        {/* User Info & Logout (Bottom of sidebar) */}
        {!loading && (
          <div className="p-4 border-t border-violet-100 bg-white/50 mt-auto">
            {user ? (
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-600 px-2 truncate">
                  {user.email}
                </span>
                <button 
                  onClick={logOut}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 border border-rose-200 focus:outline-none"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-500 px-2 text-center">
                  Sign in to save plans
                </span>
                <button 
                  onClick={signIn}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 border border-violet-700 focus:outline-none"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto w-full relative">
        {/* Header (Hamburger) */}
        <div className="flex items-center p-4 md:px-8 print:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-violet-100 shadow-sm gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-white rounded-lg shadow-sm border border-violet-100 text-violet-700 hover:bg-violet-50 transition-colors flex items-center gap-2"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white p-1.5 rounded-lg shadow-sm hidden md:block">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg tracking-tight text-violet-900">Lesson Architect</span>
          </div>
        </div>

        <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        
        {/* === HISTORY VIEW === */}
        {activePage === 'history' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-extrabold text-violet-900 mb-6 flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-fuchsia-600" />
              Lesson Plan History
            </h2>
            {savedPlans.length > 0 ? (
              <div className="grid gap-4">
                {savedPlans.map((plan, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setLessonPlan(plan);
                      setActivePage('generator');
                    }}
                    className="w-full text-left p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-violet-100 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-200/50 transition-all flex flex-col group shadow-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-200"
                  >
                    <p className="font-bold text-slate-800 text-lg group-hover:text-violet-700 transition-colors mb-2">{plan.preliminaryInformation.lessonName}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600 font-medium tracking-tight">
                      <span className="bg-fuchsia-100 text-fuchsia-800 px-2.5 py-1 rounded-md">{plan.preliminaryInformation.subject}</span>
                      <span className="bg-violet-100 text-violet-800 px-2.5 py-1 rounded-md">{plan.preliminaryInformation.topicName}</span>
                      <span className="bg-cyan-100 text-cyan-800 px-2.5 py-1 rounded-md">Class {plan.preliminaryInformation.classLevel}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center p-12 bg-white/60 backdrop-blur-sm rounded-3xl border border-violet-100 shadow-sm">
                <BookOpen className="w-12 h-12 text-violet-300 mx-auto mb-4" />
                <p className="text-slate-600 font-bold mb-2">No Plans Yet</p>
                {user ? (
                  <p className="text-sm text-slate-500">Your generated lesson plans will appear here.</p>
                ) : (
                  <p className="text-sm text-slate-500">Please sign in to save and view your history.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* === ACTIVITIES VIEW === */}
        {activePage === 'activities' && (
          <div className="max-w-xl mx-auto space-y-6">
            <h2 className="text-2xl font-extrabold text-violet-900 mb-6 flex items-center gap-3">
              <Rocket className="w-6 h-6 text-fuchsia-600" />
              Generate Activities
            </h2>
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-violet-200/50 border border-white/50">
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 ml-1 uppercase tracking-widest">Class Level</label>
                  <select 
                    value={activityClassLevel}
                    onChange={(e) => setActivityClassLevel(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white text-sm font-bold focus:ring-2 focus:ring-fuchsia-200 focus:border-fuchsia-400 outline-none transition-all shadow-sm"
                  >
                    <option value="" disabled>Select Class</option>
                    {Object.keys(topicsData).map(c => (
                      <option key={c} value={c}>Class {c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 ml-1 uppercase tracking-widest">Subject</label>
                  <select 
                    value={activitySubject}
                    onChange={(e) => setActivitySubject(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white text-sm font-bold focus:ring-2 focus:ring-fuchsia-200 focus:border-fuchsia-400 outline-none transition-all shadow-sm"
                  >
                    <option value="" disabled>Select Subject</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Computer Science">Computer Science</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 ml-1 uppercase tracking-widest">Lesson / Chapter</label>
                  <select 
                    value={activityLesson}
                    onChange={(e) => setActivityLesson(e.target.value)}
                    disabled={!activityClassLevel || !activitySubject}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white text-sm font-bold focus:ring-2 focus:ring-fuchsia-200 focus:border-fuchsia-400 outline-none transition-all shadow-sm disabled:opacity-50 disabled:bg-slate-50"
                  >
                    <option value="" disabled>Select Lesson</option>
                    {getActivityLessons().map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 ml-1 uppercase tracking-widest">Topic</label>
                  <select 
                    value={activityTopic}
                    onChange={(e) => setActivityTopic(e.target.value)}
                    disabled={!activityLesson}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white text-sm font-bold focus:ring-2 focus:ring-fuchsia-200 focus:border-fuchsia-400 outline-none transition-all shadow-sm disabled:opacity-50 disabled:bg-slate-50"
                  >
                    <option value="" disabled>Select Topic</option>
                    {getActivityTopics(activityLesson).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {activityError && (
                  <div className="p-4 bg-rose-50 text-rose-700 text-sm font-bold rounded-xl border border-rose-200 flex items-start gap-3 shadow-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                    <span>{activityError}</span>
                  </div>
                )}

                <button
                  onClick={handleGenerateActivities}
                  disabled={isGeneratingActivities || !activityTopic}
                  className="w-full py-4 mt-2 rounded-xl text-white font-bold bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-700 hover:to-violet-700 shadow-md shadow-fuchsia-500/30 transition-all flex justify-center items-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingActivities ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                  Find Activities
                </button>
              </div>
            </div>

            {standaloneActivities.length > 0 && (
              <div className="mt-8">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-4 bg-fuchsia-500 rounded-sm"></span>
                  Results
                </h4>
                <div className="space-y-4">
                  {standaloneActivities.map((activity, i) => (
                    <div key={i} className="bg-white border border-fuchsia-100 p-6 rounded-2xl shadow-sm text-base text-slate-700 leading-relaxed font-medium">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="flex items-center justify-center w-6 h-6 bg-fuchsia-100 text-fuchsia-700 rounded-lg text-xs font-bold shadow-sm">{i + 1}</span>
                        <h5 className="font-bold text-slate-900 tracking-tight">Activity Idea</h5>
                      </div>
                      <p>{activity}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* === TEST GENERATOR VIEW === */}
        {activePage === 'test' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-2xl font-extrabold text-violet-900 mb-6 flex items-center gap-3">
              <FileText className="w-6 h-6 text-cyan-600" />
              Generate Question Paper
            </h2>

            {!questionPaper && !isGeneratingTest && (
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-violet-200/50 border border-white/50">
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 ml-1 uppercase tracking-widest">Class Level</label>
                    <select 
                      value={testClassLevel}
                      onChange={(e) => setTestClassLevel(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white text-sm font-bold focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none transition-all shadow-sm"
                    >
                      <option value="" disabled>Select Class</option>
                      {Object.keys(topicsData).map(c => (
                        <option key={c} value={c}>Class {c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 ml-1 uppercase tracking-widest">Subject</label>
                    <select 
                      value={testSubject}
                      onChange={(e) => setTestSubject(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white text-sm font-bold focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none transition-all shadow-sm"
                    >
                      <option value="" disabled>Select Subject</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Computer Science">Computer Science</option>
                    </select>
                  </div>
                </div>

                {testClassLevel && testSubject && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-3 ml-1 uppercase tracking-widest border-b border-slate-100 pb-2">Select Lessons & Topics</label>
                    <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                      {getTestLessons().map((l: string) => (
                        <div key={l} className="border border-slate-200 rounded-xl overflow-hidden bg-white/50">
                          <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={testSelectedLessons.includes(l)}
                              onChange={() => handleToggleTestLesson(l)}
                              className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            <span className="font-bold text-slate-800 text-sm">{l}</span>
                          </label>
                          {testSelectedLessons.includes(l) && (
                            <div className="bg-slate-50/50 p-3 pl-10 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {getTestTopics(l).map((t: string) => (
                                <label key={t} className="flex items-start gap-2 cursor-pointer group">
                                  <input 
                                    type="checkbox"
                                    checked={testSelectedTopics.includes(t)}
                                    onChange={() => handleToggleTestTopic(t)}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 mt-1 shadow-sm"
                                  />
                                  <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 leading-tight block">{t}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 ml-1 uppercase tracking-widest">Total Marks</label>
                  <input 
                    type="number"
                    min="1"
                    value={testTotalMarks}
                    onChange={(e) => setTestTotalMarks(parseInt(e.target.value) || 0)}
                    className="w-full sm:w-1/3 p-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white text-sm font-bold focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 outline-none transition-all shadow-sm"
                  />
                </div>

                {testError && (
                  <div className="p-4 bg-rose-50 text-rose-700 text-sm font-bold rounded-xl border border-rose-200 flex items-start gap-3 shadow-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                    <span>{testError}</span>
                  </div>
                )}

                <button
                  onClick={handleGenerateTest}
                  disabled={isGeneratingTest || testSelectedLessons.length === 0}
                  className="w-full py-4 mt-4 rounded-xl text-white font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-md shadow-cyan-500/30 transition-all flex justify-center items-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="w-5 h-5" />
                  Generate Question Paper
                </button>
              </div>
            </div>
            )}

            {isGeneratingTest && (
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                 className="min-h-[50vh] flex flex-col items-center justify-center text-cyan-800"
               >
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-cyan-300 rounded-full blur-2xl animate-pulse opacity-50"></div>
                  <Loader2 className="w-16 h-16 animate-spin text-cyan-600 relative z-10" />
                </div>
                <p className="font-extrabold text-2xl text-cyan-900 drop-shadow-sm">Crafting question paper...</p>
                <p className="text-sm text-cyan-700 mt-3 text-center max-w-sm font-medium">
                  Designing challenging options and curating subjective problems.
                </p>
              </motion.div>
            )}

            {questionPaper && !isGeneratingTest && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden"
              >
                <div className="p-6 md:p-10 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-2xl text-slate-900 mb-1">{questionPaper.title}</h3>
                    <p className="text-slate-500 font-medium text-sm flex gap-3">
                      <span>Subject: <strong className="text-slate-700">{testSubject}</strong></span> &bull; 
                      <span>Class <strong className="text-slate-700">{testClassLevel}</strong></span>
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex flex-col text-center">
                      <span className="text-slate-400 text-[10px] uppercase tracking-widest">Time</span>
                      <span className="text-indigo-600">{questionPaper.duration}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="flex flex-col text-center">
                      <span className="text-slate-400 text-[10px] uppercase tracking-widest">Marks</span>
                      <span className="text-indigo-600">{questionPaper.totalMarks}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-10 space-y-10">
                  {questionPaper.sections.map((sec, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-2">
                        <h4 className="font-extrabold text-lg text-slate-800">{sec.sectionName}</h4>
                        <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md">
                          {sec.marksPerQuestion} mark{sec.marksPerQuestion > 1 ? 's' : ''} each
                        </span>
                      </div>
                      <div className="space-y-8">
                        {sec.questions.map((q, j) => (
                          <div key={j} className="flex gap-4">
                            <span className="font-bold text-slate-400 pt-0.5">Q{j + 1}.</span>
                            <div className="flex-1 space-y-3">
                              <p className="font-medium text-slate-800 leading-relaxed">{q.question}</p>
                              {q.options && q.options.length > 0 && (
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 list-none p-0">
                                  {q.options.map((opt, k) => (
                                    <li key={k} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
                                        {['A', 'B', 'C', 'D', 'E'][k]}
                                      </span>
                                      <span className="text-sm font-medium text-slate-700 pt-0.5">{opt}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 inline-block w-full text-sm">
                                <span className="font-bold text-emerald-800 uppercase tracking-widest text-[10px] block mb-1">Answer Key</span>
                                <span className="font-medium text-emerald-900">{q.answer}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                  <button 
                    onClick={() => {
                      setQuestionPaper(null); 
                      setTestSelectedLessons([]); 
                      setTestSelectedTopics([]);
                    }}
                    className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors text-sm"
                  >
                    Create Another
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* === GENERATOR VIEW === */}
        {activePage === 'generator' && (
          <>
        {/* Form Configuration State */}
        {!isGenerating && !lessonPlan && (
          <>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl mx-auto bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-violet-200/50 border border-white/50 overflow-hidden print:hidden"
            >
            <div className="p-8 border-b border-violet-100 bg-gradient-to-br from-violet-100/50 to-fuchsia-50/50 text-center">
              <div className="inline-flex bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white p-3 rounded-2xl shadow-lg shadow-violet-300 mb-5">
                <Sparkles className="w-7 h-7" />
              </div>
              <h1 className="font-extrabold text-2xl md:text-3xl leading-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-700 to-fuchsia-700 mb-2">Lesson Architect</h1>
              <p className="text-sm text-fuchsia-600/80 font-bold uppercase tracking-widest">AI-Powered Lesson Planner</p>
            </div>

            <div className="p-8 space-y-7 bg-white/60 backdrop-blur-sm">
              {error && (
                <div className="p-4 bg-rose-50/80 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-start gap-3 shadow-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600" />
                  <span className="leading-relaxed font-medium">{error}</span>
                </div>
              )}

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-violet-600">Class Level</label>
                    <select 
                      value={classLevel} 
                      onChange={(e) => setClassLevel(e.target.value)}
                      className="w-full px-4 py-3 border border-violet-200/60 rounded-xl bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500 transition-all text-sm font-bold text-violet-900 shadow-sm hover:border-violet-300"
                    >
                      <option value="" disabled>Select Class</option>
                      <option value="6">Class 6 (Middle)</option>
                      <option value="7">Class 7 (Middle)</option>
                      <option value="8">Class 8 (Middle)</option>
                    </select>
                  </div>

                  <div className="space-y-2.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-violet-600">Subject</label>
                    <select 
                      value={subject} 
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-4 py-3 border border-violet-200/60 rounded-xl bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500 transition-all text-sm font-bold text-violet-900 shadow-sm hover:border-violet-300"
                    >
                      <option value="" disabled>Select Subject</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Computer Science">Computer Science</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-violet-600">Lesson / Chapter</label>
                  <select 
                    value={lesson}
                    onChange={(e) => setLesson(e.target.value)}
                    className="w-full px-4 py-3 border border-violet-200/60 rounded-xl bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500 transition-all text-sm font-bold text-violet-900 shadow-sm hover:border-violet-300"
                  >
                    <option value="" disabled>Select Lesson</option>
                    {getLessons().map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-violet-600">Topic</label>
                  {getTopics(lesson).length > 0 ? (
                    <select 
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full px-4 py-3 border border-violet-200/60 rounded-xl bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500 transition-all text-sm font-bold text-violet-900 shadow-sm hover:border-violet-300"
                    >
                      <option value="" disabled>Select Topic</option>
                      {getTopics(lesson).map((t: string) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Enter topic..."
                      className="w-full px-4 py-3 border border-violet-200/60 rounded-xl bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500 transition-all text-sm font-bold text-violet-900 shadow-sm hover:border-violet-300"
                    />
                  )}
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !topic}
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span>Build Lesson Plan</span>
                  <ChevronRight className="w-5 h-5 ml-1" />
                </button>
              </div>
            </div>
          </motion.div>
          </>
        )}

        {/* Loading State */}
        {isGenerating && (
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }}
             className="min-h-[70vh] flex flex-col items-center justify-center text-violet-800 print:hidden"
           >
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-fuchsia-300 rounded-full blur-2xl animate-pulse opacity-50"></div>
              <Loader2 className="w-16 h-16 animate-spin text-fuchsia-600 relative z-10" />
            </div>
            <p className="font-extrabold text-3xl text-fuchsia-900 drop-shadow-sm">Designing your lesson...</p>
            <p className="text-lg text-violet-700 mt-4 text-center max-w-md leading-relaxed font-medium">
              Weaving definitions, meanings, examples, and creative teaching aids into a vibrant learning experience.
            </p>
          </motion.div>
        )}

        {/* Result State */}
        <AnimatePresence mode="wait">
          {lessonPlan && !isGenerating && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 print:hidden">
                <button 
                  onClick={() => setLessonPlan(null)}
                  className="text-sm font-bold flex items-center gap-2 text-violet-600 hover:text-fuchsia-700 hover:bg-white/50 px-4 py-2.5 rounded-xl transition-all shadow-sm border border-transparent hover:border-violet-200"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Create New Plan
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={handleDownloadPdf}
                    disabled={isDownloadingPdf}
                    className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl shadow-lg border border-indigo-600 text-sm font-bold flex items-center gap-2.5 text-white transition-all hover:shadow-xl focus:ring-2 focus:ring-indigo-200 focus:outline-none disabled:opacity-75 disabled:cursor-wait"
                  >
                    {isDownloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}
                  </button>
                  <button 
                    onClick={handlePrint}
                    className="bg-white hover:bg-violet-50 px-6 py-3 rounded-xl shadow-lg border border-violet-100 text-sm font-bold flex items-center gap-2.5 text-fuchsia-700 transition-all hover:shadow-xl focus:ring-2 focus:ring-fuchsia-200 focus:outline-none"
                  >
                    <Printer className="w-4 h-4" />
                    Print Document
                  </button>
                </div>
              </div>

              {/* The Document */}
              <div id="lesson-plan-document" ref={contentRef} className="bg-white shadow-xl shadow-slate-200/40 rounded-3xl border border-slate-100 print:shadow-none print:border-none print:rounded-none">
                
                {/* Header */}
                <div className="border-b-[6px] border-indigo-600 p-8 sm:p-14 bg-slate-50/50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-8">
                    <div>
                      <div className="inline-flex text-indigo-600 font-bold tracking-widest uppercase text-xs mb-4 bg-indigo-100/50 px-3 py-1.5 rounded-lg border border-indigo-200/50">
                        Class {lessonPlan.preliminaryInformation.classLevel} &bull; {lessonPlan.preliminaryInformation.subject}
                      </div>
                      <h1 className="text-4xl sm:text-5xl font-serif text-slate-900 leading-tight mb-5">
                        {lessonPlan.preliminaryInformation.lessonName}
                      </h1>
                      <div className="text-slate-600 flex items-center gap-3">
                        <span className="font-bold text-slate-800 uppercase tracking-widest text-[11px] bg-slate-200/50 px-2 py-1 rounded">Topic</span> 
                        <span className="text-lg font-medium">{lessonPlan.preliminaryInformation.topicName}</span>
                      </div>
                    </div>
                    <div className="flex flex-col lg:items-end justify-start gap-4 pt-2">
                      <div className="inline-flex flex-col bg-white px-5 py-4 rounded-2xl border border-slate-200 shadow-sm text-sm min-w-40 text-center lg:text-right">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1.5">Duration</span>
                        <span className="font-mono font-bold text-indigo-600 text-lg">{lessonPlan.preliminaryInformation.duration}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-px w-full bg-slate-200 mb-10"></div>

                  <div className="grid grid-cols-1 gap-8">
                    <div>
                      <h3 className="font-bold text-slate-900 mb-5 uppercase tracking-widest text-xs flex items-center gap-2">
                         <span className="w-2 h-4 bg-indigo-500 rounded-sm"></span>
                         Instructional Objectives
                      </h3>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3 list-none p-0 m-0">
                        {lessonPlan.instructionalObjectives.map((obj, i) => (
                          <li key={i} className="flex items-start gap-3 text-slate-700 leading-relaxed font-medium">
                            <span className="text-indigo-400 mt-1 flex-shrink-0">
                              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                            </span>
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-8 sm:p-14 space-y-14">
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div>
                      <h3 className="font-bold text-slate-900 mb-4 uppercase tracking-widest text-xs flex items-center gap-2">
                        <span className="bg-slate-100 p-2 rounded-lg"><BookOpen className="w-4 h-4 text-slate-600" /></span>
                        Entry Behaviour
                      </h3>
                      <p className="text-slate-400 text-xs mb-5 font-medium uppercase tracking-wider">Prior knowledge expected</p>
                      <ul className="list-none space-y-4 m-0 p-0 text-slate-700">
                        {lessonPlan.entryBehaviour.map((eb, i) => (
                          <li key={i} className="flex items-start gap-4 leading-relaxed font-medium bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                            <div className="w-2 h-2 mt-2 rounded-full bg-indigo-400 flex-shrink-0"></div>
                            <span>{eb}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 mb-4 uppercase tracking-widest text-xs flex items-center gap-2">
                        <span className="bg-slate-100 p-2 rounded-lg"><Sparkles className="w-4 h-4 text-slate-600" /></span>
                        Instructional Aids
                      </h3>
                      <p className="text-slate-400 text-xs mb-5 font-medium uppercase tracking-wider">Materials required</p>
                      <p className="text-slate-700 leading-relaxed p-6 bg-slate-50/80 rounded-2xl border border-slate-100 font-medium">
                        {lessonPlan.instructionalAids}
                      </p>
                    </div>
                  </div>

                  {/* The Instructional Procedure Table */}
                  <div className="pt-6">
                    <h3 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-xs flex items-center gap-2">
                      <span className="w-2 h-4 bg-indigo-500 rounded-sm"></span>
                      Instructional Procedure
                    </h3>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                      <table className="w-full border-collapse text-sm text-left align-top">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                            <th className="p-5 font-bold text-slate-500 w-1/4 border-r border-slate-200">Content</th>
                            <th className="p-5 font-bold text-slate-500 w-1/4 border-r border-slate-200">Learning Experiences<br/><span className="font-medium text-slate-400 mt-1.5 block tracking-wide normal-case">(Teacher & Student)</span></th>
                            <th className="p-5 font-bold text-slate-500 w-1/4 border-r border-slate-200">Behavioural Objectives</th>
                            <th className="p-5 font-bold text-slate-500 w-1/4">Evaluation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lessonPlan.instructionalProcedure.map((row, i) => (
                            <tr key={i} className="even:bg-slate-50/30 border-b border-slate-200 last:border-0 print:break-inside-avoid">
                              <td className="p-5 align-top text-slate-900 font-bold border-r border-slate-200 bg-white/50 text-[15px]">
                                {row.content}
                              </td>
                              <td className="p-5 align-top text-slate-700 whitespace-pre-wrap leading-relaxed border-r border-slate-200 bg-white/50 font-medium [&_p]:mb-4 [&_p:last-child]:mb-0 [&_img]:rounded-xl [&_img]:my-4 [&_img]:w-full [&_img]:object-cover">
                                <ReactMarkdown
                                  components={{
                                    img: (props) => {
                                      if (!props.src || props.src.trim() === '') return null;
                                      const { node, ...rest } = props;
                                      return <img {...rest} alt={props.alt || ""} />;
                                    }
                                  }}
                                >
                                  {row.learningExperiences}
                                </ReactMarkdown>
                              </td>
                              <td className="p-5 align-top text-slate-600 border-r border-slate-200 bg-white/50">
                                <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold uppercase tracking-widest mb-2.5 border border-indigo-100/50">Objective</span>
                                <p className="leading-relaxed font-medium">{row.behaviouralObjectives}</p>
                              </td>
                              <td className="p-5 align-top text-slate-700 italic bg-white/50 leading-relaxed font-medium">
                                {row.evaluation}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Activities are now in the sidebar */}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 print:break-before-auto border-t border-violet-100 pt-12">
                    {lessonPlan.summary && (
                      <div>
                        <h3 className="font-extrabold text-slate-900 mb-6 uppercase tracking-widest text-sm flex items-center gap-3">
                           <span className="w-3 h-6 bg-gradient-to-b from-fuchsia-500 to-violet-600 rounded-sm shadow-sm"></span>
                           Summary
                        </h3>
                        <div className="p-8 bg-gradient-to-br from-violet-50 to-white shadow-sm rounded-3xl border border-violet-100">
                          <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-semibold">
                            {lessonPlan.summary}
                          </p>
                        </div>
                      </div>
                    )}
                    {lessonPlan.finalEvaluation && lessonPlan.finalEvaluation.length > 0 && (
                      <div>
                        <h3 className="font-extrabold text-slate-900 mb-6 uppercase tracking-widest text-sm flex items-center gap-3">
                           <span className="w-3 h-6 bg-gradient-to-b from-violet-500 to-fuchsia-600 rounded-sm shadow-sm"></span>
                           Evaluation
                        </h3>
                        <ul className="list-none space-y-4 m-0 p-0 text-slate-800">
                          {lessonPlan.finalEvaluation.map((task, i) => (
                            <li key={i} className="flex items-start gap-4 p-5 bg-white border border-fuchsia-100 hover:border-fuchsia-300 transition-colors rounded-3xl shadow-sm">
                              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center text-sm font-black border border-fuchsia-200 shadow-sm">{i + 1}</span>
                              <span className="leading-relaxed pt-1.5 font-bold">{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                </div>
              </div>
              
              <div className="h-20 print:hidden"></div>
            </motion.div>
          )}
        </AnimatePresence>
        </>
        )}
        </main>
      </div>
    </div>
  );
}

