# Lesson Architect AI

An AI-powered lesson planning tool designed to help educators quickly generate comprehensive, structured classroom lesson plans. Powered by Groq's high-speed inference, the app breaks down complex educational topics into ready-to-teach formats.

## 🌟 Features

- **AI-Powered Generation**: Instantly generate lesson plans using Groq's high-speed LLM inference.
- **Strict Content Formatting**: Generates rigorous "Definition, Meaning, and Example" facts tailored exactly to the topic, avoiding generic pedagogical fluff.
- **End-to-End Structure**: Automatically lays out:
  - Subject, Topic, and Class Level
  - General & Specific Objectives
  - Entry Behaviour (Prior Knowledge assessment questions)
  - Detailed Instructional Procedures mapped 1-to-1 with Behavioural Objectives
  - Recapitulation & Home Assignment
- **Responsive UI**: Clean, mobile-friendly interface designed for educators on any device.

## 🛠️ Tech Stack

- **Frontend Core**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **AI Integration**: Groq SDK (`groq-sdk` or standard fetch logic)

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A [Groq API Key](https://console.groq.com/keys)

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd <your-project-directory>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory. Because this configuration uses Vite, environment variables exposed to the frontend MUST start with `VITE_`.
   ```env
   VITE_GROQ_API_KEY=your_actual_groq_api_key_here
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000` (or the port specified in your console).

---

## 🌐 Deployment (Vercel)

If you have connected your GitHub repository to Vercel, follow these exact steps to fix any "API Key environment variable is required" errors:

1. **Log in to Vercel** and select your project.
2. Navigate to **Settings** -> **Environment Variables**.
3. Create a new variable:
   - **Key**: `VITE_GROQ_API_KEY`
   - **Value**: `gsk_your_actual_api_key_here` (Ensure there are no spaces at the beginning or end).
4. Click **Save**.
5. **CRITICAL STEP**: The Vite build process bakes `VITE_` variables directly into the compiled files. Adding the variable *after* a build will not apply it to the live site. You MUST redeploy:
   - Go to the **Deployments** tab.
   - Click the three dots (`...`) next to your most recent deployment.
   - Click **Redeploy**.

---

## 📂 Project Structure

- `/src/App.tsx`: Main React component containing the form State and rendering logic.
- `/src/lib/groq.ts`: Contains the crucial prompt-engineering and AI logic. This handles injecting formatting rules (like enforcing factual data, preventing "Discuss/Explain" verbs).
- `/src/index.css`: Global styles including Tailwind configurations.

## 📝 Customizing the AI

If you wish to change how the lesson plan is structured or how strictly the AI behaves:
1. Open `/src/lib/groq.ts`.
2. Locate the `prompt` construction block.
3. Modify the template logic, "Instructional Procedure" constraints, or JSON validation scheme as needed.
