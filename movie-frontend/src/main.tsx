import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { store } from "./store";
import "./index.css";

/** Toasts follow the current theme, so this small wrapper reads it from the context. */
function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="top-right" closeButton />;
}

const container = document.getElementById("root");
if (!container) throw new Error("Root element #root not found");

createRoot(container).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          <App />
          <ThemedToaster />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
);
