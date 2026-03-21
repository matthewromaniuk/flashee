import React from 'react';
import Dashboard from "./pages/dashboard";
import Home from "./pages/home";
import SignUp from "./pages/signup";
import SignIn from "./pages/signin";
import Decks from "./pages/decks";
import CardsetDetail from "./pages/cardsetDetail";

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const session = localStorage.getItem('flashee_session');

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
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          )}
        />
        <Route path="/signin" element={<SignIn />} />
        <Route
          path="/decks"
          element={(
            <ProtectedRoute>
              <Decks />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/decks/:cardsetId"
          element={(
            <ProtectedRoute>
              <CardsetDetail />
            </ProtectedRoute>
          )}
        />
      </Routes>
    </BrowserRouter>
  );
};
export default App;