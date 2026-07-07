import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TopicSelector from './index';

describe('TopicSelector', () => {
  const mockCards = [
    { id: 1, role: 'Frontend', topic: 'React' },
    { id: 2, role: 'Frontend', topic: 'TypeScript' },
    { id: 3, role: 'Backend', topic: 'Node' },
  ];

  const mockOnSelectRole = vi.fn();
  const mockOnSelectTopic = vi.fn();

  it('renders all roles', () => {
    render(
      <TopicSelector 
        cards={mockCards as any} 
        selectedRole={null} 
        onSelectRole={mockOnSelectRole} 
        selectedTopic={null} 
        onSelectTopic={mockOnSelectTopic} 
      />
    );

    expect(screen.getByText('All Roles')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
  });

  it('calls onSelectRole when a role button is clicked', () => {
    render(
      <TopicSelector 
        cards={mockCards as any} 
        selectedRole={null} 
        onSelectRole={mockOnSelectRole} 
        selectedTopic={null} 
        onSelectTopic={mockOnSelectTopic} 
      />
    );

    fireEvent.click(screen.getByText('Frontend'));
    expect(mockOnSelectRole).toHaveBeenCalledWith('Frontend');
    expect(mockOnSelectTopic).toHaveBeenCalledWith(null);
  });

  it('renders topics when a role is selected', () => {
    render(
      <TopicSelector 
        cards={mockCards as any} 
        selectedRole="Frontend" 
        onSelectRole={mockOnSelectRole} 
        selectedTopic={null} 
        onSelectTopic={mockOnSelectTopic} 
      />
    );

    expect(screen.getByText('Filter by Skill')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.queryByText('Node')).not.toBeInTheDocument();
  });

  it('calls onSelectTopic when a topic button is clicked', () => {
    render(
      <TopicSelector 
        cards={mockCards as any} 
        selectedRole="Frontend" 
        onSelectRole={mockOnSelectRole} 
        selectedTopic={null} 
        onSelectTopic={mockOnSelectTopic} 
      />
    );

    fireEvent.click(screen.getByText('React'));
    expect(mockOnSelectTopic).toHaveBeenCalledWith('React');
  });
});
