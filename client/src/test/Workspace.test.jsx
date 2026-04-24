import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Workspace from '../pages/Workspace';
import { mockNavigate } from './routerMocks.js';

const mockClearStoredSession = vi.fn();
const mockUseWorkspaceData = vi.fn();

vi.mock('../hooks/useWorkspaceData.js', () => ({
  useWorkspaceData: () => mockUseWorkspaceData(),
}));

vi.mock('../lib/session.js', () => ({
  clearStoredSession: () => mockClearStoredSession(),
}));

vi.mock('../components/CreateDeckModal', () => ({
  default: () => null,
}));

vi.mock('../components/CreateCourseModal', () => ({
  default: () => null,
}));

vi.mock('../components/MoveDeckModal', () => ({
  default: () => null,
}));

describe('Workspace', () => {
  it('renders the workspace shell and empty states', () => {
    mockUseWorkspaceData.mockReturnValue({
      auth: { userId: '1', userEmail: 'test@example.com' },
      decks: [],
      courses: [],
      loadingDecks: false,
      setDecks: vi.fn(),
      setCourses: vi.fn(),
      refreshDecks: vi.fn(),
    });

    render(<Workspace />);

    expect(screen.getByText(/workspace/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create deck/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create course/i })).toBeInTheDocument();
    expect(screen.getByText(/no courses yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no decks yet/i)).toBeInTheDocument();
  });

  it('navigates from deck and course cards and logs out', () => {
    mockUseWorkspaceData.mockReturnValue({
      auth: { userId: '1', userEmail: 'test@example.com' },
      decks: [{ id: 'deck-1', name: 'Biology', isPublic: false }],
      courses: [{ id: 'course-1', name: 'Chemistry' }],
      loadingDecks: false,
      setDecks: vi.fn(),
      setCourses: vi.fn(),
      refreshDecks: vi.fn(),
    });

    render(<Workspace />);

    fireEvent.click(screen.getByText('Chemistry'));
    expect(mockNavigate).toHaveBeenCalledWith('/courses/course-1');

    fireEvent.click(screen.getByText('Biology'));
    expect(mockNavigate).toHaveBeenCalledWith('/workspace/deck-1');

    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(mockClearStoredSession).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/signin');
  });
});
