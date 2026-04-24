// Custom hook for fetching and managing deck and flashcard details
import { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import { getStoredUserContext } from '../lib/session.js';

export function useDeckDetailData(deckId) {
  const auth = getStoredUserContext();
  const [deckName, setDeckName] = useState('Deck Flashcards');
  const [deckIsPublic, setDeckIsPublic] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [loadingDeck, setLoadingDeck] = useState(true);
  const [loadingFlashcards, setLoadingFlashcards] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  const fetchDeckName = useCallback(async () => {
    if (!deckId) {
      setLoadingDeck(false);
      return;
    }

    try {
      const response = await fetch(`/api/decks/${deckId}`, {
        headers: {
          ...(auth.userId ? { 'x-user-id': auth.userId } : {}),
          ...(auth.userEmail ? { 'x-user-email': auth.userEmail } : {}),
        },
      });

      const result = await response.json();
      if (!response.ok) {
        if (auth.userId && auth.userEmail) {
          const [userDecksResponse, publicDecksResponse] = await Promise.all([
            fetch(`/api/decks/user/${auth.userId}`, {
              headers: {
                'x-user-id': auth.userId,
                'x-user-email': auth.userEmail,
              },
            }),
            fetch('/api/decks/public'),
          ]);

          const userDecksResult = await userDecksResponse.json();
          const publicDecksResult = await publicDecksResponse.json();

          const selectedDeck = [
            ...(userDecksResult.decks ?? []),
            ...(publicDecksResult.decks ?? []),
          ].find((deck) => String(deck.id) === String(deckId));

          if (selectedDeck?.name) {
            setDeckName(selectedDeck.name);
            setDeckIsPublic(Boolean(selectedDeck.isPublic));
            setIsOwner(selectedDeck?.role === 'owner');
          } else {
            setIsOwner(false);
          }
        } else {
          setIsOwner(false);
        }

        return;
      }

      const selectedDeck = result.deck ?? null;
      setDeckName(selectedDeck?.name ?? 'Deck Flashcards');
      setDeckIsPublic(Boolean(selectedDeck?.isPublic));
      setIsOwner(selectedDeck?.role === 'owner');
    } catch {
      setIsOwner(false);
    } finally {
      setLoadingDeck(false);
    }
  }, [auth.userEmail, auth.userId, deckId]);

  const fetchFlashcards = useCallback(async () => {
    if (!deckId) {
      setLoadingFlashcards(false);
      return;
    }

    try {
      const response = await fetch(`/api/decks/${deckId}/flashcards`, {
        headers: {
          ...(auth.userEmail ? { 'x-user-email': auth.userEmail } : {}),
        },
      });

      const result = await response.json();
      if (!response.ok) {
        message.error(result.error || 'Failed to load flashcards');
        return;
      }

      setFlashcards(result.flashcards ?? []);
    } catch {
      message.error('Could not load flashcards from server.');
    } finally {
      setLoadingFlashcards(false);
    }
  }, [auth.userEmail, deckId]);

  useEffect(() => {
    fetchDeckName();
    fetchFlashcards();
  }, [fetchDeckName, fetchFlashcards]);

  return {
    deckName,
    deckIsPublic,
    flashcards,
    loading: loadingDeck || loadingFlashcards,
    isOwner,
    setDeckName,
    setDeckIsPublic,
    setFlashcards,
    refreshFlashcards: fetchFlashcards,
  };
}
