// Apply saved theme before render to avoid flash
if (localStorage.getItem("theme") === "dark") {
  document.documentElement.classList.add("dark");
}

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
