import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Startup from "./components/Startup.jsx";
import { BrowserRouter } from "react-router";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Startup />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
}
