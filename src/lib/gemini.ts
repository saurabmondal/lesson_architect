import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface QuestionPaper {
  title: string;
  duration: string;
  totalMarks: number;
  sections: {
    sectionName: string;
    marksPerQuestion: number;
    questions: {
      question: string;
      options?: string[]; // for MCQ
      answer: string;
    }[];
  }[];
}

export interface LessonPlan {
  preliminaryInformation: {
    classLevel: string;
    subject: string;
    lessonName: string;
    topicName: string;
    duration: string;
  };
  instructionalObjectives: string[];
  entryBehaviour: string[];
  instructionalAids: string;
  instructionalProcedure: {
    content: string;
    learningExperiences: string;
    behaviouralObjectives: string;
    evaluation: string;
  }[];
  summary?: string;
  activities?: string[];
  finalEvaluation?: string[];
}

export async function generateLessonPlan({
  lesson,
  topic,
  classLevel,
  subject,
  templateJson,
  textbookBase64
}: {
  lesson: string;
  topic: string;
  classLevel: string;
  subject: string;
  templateJson?: string;
  textbookBase64?: string;
}): Promise<LessonPlan> {
  const parts: any[] = [];

  let prompt = `You are an expert curriculum developer and teacher. Generate a comprehensive lesson plan for Class ${classLevel} ${subject}. The overall lesson/chapter is "${lesson}" and the specific topic is "${topic}".\n\n`;

  if (templateJson) {
    prompt += `Align the tone, structure and focus of the generated structured data tightly with this template requirement provided by the user: \n${templateJson}\n\n`;
  }

  prompt += `Ensure the Instructional Procedure clearly details the specific concepts (Content), how they will be taught in class (Learning Experiences - Teacher and Student activities), what behavioral changes to expect (Behavioural Objectives), and questions to check understanding (Evaluation). Provide a detailed, rigorous plan suitable for a full 40-45 minute class.`;

  if (textbookBase64) {
    parts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: textbookBase64
      }
    });
    prompt += `\n\nI have attached the textbook chapter as a PDF. Prioritize the concepts, examples, and sequences directly from the text to align perfectly with the curriculum, extracting the material specifically related to "${lesson}" and "${topic}".`;
  }

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          preliminaryInformation: {
            type: Type.OBJECT,
            properties: {
              classLevel: { type: Type.STRING },
              subject: { type: Type.STRING },
              lessonName: { type: Type.STRING },
              topicName: { type: Type.STRING },
              duration: { type: Type.STRING }
            },
            required: ["classLevel", "subject", "lessonName", "topicName", "duration"]
          },
          instructionalObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
          entryBehaviour: { type: Type.ARRAY, items: { type: Type.STRING } },
          instructionalAids: { type: Type.STRING },
          instructionalProcedure: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                content: { type: Type.STRING },
                learningExperiences: { type: Type.STRING },
                behaviouralObjectives: { type: Type.STRING },
                evaluation: { type: Type.STRING },
              },
              required: ["content", "learningExperiences", "behaviouralObjectives", "evaluation"]
            }
          },
          recapitulation: { type: Type.STRING },
          activities: { type: Type.ARRAY, items: { type: Type.STRING } },
          homework: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: [
          "preliminaryInformation", "instructionalObjectives", "entryBehaviour",
          "instructionalAids", "instructionalProcedure"
        ]
      }
    }
  });

  if (!response.text) {
    throw new Error("Failed to generate content.");
  }

  return JSON.parse(response.text) as LessonPlan;
}
