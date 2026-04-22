import { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import { getStoredUserContext } from '../lib/session.js';

export function useCourseDetailData(courseId) {
  const auth = getStoredUserContext();
  const [course, setCourse] = useState(null);
  const [courseDecks, setCourseDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canEditCourse, setCanEditCourse] = useState(false);

  const fetchCourseAndDecks = useCallback(async () => {
    if (!auth.userId || !auth.userEmail || !courseId) {
      setLoading(false);
      return;
    }

    try {
      const [coursesResponse, cardsetsResponse, publicCoursesResponse, publicCardsetsResponse] = await Promise.all([
        fetch(`/api/courses/user/${auth.userId}`, {
          headers: {
            'x-user-id': auth.userId,
            'x-user-email': auth.userEmail,
          },
        }),
        fetch(`/api/cardsets/user/${auth.userId}`, {
          headers: {
            'x-user-id': auth.userId,
            'x-user-email': auth.userEmail,
          },
        }),
        fetch('/api/courses/public'),
        fetch('/api/cardsets/public'),
      ]);

      const coursesResult = await coursesResponse.json();
      const cardsetsResult = await cardsetsResponse.json();
      const publicCoursesResult = await publicCoursesResponse.json();
      const publicCardsetsResult = await publicCardsetsResponse.json();

      if (!coursesResponse.ok) {
        throw new Error(coursesResult.error || 'Failed to load course details');
      }
      if (!cardsetsResponse.ok) {
        throw new Error(cardsetsResult.error || 'Failed to load decks');
      }
      if (!publicCoursesResponse.ok) {
        throw new Error(publicCoursesResult.error || 'Failed to load public courses');
      }
      if (!publicCardsetsResponse.ok) {
        throw new Error(publicCardsetsResult.error || 'Failed to load public decks');
      }

      const selectedCourse = (coursesResult.courses ?? []).find(
        (item) => String(item.id) === String(courseId)
      );
      const selectedPublicCourse = (publicCoursesResult.courses ?? []).find(
        (item) => String(item.id) === String(courseId)
      );

      const courseDeckSource = selectedCourse
        ? (cardsetsResult.cardsets ?? [])
        : (publicCardsetsResult.cardsets ?? []);

      setCourse(selectedCourse ?? selectedPublicCourse ?? null);
      setCanEditCourse(Boolean(selectedCourse));
      setCourseDecks(courseDeckSource.filter(
        (cardset) => String(cardset.course_id) === String(courseId)
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
    auth,
    course,
    courseDecks,
    loading,
    canEditCourse,
    setCourse,
    setCourseDecks,
    refreshCourseAndDecks: fetchCourseAndDecks,
  };
}
