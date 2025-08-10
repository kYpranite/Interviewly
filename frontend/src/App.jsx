// src/App.jsx
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import CodePage from "./pages/CodePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/code" element={<CodePage />} />
    </Routes>
  );
}
