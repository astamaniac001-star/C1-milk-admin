import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";

ReactDOM.createRoot(document.getElementById("app-root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
