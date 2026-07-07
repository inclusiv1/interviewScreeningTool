import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import TopicsPage from './index';
import * as api from '../../services/api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../services/api', () => ({
  deleteRole: vi.fn(),
}));

describe('TopicsPage', () => {
  const mockCards = [
    { id: 1, role: 'Frontend', topic: 'React', skillLevel: 'Senior' },
    { id: 2, role: 'Frontend', topic: 'React', skillLevel: 'Senior' },
    { id: 3, role: 'Backend', topic: 'Node', skillLevel: 'Mid' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = (isAdmin = false, onRefresh = vi.fn()) => {
    return render(
      <BrowserRouter>
        <TopicsPage cards={mockCards as any} isAdmin={isAdmin} onRefresh={onRefresh} />
      </BrowserRouter>
    );
  };

  it('renders roles and skills correctly', () => {
    renderPage();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node')).toBeInTheDocument();
    expect(screen.getAllByText(/2 Questions/)).toHaveLength(2); // Role header and skill card
    expect(screen.getAllByText(/1 Questions/)).toHaveLength(2); // Role header and skill card
  });

  it('navigates to homepage with selected role when role is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByText('Frontend'));
    expect(mockNavigate).toHaveBeenCalledWith('/', { state: { selectedRole: 'Frontend' } });
  });

  it('navigates to homepage with selected role and skill when skill is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByText('React'));
    expect(mockNavigate).toHaveBeenCalledWith('/', { state: { selectedRole: 'Frontend', selectedTopic: 'React' } });
  });

  it('calls deleteRole and onRefresh when delete role button is clicked and confirmed', async () => {
    const onRefresh = vi.fn();
    window.confirm = vi.fn().mockReturnValue(true);
    vi.mocked(api.deleteRole).mockResolvedValue({} as any);

    renderPage(true, onRefresh);
    const deleteButtons = screen.getAllByText('Delete Role');
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(api.deleteRole).toHaveBeenCalledWith('Backend'); // Backend is first in sortedRoles if sorted? No, Backend < Frontend
    
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
  });
});
