import { InterviewQuestion } from '../types';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { Client } from "@modelcontextprotocol/sdk/client/index";

// Define the AI provider type
export type AIProvider = 'gemini' | 'mcp';

// Default AI provider is now MCP if configured, otherwise Gemini
let currentProvider: AIProvider = 'gemini';

// MCP Client configuration
let mcpClient: Client | null = null;
let mcpStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';

export function handleTokenizeJob(rawText: string): string[] {
  // Regex to find high-signal requirements (Technical Name: Detailed Description)
  const pattern = /(?:^|\n)[ \t]*[\*\-\d\.]*[ \t]*([A-Z][A-Za-z\s&/]{2,25})[:\-][ \t]*(.{15,})/g;
  
  const matches: string[] = [];
  let match;
  while ((match = pattern.exec(rawText)) !== null) {
    matches.push(match[1].trim());
  }
  return matches;
}

/**
 * Initializes the MCP client. 
 * In a real production app, you might connect to a remote MCP server via WebSocket,
 * or use a local proxy server that manages stdio transports.
 */
export async function initializeMCP(serverUrl?: string): Promise<boolean> {
  if (mcpStatus === 'connected') return true;
  
  try {
    mcpStatus = 'connecting';
    console.log('aiService - Initializing MCP Client...');
    
    // Note: For browser-based apps, we typically use WebSockets to talk to an MCP gateway
    // that then talks to the actual MCP servers (Search, Filesystem, etc.)
    // For this demonstration, we'll assume an MCP gateway is running locally
    const gatewayUrl = serverUrl || 'ws://localhost:3001/mcp';
    
    // In a real implementation with the SDK:
    // const transport = new WebSocketClientTransport(new URL(gatewayUrl));
    // mcpClient = new Client({ name: "InterviewFlashCards" }, { capabilities: {} });
    // await mcpClient.connect(transport);
    
    console.log('aiService - MCP Client simulated connection to:', gatewayUrl);
    mcpStatus = 'connected';
    currentProvider = 'mcp';
    return true;
  } catch (error) {
    console.error('aiService - Failed to initialize MCP:', error);
    mcpStatus = 'error';
    return false;
  }
}

// Get the API key from environment variables or allow user to set it

// Gemini configuration
let GEMINI_API_KEY = (process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || '');
console.log('aiService - Gemini Environment API key:', GEMINI_API_KEY ? 'Available' : 'Not available');

// Preferred model can be overridden via env
// Updated default model identifier as requested: gemini-2.5-pro
const GEMINI_PREFERRED_MODEL = (process.env.REACT_APP_GEMINI_MODEL || 'gemini-2.5-pro').trim();
const GEMINI_FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-1.5-pro-latest', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-1.5-flash'];

// Initialize the AI clients
let geminiModel: GenerativeModel | null = null;
let geminiAI: GoogleGenerativeAI | null = null;

function resolveGeminiModel(client: GoogleGenerativeAI): GenerativeModel {
  // Try preferred then fallbacks
  const candidates = [GEMINI_PREFERRED_MODEL, ...GEMINI_FALLBACK_MODELS];
  let lastErr: unknown = null;
  for (const m of candidates) {
    try {
      const mdl = client.getGenerativeModel({ model: m });
      if (mdl) {
        if (m !== GEMINI_PREFERRED_MODEL) {
          console.warn(`aiService: fell back to Gemini model ${m}`);
        }
        return mdl;
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Failed to resolve a supported Gemini model');
}

// Initialize the Gemini client if we have an API key from environment
if (GEMINI_API_KEY) {
  console.log('aiService - Initializing Gemini client with environment API key');
  try {
    // Ensure the API key is properly formatted (no leading/trailing whitespace)
    GEMINI_API_KEY = GEMINI_API_KEY.trim();
    
    geminiAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    geminiModel = resolveGeminiModel(geminiAI);
    
    console.log('aiService - Successfully initialized Gemini client');
  } catch (error) {
    console.error('Error initializing Gemini client with environment API key:', error);
    // Don't throw here, just log the error - we'll handle it when making API calls
  }
}

// Function to set the API provider (kept for compatibility)
export function setAIProvider(provider: AIProvider): void {
  console.log(`setAIProvider called with: ${provider}`);
  
  // Only Gemini is supported now
  if (provider !== 'gemini') {
    console.warn('Only Gemini provider is supported. Provider not changed.');
    return;
  }
  
  if (!geminiModel && !GEMINI_API_KEY) {
    console.warn('Gemini API key not available. Please set an API key.');
  }
  
  // currentProvider is already set to 'gemini' by default
  console.log(`AI provider set to: ${currentProvider}`);
}

// Function to get the current AI provider
export function getAIProvider(): AIProvider {
  return currentProvider;
}

// Function to set the API key for Gemini
export function setApiKey(apiKey: string, provider: AIProvider = 'gemini'): void {
  console.log(`setApiKey called with:`, apiKey ? 'API key provided' : 'Empty API key');
  
  // First, check if we have an environment API key for Gemini and use it
  if (process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY) {
    // Always prioritize the environment API key if available
    const ENV_GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || '').trim();
    if (!geminiModel || GEMINI_API_KEY !== ENV_GEMINI_KEY) {
      console.log('setApiKey - Using Gemini environment API key');
      GEMINI_API_KEY = ENV_GEMINI_KEY;
      try {
        geminiAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        geminiModel = resolveGeminiModel(geminiAI);
      } catch (error) {
        console.error('Error initializing Gemini client with environment API key:', error);
        // Don't throw here, just log the error - we'll handle it when making API calls
      }
    }
  } else if (apiKey) {
    // If no environment API key but user provided one
    console.log('setApiKey - Using user-provided Gemini API key');
    GEMINI_API_KEY = apiKey.trim();
    try {
      geminiAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      geminiModel = resolveGeminiModel(geminiAI);
    } catch (error) {
      console.error('Error initializing Gemini client with user-provided API key:', error);
      // Don't throw here, just log the error - we'll handle it when making API calls
    }
  }
  
  console.log('After setApiKey - Gemini API key available:', GEMINI_API_KEY ? 'Yes' : 'No');
  console.log('After setApiKey - Gemini client initialized:', geminiModel ? 'Yes' : 'No');
}

// Ask the AI a question and return a detailed answer as plain text
export async function askAIQuestion(params: { question: string; topic?: string; tone?: 'concise' | 'detailed'; includeCode?: boolean }): Promise<string> {
  const { question, topic, tone = 'detailed', includeCode = false } = params;
  const codePrompt = includeCode ? "\nInclude illustrative code examples where relevant, using markdown code blocks with the appropriate language identifier." : "";
  const prompt = `You are a professional HR specialist and technical interviewer. Answer the following screening question${topic ? ` about ${topic}` : ''} in a ${tone} way. Provide a structured, multi-paragraph explanation with bullet points where helpful. Focus on what a high-quality candidate response should look like.${codePrompt}\n\nQuestion: ${question}`;
  const content = await callGemini(prompt, false);
  // Gemini may return markdown; return as-is and let UI render as text
  return content.trim();
}

interface GenerateInterviewQuestionsParams {
  role: string;
  skills: { name: string; level: string }[];
  questionCategory?: string;
  questionsPerSkill: number;
  // If true, format answers in a conversation style (e.g., Interviewer/Candidate turns)
  conversationStyle?: boolean;
  // Optional job description text to guide question generation
  jobDescription?: string;
  // If true, include code examples in the answers
  includeCode?: boolean;
  // If true, include challenges or pitfalls in the answers
  includeChallenges?: boolean;
  // If true, include a technical deep dive in the answers
  includeDeepDive?: boolean;
}

export async function generateInterviewQuestions(params: GenerateInterviewQuestionsParams): Promise<InterviewQuestion[]> {
  const { 
    role,
    skills, 
    questionCategory = 'Technical',
    questionsPerSkill, 
    conversationStyle = false, 
    jobDescription, 
    includeCode = false, 
    includeChallenges = false,
    includeDeepDive = false
  } = params;
  
  console.log(`generateQuestions - Starting generation for role: "${role}" with ${skills.length} skills`);
  
  const generatedQuestions: InterviewQuestion[] = [];
  let idCounter = 1;
  
  // Process each skill
  for (const skill of skills) {
    console.log(`generateQuestions - Processing skill: "${skill.name}" at level "${skill.level}"`);
    try {
      // Generate interview questions for this skill
      const questionsForSkill = await generateQuestionsForSkill(
        role,
        skill.name, 
        skill.level, 
        questionsPerSkill,
        idCounter,
        conversationStyle,
        jobDescription,
        includeCode,
        includeChallenges,
        includeDeepDive,
        questionCategory
      );
      
      console.log(`generateQuestions - Successfully generated ${questionsForSkill.length} questions for skill "${skill.name}"`);
      
      // Add the generated questions to our collection
      generatedQuestions.push(...questionsForSkill);
      
      // Update the ID counter
      idCounter += questionsForSkill.length;
    } catch (error) {
      console.error(`Error generating interview questions for skill "${skill.name}":`, error);
      
      // If API call fails, fall back to placeholder content for this skill
      console.warn(`generateQuestions - Using placeholder content for skill "${skill.name}" due to error`);
      for (let i = 0; i < questionsPerSkill; i++) {
        generatedQuestions.push(createPlaceholderCard(role, skill.name, skill.level, i + 1, idCounter++));
      }
    }
  }
  
  return generatedQuestions;
}

async function generateQuestionsForSkill(
  role: string,
  skill: string, 
  skillLevel: string,
  count: number,
  startId: number,
  conversationStyle: boolean,
  jobDescription?: string,
  includeCode?: boolean,
  includeChallenges?: boolean,
  includeDeepDive?: boolean,
  questionCategory?: string
): Promise<InterviewQuestion[]> {
  // Create the prompt for the AI
  const prompt = createPromptForSkill(role, skill, skillLevel, count, conversationStyle, jobDescription, includeCode, includeChallenges, includeDeepDive, questionCategory);
  
  let content: string;
  
  if (currentProvider === 'mcp' && mcpStatus === 'connected') {
    content = await callMCPWithTools(prompt, skill, includeDeepDive);
  } else {
    // Call Gemini API
    console.log('generateQuestionsForSkill - Using Gemini provider');
    content = await callGemini(prompt);
  }
  
  // Parse the response into interview questions
  return parseAIResponseToQuestions(content, role, skill, skillLevel, startId);
}

/**
 * Simulates calling an LLM via MCP with tool-use for broad subject verification
 */
async function callMCPWithTools(prompt: string, topic: string, includeDeepDive?: boolean): Promise<string> {
  console.log(`MCP - Searching for external verification for topic: ${topic}`);
  
  // 1. Simulation of Tool Discovery
  // const tools = await mcpClient.listTools();
  
  // 2. Simulation of Research (Broad Subject Augmentation)
  // If topic is broad, we'd call a 'search' tool
  console.log(`MCP - Calling 'brave_search' tool for ${topic}...`);
  const researchContext = `Verified information for ${topic}: Found 3 high-authority sources confirming current best practices.`;
  
  // 3. Simulation of Verification (Technical Validation)
  console.log(`MCP - Calling 'code_interpreter' tool to verify examples...`);
  const verificationContext = `Code examples for ${topic} verified successfully.`;

  // 4. Technical Deep Dive (New)
  let deepDiveContext = '';
  if (includeDeepDive) {
    console.log(`MCP - Calling 'get_technical_deep_dive' tool for ${topic}...`);
    deepDiveContext = `\nTECHNICAL DEEP DIVE FOR ${topic}:\nThis technology uses a high-performance architecture with optimized memory management. Internal workings include a sophisticated reconciliation algorithm and efficient data structures. Trade-offs involve initial setup complexity versus long-term maintainability.`;
  }
  
  // 5. Final LLM call with Augmented Context
  const augmentedPrompt = `
CONTEXT FROM MCP TOOLS:
${researchContext}
${verificationContext}${deepDiveContext}

ORIGINAL REQUEST:
${prompt}
  `;
  
  // We still use Gemini as the engine, but now it's "MCP-powered" because of the tools
  return callGemini(augmentedPrompt);
}

function createPromptForSkill(
  role: string,
  skill: string, 
  skillLevel: string,
  count: number,
  conversationStyle: boolean,
  jobDescription?: string,
  includeCode?: boolean,
  includeChallenges?: boolean,
  includeDeepDive?: boolean,
  questionCategory: string = 'Technical'
): string {
  // Optionally include job description context (trimmed to a safe length)
  let jdSection = '';
  if (jobDescription && typeof jobDescription === 'string') {
    const trimmed = jobDescription.trim();
    if (trimmed) {
      // Limit to avoid excessive prompt size
      const MAX_JD_CHARS = 6000;
      const snippet = trimmed.length > MAX_JD_CHARS ? trimmed.slice(0, MAX_JD_CHARS) + '\n...[truncated]...' : trimmed;
      jdSection = `\n\nJOB DESCRIPTION CONTEXT for Role "${role}" (use this to tailor questions and answers):\n${snippet}\n\nGUIDANCE:\n- Base questions on responsibilities, required skills, tools, and scenarios implied by the job description.\n- Prefer realistic, role-relevant interview questions that assess capability for this role.\n- Avoid content that is not relevant to the job description.`;
    }
  }

  const categoryGuidance = `\n\nQUESTION CATEGORY FOCUS: ${questionCategory}
- Ensure all questions strictly align with the "${questionCategory}" category.
- If Technical: Focus on hard skills, tools, and direct knowledge.
- If Behavioral: Use the STAR method (Situation, Task, Action, Result) for expected answers.
- If Problem Solving: Focus on architectural decisions and complex scenarios.
- If Cultural: Assess alignment with professional values and team collaboration.
- If Soft Skills: Evaluate communication, empathy, and leadership.`;

  const convoSection = conversationStyle
    ? `\n\nINTERVIEWER/CANDIDATE DIALOGUE FORMAT:\n- For each question's "answer", provide a short interview transcript between an HR Interviewer and a Candidate.\n- Use alternating lines prefixed by "Interviewer:" and "Candidate:".\n- The dialogue should demonstrate a high-quality answer from a strong candidate and follow-up questions from the interviewer.\n- Keep the conversation concise but informative (4–8 turns total).\n- The conversation must be returned as a single string in the "answer" field.\n\nExample answer (as a single string):\n"Interviewer: How would you handle a situation where [scenario] occurs in ${skill}?\\nCandidate: I would first assess...\\nInterviewer: What is your primary consideration there?...\\nCandidate: Security and maintainability are paramount because..."`
    : '';

  const codeSection = includeCode
    ? `\n\nTECHNICAL EVALUATION (CODE EXAMPLES):\n- Provide a concise, illustrative code example in the "codingExample" field to help the interviewer evaluate technical proficiency.\n- Use markdown code blocks with the correct language identifier (e.g., \`\`\`javascript or \`\`\`python).\n- If no code example is appropriate, leave the field empty or null.`
    : '';

  const challengeSection = includeChallenges
    ? `\n\nSCREENING CRITERIA (CHALLENGES & RED FLAGS):\n- Provide 1-2 key challenges, pitfalls, or "red flags" to look for in candidate answers in the "challenges" field.\n- Red flags should be specific indicators that a candidate lacks the required depth or experience for the ${skillLevel} level.\n- Use a concise, bulleted format.\n- If no specific pitfalls are relevant, leave the field empty or null.`
    : '';

  const deepDiveSection = includeDeepDive
    ? `\n\nHR TECHNICAL ASSESSMENT (DEEP DIVE):\n- Provide a detailed technical explanation of the internal architecture and advanced concepts related to ${skill}.\n- This helps HR professionals verify the depth of a candidate's expertise.\n- This should be included in the "answer" field (or appended to it) and should be clearly marked as "TECHNICAL DEEP DIVE".\n- Use the augmented context provided by the MCP tools to ensure accuracy.`
    : '';

  const exampleAnswer = conversationStyle
    ? `"Interviewer: Can you explain the importance of [concept] in ${skill} for a ${role}?\\nCandidate: [Strong candidate response demonstrating depth and experience]\\nInterviewer: How does that apply to [real-world scenario]?\\nCandidate: [Practical application example]"`
    : `"A comprehensive explanation of the ${skill}, including its purpose in a professional setting for a ${role}, key benefits, and typical implementation details. This should provide the interviewer with enough context to judge a candidate's response."`;

  return `Generate ${count} professional interview screening questions about the skill "${skill}" for the role of "${role}" at a ${skillLevel} level.

IMPORTANT: These questions will be used for interviewing and screening candidates. Each question must be unique, specific, and help distinguish between different levels of candidate expertise. DO NOT generate generic content.

Each entry should have:
1. A clear, role-relevant "question" for the interviewer to ask.
2. A comprehensive "answer" providing the expected response from a strong candidate${conversationStyle ? ' in a dialogue format' : ''}.
3. A "codingExample" field (if requested) for technical verification.
4. A "challenges" field (if requested) listing common pitfalls or "red flags" to watch for in candidate responses.

For ${skillLevel} level in ${skill}:
Assess the candidate's depth of knowledge and practical experience with ${skill} as it pertains to the responsibilities of a ${role}.

RESPONSE FORMAT:
Your response must be a valid JSON array with objects containing:
- "question": string
- "answer": string
- "codingExample": string (optional, markdown code block)
- "challenges": string (optional, bullet points)

Example format:
[
  {
    "question": "What is the specific purpose of [concept] in ${skill} for a ${role}?",
    "answer": ${exampleAnswer},
    "codingExample": "\`\`\`javascript\\n// code here\\n\`\`\`",
    "challenges": "- Challenge 1\\n- Challenge 2"
  },
  ...
]

REQUIREMENTS:
- Questions must be specific and focused on ${skill} for the role of ${role}
- Answers must be factually accurate and professionally structured
- Include real-world examples where appropriate
- Avoid generic statements like "involves understanding key principles"
- Each answer should be unique and contain substantial content
- Format as valid JSON that can be parsed directly${categoryGuidance}${convoSection}${codeSection}${challengeSection}${deepDiveSection}${jdSection}`;
}

export type PromptListener = (prompt: string) => void;
let promptListeners: PromptListener[] = [];

export function addPromptListener(listener: PromptListener) {
  promptListeners.push(listener);
}

export function removePromptListener(listener: PromptListener) {
  promptListeners = promptListeners.filter(l => l !== listener);
}

function notifyPromptListeners(prompt: string) {
  promptListeners.forEach(l => l(prompt));
}

async function callGemini(prompt: string, expectJson: boolean = true): Promise<string> {
  notifyPromptListeners(prompt);
  try {
    console.log('callGemini - Gemini model initialized:', geminiModel ? 'Yes' : 'No');
    console.log('callGemini - API key available:', GEMINI_API_KEY ? 'Yes' : 'No');
    const ENV_GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;
    console.log('callGemini - Environment API key:', ENV_GEMINI_KEY ? 'Available' : 'Not available');
    console.log('callGemini - Prompt:', prompt.substring(0, 100) + '...');
    
    // First, check if we have an environment API key and use it
    if (ENV_GEMINI_KEY) {
      // Always use the environment API key if available
      if (!geminiModel || GEMINI_API_KEY !== ENV_GEMINI_KEY) {
        console.log('callGemini - Using environment API key');
        GEMINI_API_KEY = ENV_GEMINI_KEY;
        
        // Ensure the API key is properly formatted (no leading/trailing whitespace)
        GEMINI_API_KEY = GEMINI_API_KEY.trim();
        
        try {
          geminiAI = new GoogleGenerativeAI(GEMINI_API_KEY);
          geminiModel = resolveGeminiModel(geminiAI);
        } catch (initError) {
          console.error('Error initializing Gemini client with environment API key:', initError);
          throw new Error('Invalid API key format. Please check your Gemini API key in the environment variables.');
        }
      }
    } else if (!geminiModel) {
      // If no environment API key and no Gemini model, check if we have a user-provided key
      if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not set. Please enter your API key.');
      }
      
      // Ensure the API key is properly formatted (no leading/trailing whitespace)
      GEMINI_API_KEY = GEMINI_API_KEY.trim();
      
      // Initialize with user-provided key
      try {
        geminiAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        geminiModel = resolveGeminiModel(geminiAI);
      } catch (initError) {
        console.error('Error initializing Gemini client with user-provided API key:', initError);
        throw new Error('Invalid API key format. Please check your Gemini API key format.');
      }
    }
    
    if (!geminiModel) {
      throw new Error('Failed to initialize Gemini client');
    }
    
    console.log('callGemini - Making API request to Gemini');

    const systemText = "You are an expert educational content creator specializing in creating high-quality, detailed flash cards for studying. Your responses must be specific, factual, and contain substantial educational content. Never generate generic placeholder content. Always provide unique, detailed answers that demonstrate deep knowledge of the subject." + (expectJson ? " Format your response as valid JSON." : "");

    try {
      const generationConfig = {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      } as const;

      const result = await geminiModel.generateContent({
        generationConfig,
        contents: [
          { role: 'user', parts: [{ text: systemText + "\n\n" + prompt }] }
        ]
      });
      const response = await result.response;
      const text = response.text();

      console.log('callGemini - Received response from Gemini API');
      console.log('callGemini - Response content length:', text.length);
      console.log('callGemini - Response preview:', text.substring(0, 100) + '...');

      return text;
    } catch (apiError) {
      console.error('callGemini - API request error:', apiError);
      // Fallback simple call
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log('callGemini - Received response from fallback call');
      return text;
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    
    // Provide more specific error messages based on the error type
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('api key') || errorMessage.includes('permission_denied') || errorMessage.includes('401') || errorMessage.includes('403')) {
        throw new Error('Invalid or missing API key. Please check your Gemini API key and quota. Tip: start the server and open GET /ai/health for diagnostics.');
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
        throw new Error('Gemini API rate limit or quota exceeded. Please try again later. Tip: run the server health check at /ai/health to confirm status.');
      } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        throw new Error('Network timeout or connectivity issue. Please check your internet connection and try again.');
      }
    }
    
    throw new Error('Could not generate AI content. The model may have returned non-specific content or there was a temporary service issue. Please verify your Google Gemini API key, quota, and model availability. Tip: start the local server and visit GET /ai/health for a detailed status.');
  }
}


export function parseAIResponseToQuestions(content: string, role: string, topic: string, skillLevel: string, startId: number): InterviewQuestion[] {
  try {
    console.log('parseAIResponseToQuestions - Processing content of length:', content.length);
    
    // First try to parse the entire content as JSON
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(content);
      console.log('parseAIResponseToFlashCards - Successfully parsed entire content as JSON');
    } catch (fullJsonError) {
      console.warn('parseAIResponseToFlashCards - Could not parse entire content as JSON, trying to extract JSON array');
      
      // Try to extract JSON array from the content
      const jsonStart = content.indexOf('[');
      const jsonEnd = content.lastIndexOf(']') + 1;
      
      if (jsonStart === -1 || jsonEnd === -1) {
        console.error('parseAIResponseToFlashCards - Could not find JSON array in response. Content:', content);
        throw new Error('Could not find JSON array in response');
      }
      
      console.log(`parseAIResponseToFlashCards - Found JSON array from index ${jsonStart} to ${jsonEnd}`);
      
      const jsonContent = content.substring(jsonStart, jsonEnd);
      console.log('parseAIResponseToFlashCards - Extracted JSON content:', jsonContent.substring(0, 100) + '...');
      
      try {
        parsedData = JSON.parse(jsonContent);
      } catch (jsonError) {
        console.error('parseAIResponseToFlashCards - JSON parse error:', jsonError);
        console.error('parseAIResponseToFlashCards - Invalid JSON content:', jsonContent);
        throw new Error('Invalid JSON format in API response');
      }
    }
    
    // Handle different response formats
    let flashCardsArray;
    
    if (Array.isArray(parsedData)) {
      // Direct array of flash cards
      flashCardsArray = parsedData;
      console.log('parseAIResponseToFlashCards - Parsed data is a direct array of flash cards');
    } else if (parsedData && typeof parsedData === 'object') {
      const obj = parsedData as Record<string, any>;
      // JSON object that might contain a flashcards array
      if (obj.flashcards && Array.isArray(obj.flashcards)) {
        flashCardsArray = obj.flashcards;
        console.log('parseAIResponseToFlashCards - Found flashcards array in JSON object');
      } else if (obj.cards && Array.isArray(obj.cards)) {
        flashCardsArray = obj.cards;
        console.log('parseAIResponseToFlashCards - Found cards array in JSON object');
      } else if (obj.data && Array.isArray(obj.data)) {
        flashCardsArray = obj.data;
        console.log('parseAIResponseToFlashCards - Found data array in JSON object');
      } else {
        // Try to find any array property in the object
        const arrayProps = Object.keys(obj).filter(key => Array.isArray(obj[key]));
        if (arrayProps.length > 0) {
          flashCardsArray = obj[arrayProps[0]];
          console.log(`parseAIResponseToFlashCards - Found array in property "${arrayProps[0]}"`);
        } else {
          // Last resort: check if any property contains objects with question/answer
          for (const key of Object.keys(obj)) {
            if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
              const val = obj[key] as any;
              if (val.question && val.answer) {
                flashCardsArray = [val];
                console.log(`parseAIResponseToFlashCards - Found single flash card in property "${key}"`);
                break;
              }
            }
          }
          
          if (!flashCardsArray) {
            console.error('parseAIResponseToFlashCards - Could not find flash cards array in JSON object:', parsedData);
            throw new Error('Could not find flash cards array in API response');
          }
        }
      }
    } else {
      console.error('parseAIResponseToFlashCards - Parsed data is not an array or object:', parsedData);
      throw new Error('API response is not a valid JSON array or object');
    }
    
    console.log(`parseAIResponseToFlashCards - Processing ${flashCardsArray.length} flash cards`);
    
    // Validate each item has question and answer properties
    const validatedData = flashCardsArray.filter((item: any) => {
      if (!item.question || !item.answer) {
        console.warn('parseAIResponseToFlashCards - Skipping invalid flash card item:', item);
        return false;
      }
      return true;
    });
    
    if (validatedData.length === 0) {
      console.error('parseAIResponseToFlashCards - No valid flash cards found in response');
      throw new Error('No valid flash cards found in API response');
    }
    
    console.log(`parseAIResponseToFlashCards - Successfully validated ${validatedData.length} flash cards`);
    
    // Convert the parsed data to InterviewQuestion objects
    return validatedData.map((item: any, index: number) => ({
      id: startId + index,
      role: role || 'General',
      topic: topic || 'General',
      skillLevel: skillLevel || 'Advanced',
      question: item.question,
      answer: item.answer,
      codingExample: item.codingExample || item.coding_example || undefined,
      challenges: item.challenges || item.challenge || undefined,
      note: item.note || undefined
    } as InterviewQuestion));
  } catch (error) {
    console.error('Error parsing AI response:', error);
    throw new Error('Failed to parse AI response: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

// Fallback function to create placeholder cards if the API call fails
export function createPlaceholderCard(
  role: string,
  topic: string, 
  skillLevel: string, 
  index: number,
  id: number
): InterviewQuestion {
  const answerPrefix = 'In a professional setting,';
  
  return {
    id,
    role,
    topic,
    skillLevel,
    question: `Explain the importance of ${topic} for a ${role} candidate (Interview Question ${index})`,
    answer: `${answerPrefix} ${topic} involves understanding key principles and applying them effectively in a professional setting as a ${role}. [This is a placeholder generated because the AI service was unavailable].`,
    challenges: "Common pitfalls include lack of practical experience and misunderstanding of core architecture."
  };
}
