// src/index.js
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { QueryClientProvider } from "@tanstack/react-query"; // ✅ ADD THIS
import { queryClient } from "./queryClient"; // ✅ ADD THIS
import App from "./App";
import "./index.css";

/**
 * Minimal Error Boundary (Your existing code, no changes)
 *
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
    console.error("Top-level error boundary caught:", error, info);
  }

  handleReload = () => {
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
 * Optional: capture unhandled promise rejections
 * (Your existing code, no changes)
 *
 */
if (process.env.NODE_ENV !== "production") {
  window.addEventListener("unhandledrejection", (event) => {
    console.warn("Unhandled promise rejection:", event.reason);
  });
}

const container = document.getElementById("root");
const root = createRoot(container);

/**
 * Wrap with QueryClientProvider for React Query caching
 */
root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}> {/* ✅ ADD THIS WRAPPER */}
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider> {/* ✅ ADD THIS CLOSING TAG */}
  </StrictMode>
);