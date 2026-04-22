import { useCallback, useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import { getStoredUserContext } from '../lib/session.js';

export function useCardsetDetailData(cardsetId) {
  const auth = getStoredUserContext();
  const [cardsetName, setCardsetName] = useState('Deck Flashcards');
  const [cardsetIsPublic, setCardsetIsPublic] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  const canLoad = useMemo(() => Boolean(cardsetId && auth.userId && auth.userEmail), [cardsetId, auth.userEmail, auth.userId]);

  const fetchCardsetName = useCallback(async () => {
    if (!canLoad) {
      return;
    }

    try {
      const response = await fetch(`/api/cardsets/user/${auth.userId}`, {
        headers: {
          'x-user-id': auth.userId,
          'x-user-email': auth.userEmail,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        setIsOwner(false);
        return;
      }

      const selectedCardset = (result.cardsets ?? []).find(
        (cardset) => String(cardset.id) === String(cardsetId)
      );

      if (selectedCardset?.name) {
        setCardsetName(selectedCardset.name);
        setCardsetIsPublic(Boolean(selectedCardset.isPublic));
        setIsOwner(selectedCardset?.role === 'owner');
      } else {
        setIsOwner(false);
      }
    } catch {
      setIsOwner(false);
    }
  }, [auth.userEmail, auth.userId, canLoad, cardsetId]);

  const fetchFlashcards = useCallback(async () => {
    if (!cardsetId || !auth.userEmail) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/cardsets/${cardsetId}/flashcards`, {
        headers: {
          'x-user-email': auth.userEmail,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        message.error(result.error || 'Failed to load flashcards');
        setLoading(false);
        return;
      }

      setFlashcards(result.flashcards ?? []);
    } catch {
      message.error('Could not load flashcards from server.');
    } finally {
      setLoading(false);
    }
  }, [auth.userEmail, cardsetId]);

  useEffect(() => {
    fetchCardsetName();
    fetchFlashcards();
  }, [fetchCardsetName, fetchFlashcards]);

  return {
    auth,
    cardsetName,
    cardsetIsPublic,
    flashcards,
    loading,
    isOwner,
    setCardsetName,
    setCardsetIsPublic,
    setFlashcards,
    setIsOwner,
    refreshCardsetName: fetchCardsetName,
    refreshFlashcards: fetchFlashcards,
  };
}
