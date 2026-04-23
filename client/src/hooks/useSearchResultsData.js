//Custom hook for fetching and managing search results data based on query
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

      if (!coursesResponse.ok || !decksResponse.ok || !publicCoursesResponse.ok || !publicDecksResponse.ok) {
        throw new Error('Failed to load search results');
      }

      const yourCourseIds = new Set((coursesResult.courses ?? []).map((course) => String(course.id)));
      const yourDeckIds = new Set((decksResult.decks ?? []).map((deck) => String(deck.id)));

      const matchedYourCourses = (coursesResult.courses ?? []).filter((course) => {
        if (!normalizedQuery) return false;
        return matchesQuery(course.name, normalizedQuery) || matchesQuery(course.description, normalizedQuery);
      });

      const matchedYourDecks = (decksResult.decks ?? []).filter((deck) => {
        if (!normalizedQuery) return false;
        const courseName = String(
          (coursesResult.courses ?? []).find((course) => String(course.id) === String(deck.course_id))?.name ?? ''
        );
        return matchesQuery(deck.name, normalizedQuery)
          || matchesQuery(deck.description, normalizedQuery)
          || matchesQuery(courseName, normalizedQuery);
      });

      const matchedPublicCourses = (publicCoursesResult.courses ?? []).filter((course) => {
        if (!normalizedQuery) return false;
        if (yourCourseIds.has(String(course.id))) return false;
        return matchesQuery(course.name, normalizedQuery) || matchesQuery(course.description, normalizedQuery);
      });

      const matchedPublicDecks = (publicDecksResult.decks ?? []).filter((deck) => {
        if (!normalizedQuery) return false;
        if (yourDeckIds.has(String(deck.id))) return false;
        const courseName = String(
          (publicCoursesResult.courses ?? []).find((course) => String(course.id) === String(deck.course_id))?.name ?? ''
        );
        return matchesQuery(deck.name, normalizedQuery)
          || matchesQuery(deck.description, normalizedQuery)
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
