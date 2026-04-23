//General app component that sets up routing and protected routes based on user session status
import React from 'react';
import Home from "./pages/Home";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Workspace from "./pages/Workspace";
import DeckDetail from "./pages/DeckDetail";
import CourseDetail from "./pages/CourseDetail";
import SearchResults from "./pages/SearchResults";
import { getStoredSession } from './lib/session.js';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const session = getStoredSession();

  if (!session) {
    return <Navigate to="/signin" replace />;
  }

  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        <Route
          path="/workspace"
          element={(
            <ProtectedRoute>
              <Workspace />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/workspace/:deckId"
          element={(
            <ProtectedRoute>
              <DeckDetail />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/courses/:courseId"
          element={(
            <ProtectedRoute>
              <CourseDetail />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/search"
          element={(
            <ProtectedRoute>
              <SearchResults />
            </ProtectedRoute>
          )}
        />
      </Routes>
    </BrowserRouter>
  );
};
export default App;
