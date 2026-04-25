//Custom hook for fetching and managing course details and associated decks
import { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import { getStoredUserContext } from '../lib/session.js';

export function useCourseDetailData(courseId) {
  const auth = getStoredUserContext();
  const [course, setCourse] = useState(null);
  const [courseDecks, setCourseDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canEditCourse, setCanEditCourse] = useState(false);
  const [canDeleteCourse, setCanDeleteCourse] = useState(false);

  const fetchCourseAndDecks = useCallback(async () => {
    if (!auth.userId || !auth.userEmail || !courseId) {
      setLoading(false);
      return;
    }

    try {
      const [coursesResponse, decksResponse, publicCoursesResponse, publicDecksResponse] = await Promise.all([
        fetch(`/api/courses/user/${auth.userId}`, {
          headers: {
            'x-user-id': auth.userId,
            'x-user-email': auth.userEmail,
          },
        }),
        fetch(`/api/decks/user/${auth.userId}`, {
          headers: {
            'x-user-id': auth.userId,
            'x-user-email': auth.userEmail,
          },
        }),
        fetch('/api/courses/public'),
        fetch('/api/decks/public'),
      ]);

      const coursesResult = await coursesResponse.json();
      const decksResult = await decksResponse.json();
      const publicCoursesResult = await publicCoursesResponse.json();
      const publicDecksResult = await publicDecksResponse.json();

      if (!coursesResponse.ok) {
        throw new Error(coursesResult.error || 'Failed to load course details');
      }
      if (!decksResponse.ok) {
        throw new Error(decksResult.error || 'Failed to load decks');
      }
      if (!publicCoursesResponse.ok) {
        throw new Error(publicCoursesResult.error || 'Failed to load public courses');
      }
      if (!publicDecksResponse.ok) {
        throw new Error(publicDecksResult.error || 'Failed to load public decks');
      }

      const selectedCourse = (coursesResult.courses ?? []).find(
        (item) => String(item.id) === String(courseId)
      );
      const selectedPublicCourse = (publicCoursesResult.courses ?? []).find(
        (item) => String(item.id) === String(courseId)
      );

      const courseDeckSource = selectedCourse
        ? (decksResult.decks ?? [])
        : (publicDecksResult.decks ?? []);

      setCourse(selectedCourse ?? selectedPublicCourse ?? null);
      setCanEditCourse(Boolean(selectedCourse));
      setCanDeleteCourse(selectedCourse?.role === 'owner');
      setCourseDecks(courseDeckSource.filter(
        (deck) => String(deck.course_id) === String(courseId)
      ));
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Could not load course page from server.');
    } finally {
      setLoading(false);
    }
  }, [auth.userEmail, auth.userId, courseId]);

  useEffect(() => {
    fetchCourseAndDecks();
  }, [fetchCourseAndDecks]);

  return {
    course,
    courseDecks,
    loading,
    canEditCourse,
    canDeleteCourse,
    setCourseDecks,
    setCourse,
  };
}
