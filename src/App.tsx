import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Loader2, Sparkles, AlertCircle, Printer, ChevronLeft, ChevronRight, Download, LogIn, LogOut } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { useReactToPrint } from 'react-to-print';
import { type LessonPlan } from './lib/gemini';
import { generateLessonPlanWithGroq } from './lib/groq';
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

  useEffect(() => {
    if (user) {
      fetchUserLessonPlans(user.uid).then(plans => {
        setSavedPlans(plans);
      });
    } else {
      setSavedPlans([]);
    }
  }, [user]);

  const getLessons = () => {
    if (!classLevel || !subject) return [];
    const data = topicsData[classLevel as keyof typeof topicsData]?.[subject as 'Mathematics' | 'Computer Science'];
    return data ? Object.keys(data) : [];
  };

  const getTopics = (l: string) => {
    if (!classLevel || !subject) return [];
    const data = topicsData[classLevel as keyof typeof topicsData]?.[subject as 'Mathematics' | 'Computer Science'];
    return (data && (data as any)[l]) ? (data as any)[l] : [];
  };

  useEffect(() => {
    setLesson('');
  }, [classLevel, subject]);

  useEffect(() => {
    setTopic('');
  }, [lesson]);

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
    <div className="min-h-screen w-full bg-gradient-to-br from-fuchsia-50 via-violet-100 to-cyan-100 text-slate-900 selection:bg-fuchsia-200 selection:text-fuchsia-900 print:bg-white font-sans antialiased">
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 print:hidden flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white p-2 rounded-xl shadow-md">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-violet-900">Lesson Architect</span>
        </div>
        <div>
          {!loading && user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-600 hidden sm:inline-block">
                {user.email}
              </span>
              <button 
                onClick={logOut}
                className="bg-white/60 hover:bg-white text-rose-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 border border-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-200"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        
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
          
          {savedPlans.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="max-w-xl mx-auto mt-8 bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-violet-200/30 border border-white/50 overflow-hidden print:hidden p-8"
            >
              <h3 className="font-bold text-violet-900 mb-5 uppercase tracking-widest text-xs flex items-center gap-2">
                <span className="w-2 h-4 bg-fuchsia-500 rounded-sm"></span>
                History
              </h3>
              <div className="space-y-3">
                {savedPlans.map((plan, i) => (
                  <button
                    key={i}
                    onClick={() => setLessonPlan(plan)}
                    className="w-full text-left p-4 rounded-2xl border border-violet-100 hover:border-violet-300 hover:bg-white transition-all flex items-center justify-between group shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-fuchsia-200"
                  >
                    <div>
                      <p className="font-bold text-slate-800 group-hover:text-violet-700 transition-colors">{plan.preliminaryInformation.lessonName}</p>
                      <p className="text-xs text-slate-500 mt-1 font-medium">{plan.preliminaryInformation.subject} &bull; {plan.preliminaryInformation.topicName}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center text-violet-600 group-hover:bg-violet-100 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
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

                  {/* Activities Section */}
                  {lessonPlan.activities && lessonPlan.activities.length > 0 && (
                    <div className="pt-6">
                      <h3 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-xs flex items-center gap-2">
                        <span className="w-2 h-4 bg-fuchsia-500 rounded-sm"></span>
                        Activities & Games
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {lessonPlan.activities.map((activity, i) => (
                          <div key={i} className="bg-white border border-fuchsia-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-8 h-8 rounded-full bg-fuchsia-100 flex items-center justify-center text-fuchsia-600 font-bold mb-4">
                              {i + 1}
                            </div>
                            <p className="text-slate-700 leading-relaxed font-medium">
                              {activity}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
      </main>
    </div>
  );
}

