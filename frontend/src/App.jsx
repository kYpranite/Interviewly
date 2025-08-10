// Router-only App component after merge: Home at "/", Code experience at "/code"
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import CodePage from "./pages/CodePage";
import "./App.css";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/code" element={<CodePage />} />
    </Routes>
  );
}
