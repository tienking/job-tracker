import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import JobTrackerApp from "./JobTrackerApp.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <JobTrackerApp />
  </StrictMode>
);
