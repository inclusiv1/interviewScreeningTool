const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { MockUCPPool } = require('./ucp-poc.js');
require('dotenv').config();

// Initialize Gemini AI for tool use if needed
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || '').trim();
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// POC: Initialize UCP Pool for future Oracle integration
const ucpPool = new MockUCPPool({
  poolAlias: 'InterviewPrepUCPPool',
  poolMax: 10,
  poolMin: 2
});

const server = new Server(
  {
    name: "interview-prep-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Logic Handler for tokenize_job_description
 * Cleans raw job description text into structured tokens for flashcard generation.
 */
function handleTokenizeJob(rawText, targetDeck = "interview_prep.json") {
  // Regex to find high-signal requirements (Technical Name: Detailed Description)
  // Matches lines like "React: 3+ years experience" or "- TypeScript: Strong understanding"
  // It filters out common JD fluff like 'competitive salary' or 'team player'
  const pattern = /(?:^|\n)[ \t]*[\*\-\d\.]*[ \t]*([A-Z][A-Za-z\s&/]{2,25})[:\-][ \t]*(.{15,})/g;
  
  const matches = [];
  let match;
  while ((match = pattern.exec(rawText)) !== null) {
    matches.push(match);
  }

  // Map to structured Tokens
  const tokens = matches.map(m => ({
    front: m[1].trim(),
    back: m[2].trim(),
    tags: ["automated-extraction"]
  }));

  if (tokens.length === 0) {
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({ error: "No structured requirements found. Try formatting the JD with 'Topic: Description'." }) 
      }] 
    };
  }

  // Save as an MCP Resource (Filesystem)
  // In a real MCP server, we might use the resources capability, 
  // but here we follow the logic provided in the issue.
  try {
    fs.writeFileSync(targetDeck, JSON.stringify({ deck_name: targetDeck, cards: tokens }, null, 4));
  } catch (err) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ error: `Failed to save deck: ${err.message}` })
      }],
      isError: true
    };
  }

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        message: `Successfully tokenized ${tokens.length} items.`,
        preview: tokens.slice(0, 3) // Show the first 3 to the UI
      })
    }]
  };
}

/**
 * Logic Handler for generate_interview_prep
 * Creates a prep session with questions and answers using a conversation model.
 */
async function handleGenerateInterviewPrep(jobDescription, topics = [], skillLevel = "Beginner") {
  if (!genAI) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: "Gemini API key not configured on MCP server." }) }],
      isError: true
    };
  }

  // Use a model based on server.js fallbacks
  const modelName = process.env.GEMINI_MODEL || process.env.REACT_APP_GEMINI_MODEL || "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `
    You are an expert technical interviewer. Based on the following job description and topics, create a comprehensive interview prep session.
    
    JOB DESCRIPTION:
    ${jobDescription}
    
    TOPICS TO COVER:
    ${topics.join(", ")}
    
    SKILL LEVEL:
    ${skillLevel}
    
    INSTRUCTIONS:
    - Generate 5-8 interview questions.
    - For each question, provide a detailed answer in a conversation style (Interviewer vs. Candidate).
    - Include code snippets where relevant to demonstrate technical proficiency.
    - Focus on practical, real-world scenarios related to the job description.
    - Format the response as a JSON array of objects, where each object has:
      "question": The interview question.
      "answer": The conversation-style answer transcript.
      "topic": The specific topic the question relates to.
      "coding_example": (Optional) A code snippet illustrating the answer.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Attempt to extract JSON from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const sessionData = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw_text: text };

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          message: "Interview prep session generated successfully.",
          session: sessionData
        })
      }]
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: `Failed to generate prep session: ${err.message}` }) }],
      isError: true
    };
  }
}

/**
 * Logic Handler for get_security_best_practices
 */
async function handleGetSecurityBestPractices(topic, category = "General") {
  if (!genAI) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: "Gemini API key not configured on MCP server." }) }],
      isError: true
    };
  }

  const modelName = process.env.GEMINI_MODEL || process.env.REACT_APP_GEMINI_MODEL || "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `
    As a cybersecurity expert, provide a detailed report on security best practices, common vulnerabilities (e.g., OWASP), and mitigations for the following topic:
    
    TOPIC: ${topic}
    CATEGORY: ${category}
    
    INSTRUCTIONS:
    - List 3-5 critical security vulnerabilities specific to this topic.
    - For each vulnerability, provide a clear mitigation strategy.
    - Include code snippets showing "Insecure" vs. "Secure" implementations where applicable.
    - Provide general best practices for securing systems using this technology.
    - Format as a structured JSON object.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = (await result.response).text();
    return { content: [{ type: "text", text }] };
  } catch (err) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: `Failed to fetch security practices: ${err.message}` }) }],
      isError: true
    };
  }
}

/**
 * Logic Handler for get_technical_deep_dive
 */
async function handleGetTechnicalDeepDive(concept, depth = "advanced") {
  if (!genAI) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: "Gemini API key not configured on MCP server." }) }],
      isError: true
    };
  }

  const modelName = process.env.GEMINI_MODEL || process.env.REACT_APP_GEMINI_MODEL || "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `
    Provide a high-level technical deep dive into the following concept:
    
    CONCEPT: ${concept}
    DEPTH: ${depth}
    
    INSTRUCTIONS:
    - Explain the architecture and internal workings of this concept.
    - Discuss performance implications and trade-offs.
    - Provide advanced use cases or patterns.
    - Use technical diagrams (described in text/mermaid) if helpful.
    - Format as a clear, detailed technical report (Markdown).
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = (await result.response).text();
    return { content: [{ type: "text", text }] };
  } catch (err) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: `Failed to fetch technical deep dive: ${err.message}` }) }],
      isError: true
    };
  }
}

/**
 * Logic Handler for ucp_query_poc
 * Demonstrates how UCP would be used to query an Oracle DB in the future.
 */
async function handleUCPQueryPOC(sql, params = []) {
  try {
    const conn = await ucpPool.getConnection();
    const result = await conn.execute(sql, params);
    await conn.close();
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          message: "UCP Query executed successfully (POC Mock)",
          result: result.rows,
          stats: ucpPool.getStatistics()
        })
      }]
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: `UCP POC Error: ${err.message}` }) }],
      isError: true
    };
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "tokenize_job_description",
        description: "Cleans raw job description text into structured tokens (Topic/Context) for flashcard generation.",
        inputSchema: {
          type: "object",
          properties: {
            raw_text: { type: "string", description: "The pasted job description text" },
            target_deck: { type: "string", description: "Name of the flashcard deck", default: "interview_prep.json" }
          },
          required: ["raw_text"]
        }
      },
      {
        name: "generate_interview_prep",
        description: "Creates a prep session with questions and answers based on job description and topics using a conversation model.",
        inputSchema: {
          type: "object",
          properties: {
            jobDescription: { type: "string", description: "The job description" },
            topics: { type: "array", items: { type: "string" }, description: "Specific topics to cover" },
            skillLevel: { type: "string", description: "Targeted skill level", default: "Beginner" }
          },
          required: ["jobDescription"]
        }
      },
      {
        name: "get_security_best_practices",
        description: "Provides security vulnerabilities, best practices, and mitigations for a given topic or category.",
        inputSchema: {
          type: "object",
          properties: {
            topic: { type: "string", description: "The technical topic (e.g., React, Node.js, SQL)" },
            category: { type: "string", description: "Optional category (e.g., Web, Mobile, Cloud, Infrastructure)" }
          },
          required: ["topic"]
        }
      },
      {
        name: "get_technical_deep_dive",
        description: "Provides a detailed technical explanation of a specific concept, including architecture, internals, and advanced usage.",
        inputSchema: {
          type: "object",
          properties: {
            concept: { type: "string", description: "The concept to dive into (e.g., React Reconciliation, Node.js Event Loop)" },
            depth: { type: "string", description: "Level of detail", enum: ["standard", "advanced", "expert"], default: "advanced" }
          },
          required: ["concept"]
        }
      },
      {
        name: "ucp_query_poc",
        description: "POC tool demonstrating Oracle Universal Connection Pool (UCP) usage for high-performance database interactions.",
        inputSchema: {
          type: "object",
          properties: {
            sql: { type: "string", description: "SQL query to execute" },
            params: { type: "array", items: { type: "string" }, description: "Query parameters" }
          },
          required: ["sql"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "tokenize_job_description") {
    const { raw_text, target_deck } = request.params.arguments;
    return handleTokenizeJob(raw_text, target_deck);
  }
  if (request.params.name === "generate_interview_prep") {
    const { jobDescription, topics, skillLevel } = request.params.arguments;
    return handleGenerateInterviewPrep(jobDescription, topics, skillLevel);
  }
  if (request.params.name === "get_security_best_practices") {
    const { topic, category } = request.params.arguments;
    return handleGetSecurityBestPractices(topic, category);
  }
  if (request.params.name === "get_technical_deep_dive") {
    const { concept, depth } = request.params.arguments;
    return handleGetTechnicalDeepDive(concept, depth);
  }
  if (request.params.name === "ucp_query_poc") {
    const { sql, params } = request.params.arguments;
    return handleUCPQueryPOC(sql, params);
  }
  throw new Error(`Tool not found: ${request.params.name}`);
});

module.exports = { 
  handleTokenizeJob, 
  handleGenerateInterviewPrep,
  handleGetSecurityBestPractices,
  handleGetTechnicalDeepDive,
  handleUCPQueryPOC
};

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Interview Prep MCP Server running on stdio");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
