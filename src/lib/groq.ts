import Groq from "groq-sdk";
import { type LessonPlan } from "./gemini";
import { GoogleGenAI } from "@google/genai";

let groqClient: Groq | null = null;

export function getGroqClient(): Groq {
  if (!groqClient) {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
      throw new Error('GROQ_API_KEY environment variable is required. Please set it in the settings/secrets panel.');
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

  prompt += `\nEnsure the Instructional Procedure clearly details the specific concepts (Content), how they will be taught in class (Learning Experiences - Teacher and Student activities), what behavioral changes to expect (Behavioural Objectives), and questions to check understanding (Evaluation). Provide a detailed, rigorous plan suitable for a full 40-45 minute class. IMPORTANT: In 'learningExperiences', do NOT start the sentences with phrases like "The teacher will", "The teacher", "Students will" or "The students". Just describe the activities directly and naturally. 
CRITICAL REQUIREMENT: There MUST be a strict 1-to-1 mapping between the items in the 'instructionalObjectives' array and the objects in the 'instructionalProcedure' array. Do NOT skip any objectives. Every single objective must have its own dedicated step in the instructional procedure.
For each step in the instructional procedure, look at its 'behaviouralObjectives'. The 'content' field for that step MUST directly state the topic mentioned in the objective (e.g. if the objective is 'Define basic structure of html', the content MUST be 'Basic structure of HTML'). The 'learningExperiences' for that step MUST explicitly lay out the definition, the meaning, and an example of that specific concept.
The overall instructional objectives MUST contain all the topics being taught.
For 'entryBehaviour', provide a minimum of 4 questions to test previous knowledge.
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
  "entryBehaviour": ["string (minimum 4 questions)"],
  "instructionalAids": "string",
  "instructionalProcedure": [
    {
      "content": "string",
      "learningExperiences": "string (Must include the definition, meaning, and example of the concept from the behavioural objective)",
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
