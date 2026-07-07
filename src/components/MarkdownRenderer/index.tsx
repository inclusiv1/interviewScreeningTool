import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content = '' }) => {
  // Use an object to track visibility of multiple code blocks by their index
  const [visibleBlocks, setVisibleBlocks] = useState<Record<number, boolean>>({});

  const toggleVisibility = (index: number) => {
    setVisibleBlocks(prev => {
      const currentVal = prev[index] === false ? false : true;
      const newState = {
        ...prev,
        [index]: !currentVal
      };
      return newState;
    });
  };

  // A simple markdown-like parser for code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div>
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
          if (match) {
            const language = match[1] || 'javascript';
            const code = match[2].trim();
            const isVisible = visibleBlocks[index] === false ? false : true; // Default to true if undefined or true

            return (
              <div className="markdown-code-container" key={index}>
                <div className="markdown-code-header">
                  <span className="markdown-code-language">{language}</span>
                  <button className="btn-code-toggle" onClick={() => toggleVisibility(index)}>
                    {isVisible ? 'Hide Code' : 'Show Code'}
                  </button>
                </div>
                <div className={isVisible ? 'code-wrapper-visible' : 'code-wrapper-hidden'}>
                  <SyntaxHighlighter
                    language={language}
                    style={vscDarkPlus}
                    customStyle={{ margin: 0 }}
                  >
                    {code}
                  </SyntaxHighlighter>
                </div>
              </div>
            );
          }
        }
        
        return (
          <span key={index} style={{ whiteSpace: 'pre-wrap' }}>
            {part}
          </span>
        );
      })}
    </div>
  );
};

export default MarkdownRenderer;
