import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CreateDeckModal from '../components/CreateDeckModal';

describe('CreateDeckModal', () => {
  it('creates a manual deck with one flashcard', async () => {
    const onCreated = vi.fn();
    const onCancel = vi.fn();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deck: { id: 'deck-1' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ saved: true }),
      });

    vi.stubGlobal('fetch', fetchMock);

    render(
      <CreateDeckModal
        open
        onCancel={onCancel}
        onCreated={onCreated}
        auth={{ userEmail: 'test@example.com' }}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /manual/i }));
    await waitFor(() => {
      expect(screen.getByText(/manual flashcards/i)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/deck name/i), { target: { value: 'Biology' } });
    fireEvent.click(screen.getByRole('button', { name: /add flashcard/i }));
    fireEvent.change(screen.getByLabelText(/^question$/i), { target: { value: 'What is DNA?' } });
    fireEvent.change(screen.getByLabelText(/^answer$/i), { target: { value: 'Genetic material' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'test@example.com',
        },
        body: JSON.stringify({
          name: 'Biology',
          isPublic: false,
          tags: [],
          source_file_name: null,
        }),
      });
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/decks/deck-1/flashcards/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'test@example.com',
        },
        body: JSON.stringify({
          flashcards: [{ question: 'What is DNA?', answer: 'Genetic material' }],
        }),
      });
    });

    expect(onCreated).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });
});
