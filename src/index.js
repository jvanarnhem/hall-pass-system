// src/index.js
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// If you have global styles, keep this. If not, you can remove it.
import "./index.css";

/**
 * Minimal Error Boundary to prevent a white screen on unexpected runtime errors.
 * No behavior change to your app logic — just a safer top-level shell.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // You can wire this to any logging service if you like.
    // For now, keep it simple:
    // eslint-disable-next-line no-console
    console.error("Top-level error boundary caught:", error, info);
  }

  handleReload = () => {
    // Hard reload to clear transient state if something went wrong.
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "2rem",
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          }}
        >
          <div style={{ maxWidth: 520, textAlign: "center" }}>
            <h1 style={{ marginBottom: "0.5rem", fontSize: "1.75rem" }}>
              Something went wrong
            </h1>
            <p style={{ marginBottom: "1rem", opacity: 0.8 }}>
              Try reloading the page. If the issue persists, please contact the site admin.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                padding: "0.6rem 1rem",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,.15)",
                cursor: "pointer",
                background: "white",
              }}
            >
              Reload
            </button>
            {process.env.NODE_ENV !== "production" && this.state.error && (
              <pre
                style={{
                  textAlign: "left",
                  marginTop: "1rem",
                  padding: "1rem",
                  overflowX: "auto",
                  background: "#f6f8fa",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              >
                {String(this.state.error)}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Optional: capture unhandled promise rejections so they show up in dev logs
 * instead of failing silently.
 */
if (process.env.NODE_ENV !== "production") {
  window.addEventListener("unhandledrejection", (event) => {
    // eslint-disable-next-line no-console
    console.warn("Unhandled promise rejection:", event.reason);
  });
}

const container = document.getElementById("root");
const root = createRoot(container);

/**
 * Note: In React 18, StrictMode intentionally double-invokes certain lifecycles in development
 * to highlight side-effects. Make sure your effects clean up intervals/timeouts and are idempotent.
 * This does NOT affect production builds.
 */
root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);