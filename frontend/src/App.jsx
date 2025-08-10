// src/App.jsx
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Dashboard from "./pages/Dashboard";
import CodePage from "./pages/CodePage";
import ResultsPage from "./pages/ResultsPage";
import Login from "./pages/Login";               // <-- missing import
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/code"
        element={
          <ProtectedRoute>
            <CodePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/results"
        element={
          <ProtectedRoute>
            <ResultsPage />
          </ProtectedRoute>
        }
      />

      <Route path="/login" element={<Login />} />
      {/* optional catch-all */}
      {/* <Route path="*" element={<HomePage />} /> */}
    </Routes>
  );
}
