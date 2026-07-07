### Method HR AI & MCP (Model Context Protocol) Integration

This tool utilizes the **Model Context Protocol (MCP)** to enhance candidate screening, specifically for role-specific technical verification and factual accuracy beyond the AI model's standard training data.

#### The "Recruiter's Assistant" Workflow

Instead of relying solely on **Gemini 2.5 Pro**'s internal knowledge, the MCP integration enables a "Tool-Use Loop" that acts as a technical assistant for HR professionals:

1.  **Requirement Augmentation**: For specialized roles, the system uses MCP tools to fetch the latest industry standards, ensuring the screening questions are up-to-date.
2.  **Technical Verification**: For technical roles, the system uses MCP tools to validate generated code snippets and provide high-level architectural internals to help recruiters verify candidate expertise.
3.  **Fact-Checking**: MCP provides a "source of truth" layer, ensuring the AI verifies technical claims against external documentation or runtime environments.

#### Architecture

-   **Client**: The React frontend acts as an MCP Client (via the `@modelcontextprotocol/sdk`).
-   **Service**: `src/services/aiService.ts` handles the "Tool-Use Loop" where the AI determines if it needs external technical validation.
-   **Gateway**: The app communicates with MCP servers to fetch augmented data during question generation.

#### Using MCP in the Interview Generator

In the **Interview Question Generator** page:
1.  Ensure **Gemini 2.5 Pro** is configured with an API Key.
2.  Enable the toggle **"Use MCP for External Knowledge Augmentation & Verification"** (enabled by default).
3.  The system will perform technical research and verification for the selected role before generating the interview questions.

#### Automated Requirement Extraction

The generator automatically extracts high-signal requirements from job descriptions using the **Interview Prep MCP Server** logic:

1.  **Input**: Paste a Job Description (JD) into the generator.
2.  **Logic**: The system identifies technical requirements and core competencies (e.g., `React`, `System Design`, `Agile Methodologies`).
3.  **Output**: It generates a custom list of role-categories to ensure every key requirement has corresponding screening questions.

#### Transparency for Recruiters: The "Research" View

The **Prompt Side Panel** provides recruiters with full transparency into the AI's internal assessment process:

-   **Visible Prompts**: When generating questions, a panel shows the exact screening criteria being sent to the AI.
-   **Augmented Context**: Recruiters can see how MCP-augmented context (verified technical data) is used to refine the screening guide.
-   **Auto-Close**: The panel disappears after the generation finishes, ensuring a clean workspace.

#### Built-in Interview Prep MCP Server Tools

The `interview-prep-mcp-server` provides several tools tailored for HR:

- `tokenize_job_description`: Cleans raw JD text into structured requirements, separating "fluff" from core role competencies.
- `generate_interview_prep`: Creates structured interview sessions with questions, expected answers, and dialogue samples based on the role requirements.
- `get_security_best_practices`: Provides a report on security considerations for specific technologies to help screen for security-conscious candidates.
- `get_technical_deep_dive`: Provides high-level architectural internals for a concept, helping recruiters ask "Deep Dive" questions and verify candidate responses.

#### Why use this for HR?

Standard AI models have a knowledge cutoff. Screening for roles involving modern technology (released in the last few months) requires live data. MCP provides that "live" connection, ensuring Method HR's interview questions are always relevant, accurate, and professional.
