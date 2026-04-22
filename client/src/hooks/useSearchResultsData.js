import { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import { getStoredUserContext } from '../lib/session.js';

const matchesQuery = (value, normalizedQuery) => String(value ?? '').toLowerCase().includes(normalizedQuery);

export function useSearchResultsData(query) {
  const auth = getStoredUserContext();
  const [yourCourses, setYourCourses] = useState([]);
  const [yourDecks, setYourDecks] = useState([]);
  const [publicCourses, setPublicCourses] = useState([]);
  const [publicDecks, setPublicDecks] = useState([]);
  const [loading, setLoading] = useState(true);

  const normalizedQuery = query.toLowerCase();

  const fetchSearchData = useCallback(async () => {
    if (!auth.userId || !auth.userEmail) {
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

      if (!coursesResponse.ok || !cardsetsResponse.ok || !publicCoursesResponse.ok || !publicCardsetsResponse.ok) {
        throw new Error('Failed to load search results');
      }

      const yourCourseIds = new Set((coursesResult.courses ?? []).map((course) => String(course.id)));
      const yourDeckIds = new Set((cardsetsResult.cardsets ?? []).map((cardset) => String(cardset.id)));

      const matchedYourCourses = (coursesResult.courses ?? []).filter((course) => {
        if (!normalizedQuery) return false;
        return matchesQuery(course.name, normalizedQuery) || matchesQuery(course.description, normalizedQuery);
      });

      const matchedYourDecks = (cardsetsResult.cardsets ?? []).filter((cardset) => {
        if (!normalizedQuery) return false;
        const courseName = String(
          (coursesResult.courses ?? []).find((course) => String(course.id) === String(cardset.course_id))?.name ?? ''
        );
        return matchesQuery(cardset.name, normalizedQuery)
          || matchesQuery(cardset.description, normalizedQuery)
          || matchesQuery(courseName, normalizedQuery);
      });

      const matchedPublicCourses = (publicCoursesResult.courses ?? []).filter((course) => {
        if (!normalizedQuery) return false;
        if (yourCourseIds.has(String(course.id))) return false;
        return matchesQuery(course.name, normalizedQuery) || matchesQuery(course.description, normalizedQuery);
      });

      const matchedPublicDecks = (publicCardsetsResult.cardsets ?? []).filter((cardset) => {
        if (!normalizedQuery) return false;
        if (yourDeckIds.has(String(cardset.id))) return false;
        const courseName = String(
          (publicCoursesResult.courses ?? []).find((course) => String(course.id) === String(cardset.course_id))?.name ?? ''
        );
        return matchesQuery(cardset.name, normalizedQuery)
          || matchesQuery(cardset.description, normalizedQuery)
          || matchesQuery(courseName, normalizedQuery);
      });

      setYourCourses(matchedYourCourses);
      setYourDecks(matchedYourDecks);
      setPublicCourses(matchedPublicCourses);
      setPublicDecks(matchedPublicDecks);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Could not load search results from server.');
    } finally {
      setLoading(false);
    }
  }, [auth.userEmail, auth.userId, normalizedQuery]);

  useEffect(() => {
    if (!query) {
      setYourCourses([]);
      setYourDecks([]);
      setPublicCourses([]);
      setPublicDecks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchSearchData();
  }, [fetchSearchData, query]);

  return {
    yourCourses,
    yourDecks,
    publicCourses,
    publicDecks,
    loading,
  };
}
