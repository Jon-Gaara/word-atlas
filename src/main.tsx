import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/fraunces/opsz-italic.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { isNative, startNative } from "./lib/native";
import "./styles/app.css";

void startNative().catch(() => null);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// The Android shell serves the app from its own asset scheme, where a service
// worker cannot run; the bundled files are already offline.
if (import.meta.env.PROD && !isNative && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => null);
  });
}
