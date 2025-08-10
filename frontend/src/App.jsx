import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import CodePage from "./pages/CodePage";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route
        path="/code"
        element={
          <ProtectedRoute>
            <CodePage />
          </ProtectedRoute>
        }
      />

      {/* optional catch-all */}
      {/* <Route path="*" element={<HomePage />} /> */}
    </Routes>
  );
}
