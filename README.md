# Method HR Interviewing & Screening Tool

A comprehensive internal application for Method HR to generate, manage, and utilize interview screening questions and candidate evaluation criteria. This tool leverages Google Gemini AI to create custom interview sets tailored to specific roles and skill requirements.

## 🚀 Features

- **AI Interview Question Generation**: Create custom screening questions by defining a role, specifying at least one required skill, and setting the number of questions (default 3 per skill).
- **Candidate Screening**: Primary interface for evaluating interviewees against selected question sets.
    - **How to Assign**: Integrated instructions for linking a candidate to a specific interview session.
    - **Dialogue Mode**: Sample interviewer/candidate exchanges to understand how a strong candidate should respond.
    - **Technical Verification**: Automated code examples and architectural deep dives to help non-technical recruiters verify candidate claims.
    - **Red Flags & Pitfalls**: Identify common mistakes or insufficient answers to watch for during screenings.
- **Roles & Skills Dashboard**: Browse and filter questions by role or skill category. Updates dynamically when switching question sets.
- **Secure Recruiter Access**: Mandatory login required to access the tool. Manage saved question sets and candidate notes securely.
- **Interactive Reveal**: 
    - Smooth 3D-style "reveal" for expected answers.
    - Syntax highlighting for technical evaluation code snippets.
    - Standardized UI components (500px width) for consistent multi-device viewing.
- **Multi-Layer Persistence**: 
    - **SQLite**: Primary backend storage for reliable, shared access across the team.
    - **Browser LocalStorage**: Frontend fallback and caching for offline-ready performance.
- **Markdown & PDF Export**: Detailed answers and evaluation notes support full Markdown formatting. Export interview guides as professional PDF files.

## 🤖 AI & MCP Architecture

The core intelligence of the tool is a hybrid system combining Large Language Models (LLMs) with specialized context.

### How it Works
1.  **Prompt Engineering**: The application constructs a detailed prompt based on the user's input (Role, Set Name, and Required Skills).
2.  **MCP Augmentation**: When "Use MCP Server" is enabled, the system uses the **Model Context Protocol** to fetch real-world technical context or specialized prompts.
3.  **Gemini 2.5 Pro**: The augmented prompt is sent to Google's Gemini 2.5 Pro model, which generates structured questions and evaluation criteria.
4.  **Parsing & Validation**: Responses are validated to ensure they match the internal schema before being saved to the database.

### Quick Start & Multi-Role Sets
The generator includes a **Quick Start** feature that allows you to pre-fill fields from existing sets. If you identify a different role using an existing Question Set name, the system automatically appends the new role and its specific questions to that set, creating a multi-role screening guide. Roles associated with a set are displayed as visual pills in the UI.

### Real vs. Mocked Data
-   **Production**: In a live environment, the `aiService.ts` makes real calls to the Google Gemini API and optionally a running MCP server.
-   **Testing**: All AI calls are **mocked** in the test suite (`vitest`). We use `vi.mock` to simulate AI responses, ensuring tests are fast, deterministic, and don't consume API credits. See `AIQuestionGenerator.test.tsx` for examples of how generation is mocked.

## 💾 Data Management

### Database Updates (SQLite)
The backend uses **SQLite** (`database.db`). The schema is managed in `database.js` and includes tables for `users`, `flashcard_sets`, `flashcards`, `roles`, and `skills`.

To manually update the database or add bulk data:
1.  Use a SQLite client (e.g., [DB Browser for SQLite](https://sqlitebrowser.org/)).
2.  Connect to `database.db` in the project root.
3.  **To add a new Role**: Insert a record into the `roles` table.
4.  **To add a Question Set**: Insert into `flashcard_sets`, then link questions in `flashcards` via the `set_id`.
5.  **Authentication**: User accounts are stored in the `users` table with hashed passwords.

### Changing Question Sets
Question sets can be changed dynamically in the UI. When a user selects a set:
1.  The `questionService.ts` fetches the set from the API (or LocalStorage).
2.  The application state updates to display the cards associated with that `set_id`.
3.  New AI-generated questions can be saved into existing or new sets by specifying a "Set Name" during generation.
4.  Switching sets automatically refreshes the Roles & Skills dashboard with relevant data.

## 🛠️ Tech Stack

### Frontend
- **React (TypeScript)**: Core UI framework.
- **Styled-Components**: Method.com themed UI.
- **Vitest & Testing Library**: Modern testing suite with full mocking capabilities.

### Backend
- **Node.js & Express**: API server handling auth and AI proxying.
- **SQLite**: Local, persistent data storage.
- **MCP SDK**: Integration with Model Context Protocol servers.

## 🏁 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- Google Gemini API Key

### Installation
1.  Install dependencies: `npm install`
2.  Create a `.env` file:
    ```env
    GEMINI_API_KEY=your_api_key_here
    JWT_SECRET=your_random_secret_key
    PORT=3001
    ```

### Running the Application

#### Development
```bash
npm run dev
```
This runs the frontend (3000), backend (3001), and a local MCP server concurrently for development with hot-reloading.

#### Production
1.  Build the frontend: `npm run build`
2.  Start the server: `npm start`

Alternatively, run everything in one command:
```bash
npm run production:start
```

In production, the application is served from a single port (default `3001`). 

### Deployment (Render)
When deploying to Render:
-   **Build Command**: `npm install && npm run build`
-   **Start Command**: `npm start`
-   **Environment Variables**: Ensure `GEMINI_API_KEY` and `JWT_SECRET` are set.
-   **Persistent Storage**: If using a Disk (Paid), set `DATABASE_PATH` to the location on your mounted disk (e.g., `/var/data/database.db`).

## 🧪 Testing
Run the full test suite with:
```bash
npm run test:run
```
All external services (API, DB, AI) are mocked during testing to provide a stable environment.

## 📝 License
Internal Method Tool - Unauthorized distribution is prohibited.
