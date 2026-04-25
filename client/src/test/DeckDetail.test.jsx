//Test for DeckDetail component, verifying that the deck details are rendered correctly and that advancing to the next flashcard after marking one correct works as expected.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeckDetail from '../pages/DeckDetail';
import { mockNavigate, mockParams } from './routerMocks.js';

const mockClearStoredSession = vi.fn();
const mockUseDeckDetailData = vi.fn();

vi.mock('../hooks/useDeckDetailData.js', () => ({
  useDeckDetailData: () => mockUseDeckDetailData(),
}));

vi.mock('../lib/session.js', () => ({
  clearStoredSession: () => mockClearStoredSession(),
}));

vi.mock('../components/Flashcard', () => ({
  default: ({ frontContent, backContent, onPrevious, onNext, onMarkCorrect, onMarkIncorrect, onEdit }) => (
    <div>
      <div>{frontContent}</div>
      <div>{backContent}</div>
      <button onClick={onPrevious}>Previous</button>
      <button onClick={onNext}>Next</button>
      {onEdit ? <button onClick={onEdit}>Edit</button> : null}
      {onMarkCorrect ? <button onClick={onMarkCorrect}>Correct</button> : null}
      {onMarkIncorrect ? <button onClick={onMarkIncorrect}>Incorrect</button> : null}
    </div>
  ),
}));

vi.mock('../components/EditDeckModal', () => ({
  default: () => null,
}));

describe('DeckDetail', () => {
  it('renders the deck and advances to the next flashcard after marking one correct', async () => {
    mockParams.deckId = 'deck-1';
    mockUseDeckDetailData.mockReturnValue({
      deckName: 'Biology',
      deckIsPublic: false,
      flashcards: [
        { id: 'flashcard-1', question: 'What does SWE stand for?', answer: 'Software Engineering' },
        { id: 'flashcard-2', question: 'What does AI stand for?', answer: 'Artificial Intelligence' },
      ],
      loading: false,
      isOwner: true,
      setDeckName: vi.fn(),
      setDeckIsPublic: vi.fn(),
      setFlashcards: vi.fn(),
      refreshFlashcards: vi.fn(),
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem('flashee_user_email', 'test@example.com');

    render(<DeckDetail />);

    expect(screen.getByRole('heading', { name: 'Biology' })).toBeInTheDocument();
    expect(screen.getByText(/card 1 of 2/i)).toBeInTheDocument();
    expect(screen.getByText('What does SWE stand for?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit deck/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete deck/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Correct$/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/decks/deck-1/flashcards/flashcard-1/status',
        expect.objectContaining({
          method: 'PATCH',
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('What does AI stand for?')).toBeInTheDocument();
    });
    expect(screen.getByText(/card 2 of 2/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalledWith('/signin');
  });

  it('shows practice mode for public decks owned by the user', () => {
    mockParams.deckId = 'deck-2';
    mockUseDeckDetailData.mockReturnValue({
      deckName: 'Physics',
      deckIsPublic: true,
      flashcards: [
        { id: 'flashcard-1', question: 'What is force?', answer: 'Mass times acceleration' },
      ],
      loading: false,
      isOwner: true,
      setDeckName: vi.fn(),
      setDeckIsPublic: vi.fn(),
      setFlashcards: vi.fn(),
      refreshFlashcards: vi.fn(),
    });

    render(<DeckDetail />);

    expect(screen.getByRole('heading', { name: 'Physics' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /practice mode/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit deck/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete deck/i })).toBeInTheDocument();
  });

  it('hides edit and status actions for public decks not owned by the user', () => {
    mockParams.deckId = 'deck-3';
    mockUseDeckDetailData.mockReturnValue({
      deckName: 'History',
      deckIsPublic: true,
      flashcards: [
        { id: 'flashcard-1', question: 'Who was the first president?', answer: 'George Washington' },
      ],
      loading: false,
      isOwner: false,
      setDeckName: vi.fn(),
      setDeckIsPublic: vi.fn(),
      setFlashcards: vi.fn(),
      refreshFlashcards: vi.fn(),
    });

    render(<DeckDetail />);

    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /practice mode/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit deck/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete deck/i })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /^Correct$/ })).toHaveLength(0);
    expect(screen.queryAllByRole('button', { name: /^Incorrect$/ })).toHaveLength(0);
  });
});
