import React, { useState, useEffect } from 'react';
import { InterviewQuestion } from '../../types';
import { 
  generateInterviewQuestions,
  setApiKey, 
  initializeMCP,
  addPromptListener,
  removePromptListener,
  handleTokenizeJob
} from '../../services/aiService';
import { getQuestionSets, deleteQuestionSet } from '../../services/questionService';

interface AIQuestionGeneratorProps {
  onQuestionsGenerated: (questions: InterviewQuestion[], setName: string) => void;
}

const AIQuestionGenerator: React.FC<AIQuestionGeneratorProps> = ({ onQuestionsGenerated }) => {
  const [role, setRole] = useState('');
  const [skills, setSkills] = useState('');
  const [skillLevels, setSkillLevels] = useState<Record<string, string>>({});
  const [questionCategory, setQuestionCategory] = useState('Technical');
  const [questionsPerSkill, setQuestionsPerSkill] = useState(3);
  const [setName, setSetName] = useState('');
  const [associatedRoles, setAssociatedRoles] = useState<string[]>([]);
  const [conversationStyle, setConversationStyle] = useState(false);
  const [includeCode, setIncludeCode] = useState(false);
  const [includeChallenges, setIncludeChallenges] = useState(false);
  const [includeDeepDive, setIncludeDeepDive] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [useMCP, setUseMCP] = useState(true); // Default to MCP for Broad Subject support
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [showPromptPanel, setShowPromptPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'standard' | 'interview'>('standard');
  const [availableSets, setAvailableSets] = useState<any[]>([]);
  
  // Load available sets for pre-filling
  useEffect(() => {
    setAvailableSets(getQuestionSets());
  }, []);

  const handlePreFill = (setId: string) => {
    if (!setId) return;
    const selectedSet = availableSets.find(s => s.id === setId);
    if (selectedSet && selectedSet.cards && selectedSet.cards.length > 0) {
      // Set name
      setSetName(selectedSet.name);
      
      // Extract all unique roles associated with this set
      const uniqueRoles = new Set<string>();
      selectedSet.cards.forEach((card: InterviewQuestion) => {
        if (card.role) {
          uniqueRoles.add(card.role);
        }
      });
      const rolesArray = Array.from(uniqueRoles);
      setAssociatedRoles(rolesArray);

      // Extract role (take from first question) for the input field
      if (selectedSet.cards[0].role) {
        setRole(selectedSet.cards[0].role);
      } else if (rolesArray.length > 0) {
        setRole(rolesArray[0]);
      }
      
      // Extract skills and levels
      const uniqueSkills = new Set<string>();
      const levels: Record<string, string> = {};
      
      selectedSet.cards.forEach((card: InterviewQuestion) => {
        if (card.topic) {
          uniqueSkills.add(card.topic);
          if (card.skillLevel) {
            levels[card.topic] = card.skillLevel;
          }
        }
      });
      
      setSkills(Array.from(uniqueSkills).join(', '));
      setSkillLevels(levels);
    }
  };

  const handleDeleteSet = (setId: string) => {
    if (!setId) return;
    if (window.confirm('Are you sure you want to delete this question set?')) {
      if (deleteQuestionSet(setId)) {
        setAvailableSets(getQuestionSets());
      }
    }
  };
  
  // Check if API key is available from environment variable
  const [hasEnvGeminiKey, setHasEnvGeminiKey] = useState(false);
  
  useEffect(() => {
    // Check if we have API key from environment variable
    console.log('Gemini Environment API key:', process.env.REACT_APP_GEMINI_API_KEY ? 'Available' : 'Not available');
    
    // Check for Gemini API key
    if (process.env.REACT_APP_GEMINI_API_KEY) {
      console.log('Setting hasEnvGeminiKey to true');
      setHasEnvGeminiKey(true);
      // Explicitly set the API key in the service
      setApiKey(process.env.REACT_APP_GEMINI_API_KEY);
    } else {
      console.log('No Gemini environment API key found');
      // If no environment API key, try to load from localStorage
      const savedGeminiKey = localStorage.getItem('gemini_api_key');
      if (savedGeminiKey) {
        setGeminiApiKey(savedGeminiKey);
        // Set it in the service
        setApiKey(savedGeminiKey);
      }
    }
  }, []);
  
  // Update the Gemini API key in the service when it changes
  useEffect(() => {
    if (!hasEnvGeminiKey && geminiApiKey) {
      console.log('Saving Gemini API key to localStorage and setting in service');
      // Save to localStorage for persistence
      localStorage.setItem('gemini_api_key', geminiApiKey);
      // Set in the service
      setApiKey(geminiApiKey);
    } else if (hasEnvGeminiKey && process.env.REACT_APP_GEMINI_API_KEY) {
      console.log('Setting Gemini environment API key in service');
      // Ensure the environment API key is set in the service
      setApiKey(process.env.REACT_APP_GEMINI_API_KEY);
    }
    if (activeTab === 'interview') {
      setConversationStyle(true);
      setIncludeCode(true);
      setIncludeDeepDive(true);
    } else {
      setConversationStyle(false);
      setIncludeCode(false);
      setIncludeDeepDive(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const handleNewPrompt = (prompt: string) => {
      setCurrentPrompt(prompt);
      setShowPromptPanel(true);
    };

    addPromptListener(handleNewPrompt);
    return () => {
      removePromptListener(handleNewPrompt);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!role.trim()) {
      setError('Please enter a Role/Position.');
      return;
    }

    if (!setName.trim()) {
      setError('Please enter a name for this interview question set');
      return;
    }

    // Validation: skills required
    if (!skills.trim()) {
      setError('Please enter at least one skill.');
      return;
    }
    
    // Check if we have the required API key
    if (!hasEnvGeminiKey && !geminiApiKey.trim()) {
      setError('Please enter your Google Gemini API key');
      return;
    }
    
    setError('');
    setIsLoading(true);
    setSuccess(false);
    
    try {
      if (useMCP) {
        console.log('Initiating MCP for Broad Subject Knowledge Augmentation...');
        await initializeMCP();
      }
      
      // Set the API key in the service
      if (!hasEnvGeminiKey) {
        console.log('Setting user-provided Gemini API key');
        setApiKey(geminiApiKey);
      } else {
        console.log('Using Gemini environment API key');
        setApiKey(process.env.REACT_APP_GEMINI_API_KEY || '');
      }
      
      let skillsList = skills.split(',').map(s => s.trim()).filter(s => s.length > 0);

      // If no skills entered but JD provided, use MCP tool logic to extract skills
      if (skillsList.length === 0 && jobDescription.trim()) {
        console.log('Extracting topics from job description...');
        const extractedTopics = handleTokenizeJob(jobDescription);
        if (extractedTopics.length > 0) {
          console.log(`Extracted ${extractedTopics.length} skills:`, extractedTopics);
          skillsList = extractedTopics;
        } else {
          skillsList = ['Key Requirements'];
        }
      }
      
      if (skillsList.length === 0) {
        throw new Error('No valid skills found. Please enter at least one skill.');
      }
      
      const skillsWithLevels = skillsList.map(skillName => ({
        name: skillName,
        level: skillLevels[skillName] || 'Senior'
      }));

      // Call the AI service to generate interview questions
      const generatedQuestions = await generateInterviewQuestions({
        role,
        skills: skillsWithLevels,
        questionCategory,
        questionsPerSkill,
        conversationStyle,
        // jobDescription: jobDescription || undefined,
        includeCode,
        includeChallenges,
        includeDeepDive
      });
      
      if (generatedQuestions.length === 0) {
        throw new Error('No interview questions were generated. Please try again with different topics.');
      }
      
      // Check if we got placeholder content
      const allPlaceholders = generatedQuestions.every(card => 
        card.answer.includes('involves understanding key principles and applying them effectively')
      );
      
      if (allPlaceholders) {
        console.error('All generated questions are placeholders');
        throw new Error(
          'Could not generate AI content. The model may have returned non-specific content or there was a temporary service issue. Please verify your API key/quota and try again.'
        );
      }
      
      onQuestionsGenerated(generatedQuestions, setName);
      setSuccess(true);
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      
      if (err instanceof Error) {
        // Format specific error messages for better user experience
        if (err.message.includes('API key')) {
          setError(`API Key Error: ${err.message} Please verify your Google Gemini API key, quota, and model availability.`);
        } else if (err.message.includes('rate limit') || err.message.includes('quota')) {
          setError(`Rate Limit Error: Google Gemini API rate limit exceeded. Please wait a few minutes and try again.`);
        } else if (err.message.includes('timeout') || err.message.includes('network')) {
          setError(`Network Error: Failed to connect to Google Gemini. Please check your internet connection and try again.`);
        } else {
          setError(`Error: ${err.message}`);
        }
      } else {
        setError(`Failed to generate interview questions with Google Gemini. Please try again later.`);
      }
    } finally {
      setIsLoading(false);
      // Wait a bit before closing the prompt panel so the user can see what was sent
      setTimeout(() => {
        setShowPromptPanel(false);
      }, 3000);
    }
  };

  return (
    <div className="form-container">
      
      <div className="workflow-steps" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#eef2f7', borderRadius: '8px', borderLeft: '4px solid #00aed9' }}>
        <h4 style={{ marginBottom: '10px', color: '#1a2b49' }}>How to generate a new question set:</h4>
        <ol style={{ marginLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>
          <li>
            <strong>Name Your Set:</strong> Give this collection a unique name for easy retrieval.
            <span className="tooltip-icon" title="If you use an existing name, new questions will be appended to that set. This allows you to combine different roles or skill sets into one Question Set—the system adds the new role and its specific questions to the existing collection.">ⓘ</span>
          </li>
          <li>
            <strong>Identify the Role:</strong> Enter the position name (e.g., "Full Stack Developer").
            <span className="tooltip-icon" title="Providing a specific role helps the AI tailor question difficulty and context.">ⓘ</span>
          </li>
          <li>
            <strong>Required Skills:</strong> Manually list key <strong>Skills</strong>.
            <span className="tooltip-icon" title="Enter at least one skill. You have the flexibility to adjust levels for each skill.">ⓘ</span>
          </li>
          <li>
            <strong>Customize:</strong> Toggle dialogue format, code examples, or technical deep-dives.
            <span className="tooltip-icon" title="These toggles change how the AI constructs the answers and scenarios. The AI analyzes the Role and Skills provided to generate targeted technical questions, relevant coding challenges, and expected answers.">ⓘ</span>
          </li>
          <li>
            <strong>Generate:</strong> Click the button at the bottom to build your new interview guide!
            <span className="tooltip-icon" title="The AI uses Google Gemini Pro to process your inputs and generate a comprehensive set of interview questions, screening criteria, and technical answers.">ⓘ</span>
          </li>
        </ol>
      </div>

      {availableSets.length > 0 && (
        <div className="pre-fill-selector-container">
          <label className="form-label" htmlFor="preFillSet">
            Quick Start: Pre-fill from existing set
            <span className="tooltip-icon" title="Use this dropdown to quickly reload parameters from a previously created set. It will automatically populate the Role and Skills fields, allowing you to quickly generate a similar or expanded set.">ⓘ</span>
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select 
              id="preFillSet" 
              className="form-select"
              onChange={(e) => handlePreFill(e.target.value)}
              style={{ flex: 1 }}
              defaultValue=""
            >
              <option value="" disabled>Select a set to auto-fill fields...</option>
              {availableSets.map(set => (
                <option key={set.id} value={set.id}>{set.name} ({set.cards.length} questions)</option>
              ))}
            </select>
            <button 
              type="button" 
              className="btn-danger"
              onClick={() => {
                const select = document.getElementById('preFillSet') as HTMLSelectElement;
                handleDeleteSet(select.value);
              }}
              style={{ marginTop: 0, padding: '0 15px' }}
            >
              Delete Set
            </button>
          </div>
          <div className="text-muted-small" style={{ marginTop: '5px' }}>
            Selecting a set will populate Role, Skills, and Skill Levels based on that set's content. If you use a prefill from existing set, all associated roles will be shown below.
          </div>
        </div>
      )}
      
      <div className="tab-container">
        <button 
          className={`tab-btn ${activeTab === 'standard' ? 'active' : ''}`}
          onClick={() => setActiveTab('standard')}
        >
          General Screening
        </button>
        <button 
          className={`tab-btn ${activeTab === 'interview' ? 'active' : ''}`}
          onClick={() => setActiveTab('interview')}
        >
          Technical Interview <span className="mode-badge-pill">MCP</span>
        </button>
      </div>

      <div className="info-box">
        {activeTab === 'interview' ? (
          <>
            <strong>Technical Interview Mode:</strong> This mode uses the Interview Prep MCP Server to create realistic 
            interviewer/candidate transcripts based on the job description to help screen technical talent.
            <br /><em>Automatically enables Conversation Style and Code Examples.</em>
          </>
        ) : (
          <>
            <strong>General Screening:</strong> Generate standard interview questions and screening criteria for any role using Google Gemini Pro AI.
          </>
        )}
      </div>
      
      <form className="ai-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="setName">Interview Question Set Name</label>
          <input
            id="setName"
            className="form-input"
            type="text"
            value={setName}
            onChange={(e) => setSetName(e.target.value)}
            placeholder="e.g., Candidate Screening - Q3 2026"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="role">Role / Position</label>
          <input
            id="role"
            className="form-input"
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g., Senior Test Engineer or Technical Team Lead"
            required
          />
          {associatedRoles.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {associatedRoles.map(r => (
                <span 
                  key={r} 
                  className="role-pill" 
                  style={{ 
                    backgroundColor: '#eef2f7', 
                    padding: '4px 12px', 
                    borderRadius: '16px', 
                    fontSize: '12px', 
                    color: '#1a2b49',
                    border: '1px solid #d0d7de'
                  }}
                >
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Job description input (optional) - Commented out for now
        <div className="form-group">
          <label className="form-label" htmlFor="jobDescription">Job Description / Role Requirements</label>
          <textarea
            id="jobDescription"
            className="form-textarea"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description or role requirements here to tailor the screening questions (responsibilities, required skills, tools, scenarios)."
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 15 }}>
            <input 
              type="checkbox" 
              id="useMCP" 
              checked={useMCP} 
              onChange={(e) => setUseMCP(e.target.checked)}
            />
            <label className="form-label" htmlFor="useMCP" style={{ marginBottom: 0 }}>
              Use MCP for External Knowledge Augmentation & Verification
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 15 }}>
            <input
              id="jobDescriptionFile"
              type="file"
              accept=".txt,.md,.rtf,.csv,.json,text/*,application/json"
              onChange={(e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                const MAX_SIZE = 1024 * 1024; // 1MB
                if (file.size > MAX_SIZE) {
                  setError('File too large. Please upload a file up to 1 MB.');
                  return;
                }
                setError('');
                setIsReadingFile(true);
                const reader = new FileReader();
                reader.onload = () => {
                  try {
                    let text = String(reader.result || '');
                    // If JSON, try to pretty-print short strings
                    if (file.type === 'application/json' || file.name.endsWith('.json')) {
                      try {
                        const parsed = JSON.parse(text);
                        text = typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
                      } catch {}
                    }
                    setJobDescription(text);
                  } finally {
                    setIsReadingFile(false);
                  }
                };
                reader.onerror = () => {
                  setIsReadingFile(false);
                  setError('Failed to read the selected file.');
                };
                reader.readAsText(file);
              }}
            />
          </div>
          <div className="text-muted-small" style={{ marginTop: '5px' }}>
            You can paste text or upload a text-based file (TXT, MD, RTF, CSV, JSON). The content will guide the AI.
          </div>
        </div>
        */}

        <div className="form-group">
          <label className="form-label" htmlFor="conversationStyle">
            <input
              id="conversationStyle"
              type="checkbox"
              checked={conversationStyle}
              onChange={(e) => setConversationStyle(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Candidate/Interviewer Dialogue Format
          </label>
          <div className="text-muted-small" style={{ marginTop: '5px' }}>
            If checked, the AI will provide sample answers as a dialogue to help interviewers understand how a strong candidate might respond.
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="includeCode">
            <input
              id="includeCode"
              type="checkbox"
              checked={includeCode}
              onChange={(e) => setIncludeCode(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Include Code Examples
          </label>
          <div className="text-muted-small" style={{ marginTop: '5px' }}>
            If checked, the AI will include illustrative code examples in a separate field.
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="includeChallenges">
            <input
              id="includeChallenges"
              type="checkbox"
              checked={includeChallenges}
              onChange={(e) => setIncludeChallenges(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Include Challenges & Pitfalls
          </label>
          <div className="text-muted-small" style={{ marginTop: '5px' }}>
            If checked, the AI will include common challenges and pitfalls for each topic.
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="includeDeepDive">
            <input
              id="includeDeepDive"
              type="checkbox"
              checked={includeDeepDive}
              onChange={(e) => setIncludeDeepDive(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Include Technical Deep Dive <span className="mode-badge-pill">MCP</span>
          </label>
          <div className="text-muted-small" style={{ marginTop: '5px' }}>
            If checked, the AI will utilize MCP tools to provide high-level architectural and technical internals.
          </div>
        </div>
        
        {/* Gemini API Key input */}
        {!hasEnvGeminiKey && (
          <div className="form-group">
            <label className="form-label" htmlFor="geminiApiKey">Google Gemini API Key</label>
            <input
              id="geminiApiKey"
              className="form-input"
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="Enter your Google Gemini API key"
            />
            <div className="text-muted-small" style={{ marginTop: '5px' }}>
              Your API key is stored locally in your browser and is never sent to our servers.
              <br />
              You can get an API key from <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" style={{ color: '#00aed9' }}>Google AI Studio</a>.
            </div>
          </div>
        )}
        
        {/* Show a message if environment API key is available */}
        {hasEnvGeminiKey && (
          <div style={{ padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '4px', marginBottom: '15px' }}>
            <span style={{ color: '#2e7d32' }}>✓</span> Using Google Gemini API key from environment configuration
          </div>
        )}
        
        <div className="form-group">
          <label className="form-label" htmlFor="skills">Required Skills</label>
          <textarea
            id="skills"
            className="form-textarea"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="Enter skills separated by commas (e.g., JavaScript, React, Node.js)"
            required
          />
          <div className="text-muted-small" style={{ marginTop: '5px' }}>
            Enter at least one skill.
          </div>
          
          {skills.split(',').map(s => s.trim()).filter(s => s.length > 0).map(skillName => (
            <div key={skillName} style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label className="form-label" style={{ fontSize: '13px', marginBottom: 0, width: '150px' }}>{skillName} Level:</label>
              <select
                className="form-select"
                style={{ flex: 1, padding: '5px' }}
                value={skillLevels[skillName] || 'Senior'}
                onChange={(e) => setSkillLevels(prev => ({ ...prev, [skillName]: e.target.value }))}
              >
                <option value="Junior">Junior (0-2 years)</option>
                <option value="Mid-level">Mid-level (3-5 years)</option>
                <option value="Senior">Senior (5-10 years)</option>
                <option value="Lead/Staff">Lead / Staff / Principal (10+ years)</option>
              </select>
            </div>
          ))}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="questionCategory">Primary Question Focus</label>
          <select
            id="questionCategory"
            className="form-select"
            value={questionCategory}
            onChange={(e) => setQuestionCategory(e.target.value)}
          >
            <option value="Technical">Technical Proficiency & Tools</option>
            <option value="Behavioral">Behavioral (STAR method, Situational)</option>
            <option value="Problem Solving">Problem Solving & Architecture</option>
            <option value="Cultural">Culture Fit & Values</option>
            <option value="Soft Skills">Communication & Leadership</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor="questionsPerSkill">Questions Per Skill</label>
          <input
            id="questionsPerSkill"
            className="form-input"
            type="number"
            min="1"
            max="20"
            value={questionsPerSkill}
            onChange={(e) => setQuestionsPerSkill(parseInt(e.target.value))}
          />
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <button className="btn-full-width" type="submit" disabled={isLoading || isReadingFile}>
          {isLoading ? 'Generating...' : 'Generate Interview Questions'}
        </button>
      </form>
      
      {isLoading && (
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="loading-text">
            Generating interview questions...
            <br />
            This may take a minute or two depending on the number of skills.
          </div>
        </div>
      )}
      
      {success && (
        <div className="success-message">
          <strong>Success!</strong> Interview questions generated and saved as a new set.
          <br />
          You can now select this set from the dropdown menu at the top of the page.
        </div>
      )}

      <div className={`overlay-dark ${showPromptPanel ? 'open' : ''}`} onClick={() => setShowPromptPanel(false)} />
      <div className={`prompt-side-panel ${showPromptPanel ? 'open' : ''}`}>
        <h3 className="prompt-panel-title">Request to Gemini</h3>
        <p style={{ fontSize: '14px', color: '#666' }}>
          This is the prompt currently being sent to the Gemini AI model.
        </p>
        <pre className="prompt-content-pre">{currentPrompt}</pre>
        <button className="btn-full-width" onClick={() => setShowPromptPanel(false)} style={{ marginTop: '20px' }}>
          Close Panel
        </button>
      </div>
    </div>
  );
};

export default AIQuestionGenerator;
