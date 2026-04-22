import { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import { getStoredUserContext } from '../lib/session.js';

export function useWorkspaceData() {
  const auth = getStoredUserContext();
  const [cardsets, setCardsets] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loadingCardsets, setLoadingCardsets] = useState(true);

  const fetchCardsets = useCallback(async () => {
    if (!auth.userId || !auth.userEmail) {
      setLoadingCardsets(false);
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
        message.error(result.error || 'Failed to load decks');
        setLoadingCardsets(false);
        return;
      }

      setCardsets(result.cardsets ?? []);
    } catch {
      message.error('Could not load decks from server.');
    } finally {
      setLoadingCardsets(false);
    }
  }, [auth.userEmail, auth.userId]);

  const fetchCourses = useCallback(async () => {
    if (!auth.userId || !auth.userEmail) {
      return;
    }

    try {
      const response = await fetch(`/api/courses/user/${auth.userId}`, {
        headers: {
          'x-user-id': auth.userId,
          'x-user-email': auth.userEmail,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        message.error(result.error || 'Failed to load courses');
        return;
      }

      setCourses(result.courses ?? []);
    } catch {
      message.error('Could not load courses from server.');
    }
  }, [auth.userEmail, auth.userId]);

  useEffect(() => {
    fetchCardsets();
    fetchCourses();
  }, [fetchCardsets, fetchCourses]);

  return {
    auth,
    cardsets,
    courses,
    loadingCardsets,
    setCardsets,
    setCourses,
    refreshCardsets: fetchCardsets,
    refreshCourses: fetchCourses,
  };
}
