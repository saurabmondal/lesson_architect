import Groq from "groq-sdk";
import { type LessonPlan } from "./gemini";
import { GoogleGenAI } from "@google/genai";

let groqClient: Groq | null = null;

export function getGroqClient(): Groq {
  if (!groqClient) {
    const key = process.env.GROQ_API_KEY || (import.meta as any).env?.VITE_GROQ_API_KEY || (import.meta as any).env?.GROQ_API_KEY;
    if (!key) {
      throw new Error('VITE_GROQ_API_KEY environment variable is required. Please set it in Vercel or your settings.');
    }
    groqClient = new Groq({ apiKey: key, dangerouslyAllowBrowser: true });
  }
  return groqClient;
}

export async function generateLessonPlanWithGroq({
  lesson,
  topic,
  classLevel,
  subject,
  templateJson
}: {
  lesson: string;
  topic: string;
  classLevel: string;
  subject: string;
  templateJson?: string;
}): Promise<LessonPlan> {
  const model = "llama-3.3-70b-versatile"; // Great for complex generation and json mode

  let prompt = `You are an expert curriculum developer and teacher. Generate a comprehensive lesson plan for Class ${classLevel} ${subject}. The overall lesson/chapter is "${lesson}" and the specific topic is "${topic}".\n\n`;

  if (templateJson) {
    prompt += `Align the tone, structure and focus of the generated structured data tightly with this template requirement provided by the user: \n${templateJson}\n\n`;
  }

  prompt += `\nEnsure the Instructional Procedure clearly details the specific concepts (Content), how they will be taught in class, what behavioral changes to expect (Behavioural Objectives), and questions to check understanding (Evaluation). Provide a detailed, rigorous plan suitable for a full 40-45 minute class.
CRITICAL REQUIREMENT: There MUST be a strict 1-to-1 mapping between the items in the 'instructionalObjectives' array and the objects in the 'instructionalProcedure' array. Do NOT skip any objectives. Every single objective must have its own dedicated step in the instructional procedure.
For each step in the instructional procedure, look at its 'behaviouralObjectives'. The 'content' field for that step MUST directly state the topic mentioned in the objective (e.g. if the objective is 'Define basic structure of html', the content MUST be 'Basic structure of HTML'). 

MOST IMPORTANT RULE FOR 'learningExperiences':
Do NOT start sentences with action words/pedagogical verbs like "Discuss", "Define", "Explain", "Show", "The teacher will", or "Students will".
Instead, the 'learningExperiences' MUST ONLY be the pure subject matter content. It MUST explicitly state the Definition, the Meaning, and the Example(s) of the specific concept. Write it directly as factual notes.
For example, DO write: "Definition: An angle is formed by two rays. Meaning: It measures the amount of turn. Example: 90 degree right angle."
DO NOT write: "Define what an angle is. Discuss with the class..."

The overall instructional objectives MUST contain all the topics being taught.
For 'entryBehaviour', provide a minimum of 4 questions to test previous knowledge. CRITICAL: These questions MUST NOT be about the current topic being taught. Instead, they MUST be about previous related topics or foundational concepts that the students should already know before starting this topic.
Your response MUST be valid JSON fitting exactly this structure:
{
  "preliminaryInformation": {
    "classLevel": "string",
    "subject": "string",
    "lessonName": "string",
    "topicName": "string",
    "duration": "string"
  },
  "instructionalObjectives": ["string"],
  "entryBehaviour": ["string (minimum 4 questions testing previous prerequisite knowledge, NOT the current topic)"],
  "instructionalAids": "string",
  "instructionalProcedure": [
    {
      "content": "string",
      "learningExperiences": "string (MUST provide factual text only: Definition, Meaning, and Example. Do NOT use instructional verbs like 'Discuss' or 'Explain'.)",
      "behaviouralObjectives": "string",
      "evaluation": "string"
    }
  ],
  "activities": ["string (Suggest 3-5 engaging classroom activities or games related to the topic)"],
  "summary": "string (optional)",
  "finalEvaluation": ["string", "(optional)"]
}`;

  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a professional curriculum designer. Always output valid JSON exactly matching the requested schema."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    model: model,
    temperature: 0.2,
    response_format: { type: "json_object" }
  });

  const messageContent = completion.choices[0]?.message?.content;
  if (!messageContent) {
    throw new Error("No content received from Groq");
  }

  const lessonPlan = JSON.parse(messageContent) as LessonPlan;

  return lessonPlan;
}

export async function generateActivitiesWithGroq({
  classLevel,
  subject,
  lesson,
  topic
}: {
  classLevel: string;
  subject: string;
  lesson: string;
  topic: string;
}): Promise<string[]> {
  const model = "llama-3.3-70b-versatile";

  const prompt = `You are an expert curriculum developer. Suggest 5 engaging classroom activities or games for Class ${classLevel} ${subject}.
The overall lesson/chapter is "${lesson}" and the specific topic is "${topic}".

Provide your response as a valid JSON object matching exactly this structure:
{
  "activities": ["string details of activity 1", "string details of activity 2", "string details of activity 3", "string details of activity 4", "string details of activity 5"]
}
`;

  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a professional curriculum designer. Always output valid JSON exactly matching the requested schema."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    model: model,
    temperature: 0.3,
    response_format: { type: "json_object" }
  });

  const messageContent = completion.choices[0]?.message?.content;
  if (!messageContent) {
    throw new Error("No content received from Groq");
  }

  const result = JSON.parse(messageContent);
  return result.activities || [];
}

export async function generateQuestionPaperWithGroq({
  classLevel,
  subject,
  lessons,
  topics,
  totalMarks
}: {
  classLevel: string;
  subject: string;
  lessons: string[];
  topics: string[];
  totalMarks: number;
}) {
  const model = "llama-3.3-70b-versatile";

  const prompt = `You are an expert examiner. Generate a balanced question paper for Class ${classLevel} ${subject}.
The syllabus covers the following lessons/chapters: ${lessons.join(", ")}.
If any specific topics are provided, they are: ${topics.length > 0 ? topics.join(", ") : "All topics in the syllabus"}.
The total marks for the test must be ${totalMarks}.

Provide your response as a valid JSON object matching exactly this structure:
{
  "title": "Module/Term Examination",
  "duration": "1 Hour",
  "totalMarks": ${totalMarks},
  "sections": [
    {
      "sectionName": "Multiple Choice Questions (e.g., 1 mark each)",
      "marksPerQuestion": 1,
      "questions": [
        {
          "question": "The actual question text",
          "options": ["A", "B", "C", "D"],
          "answer": "The correct option or answer"
        }
      ]
    },
    {
      "sectionName": "Short Answer Questions (e.g., 2 marks each)",
      "marksPerQuestion": 2,
      "questions": [
        {
          "question": "The actual question text",
          "answer": "Expected answer"
        }
      ]
    }
  ]
}

Make sure the sum of all questions across all sections multiply by their respective marksPerQuestion exactly equals ${totalMarks}.
Include a mix of MCQs and subjective questions appropriate for the subject.
`;

  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a professional examiner. Always output valid JSON exactly matching the requested schema."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    model: model,
    temperature: 0.2,
    response_format: { type: "json_object" }
  });

  const messageContent = completion.choices[0]?.message?.content;
  if (!messageContent) {
    throw new Error("No content received from Groq");
  }

  return JSON.parse(messageContent);
}
