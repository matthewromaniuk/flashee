// Custom hook for fetching and managing workspace data, including user's decks and courses
import { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import { getStoredUserContext } from '../lib/session.js';

export function useWorkspaceData() {
  const auth = getStoredUserContext();
  const [decks, setDecks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loadingDecks, setLoadingDecks] = useState(true);

  const fetchDecks = useCallback(async () => {
    if (!auth.userId || !auth.userEmail) {
      setLoadingDecks(false);
      return;
    }

    try {
      const response = await fetch(`/api/decks/user/${auth.userId}`, {
        headers: {
          'x-user-id': auth.userId,
          'x-user-email': auth.userEmail,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        message.error(result.error || 'Failed to load decks');
        setLoadingDecks(false);
        return;
      }

      setDecks(result.decks ?? []);
    } catch {
      message.error('Could not load decks from server.');
    } finally {
      setLoadingDecks(false);
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
    fetchDecks();
    fetchCourses();
  }, [fetchDecks, fetchCourses]);

  return {
    auth,
    decks,
    courses,
    loadingDecks,
    setDecks,
    setCourses,
    refreshDecks: fetchDecks,
    refreshCourses: fetchCourses,
  };
}
