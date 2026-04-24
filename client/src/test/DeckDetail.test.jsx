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
  default: ({ frontContent, backContent, onPrevious, onNext, onMarkCorrect, onMarkIncorrect }) => (
    <div>
      <div>{frontContent}</div>
      <div>{backContent}</div>
      <button onClick={onPrevious}>Previous</button>
      <button onClick={onNext}>Next</button>
      <button onClick={onMarkCorrect}>Correct</button>
      <button onClick={onMarkIncorrect}>Incorrect</button>
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
});
