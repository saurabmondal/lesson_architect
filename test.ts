import { GoogleGenAI } from "@google/genai";

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log("Testing gemini-2.5-flash-image...");
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: "A blue circle" }] },
    });
    console.log("Success with gemini-2.5-flash-image!", response.candidates?.[0]?.content?.parts?.[0]?.inlineData ? "Has image data" : "No image data");
  } catch(e) {
    console.error("Error with 2.5:", e);
  }
}
main();
