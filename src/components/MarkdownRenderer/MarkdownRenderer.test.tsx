import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MarkdownRenderer from './index';

// Mock SyntaxHighlighter because it can be heavy and problematic in tests
vi.mock('react-syntax-highlighter', () => ({
  Prism: ({ children, language }: any) => (
    <pre data-testid="syntax-highlighter" data-language={language}>
      {children}
    </pre>
  ),
}));

describe('MarkdownRenderer', () => {
  it('renders plain text correctly', () => {
    render(<MarkdownRenderer content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders code blocks correctly', () => {
    const content = 'Check this code:\n```javascript\nconst x = 1;\n```';
    render(<MarkdownRenderer content={content} />);
    
    expect(screen.getByText('Check this code:')).toBeInTheDocument();
    expect(screen.getByTestId('syntax-highlighter')).toHaveTextContent('const x = 1;');
    expect(screen.getByText('javascript')).toBeInTheDocument();
  });

  it('toggles code visibility', async () => {
    const content = '```python\nprint("hi")\n```';
    render(<MarkdownRenderer content={content} />);
    
    // Use getAllByRole to find the button and click it
    const buttons = screen.getAllByRole('button');
    const toggleButton = buttons.find(b => b.textContent?.includes('Hide Code'));
    
    const codeWrapper = screen.getByTestId('syntax-highlighter').parentElement;
    expect(codeWrapper).toHaveClass('code-wrapper-visible');
    
    if (toggleButton) {
      fireEvent.click(toggleButton);
    } else {
      throw new Error('Toggle button not found initially');
    }
    
    // Use a function matcher for more flexibility
    await waitFor(() => {
      const allButtons = screen.getAllByRole('button');
      const showButton = allButtons.find(b => b.textContent?.includes('Show Code'));
      expect(showButton).toBeDefined();
    }, { timeout: 3000 });
    
    const finalButtons = screen.getAllByRole('button');
    const showCodeButton = finalButtons.find(b => b.textContent?.includes('Show Code'));
    expect(showCodeButton).toBeInTheDocument();
    expect(codeWrapper).toHaveClass('code-wrapper-hidden');
  });

  it('handles multiple code blocks', () => {
    const content = '```js\nvar a = 1;\n```\nSome text\n```css\n.body { color: red; }\n```';
    render(<MarkdownRenderer content={content} />);
    
    const highlighters = screen.getAllByTestId('syntax-highlighter');
    expect(highlighters).toHaveLength(2);
    expect(highlighters[0]).toHaveAttribute('data-language', 'js');
    expect(highlighters[1]).toHaveAttribute('data-language', 'css');
  });
});
