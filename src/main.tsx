// Apply saved theme before render to avoid flash
if (localStorage.getItem("theme") === "dark") {
  document.documentElement.classList.add("dark");
}

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerAppServiceWorker } from "./lib/pwaRegistration";

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(<App />);
}

registerAppServiceWorker();
