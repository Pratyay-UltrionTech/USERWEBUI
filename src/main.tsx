
import { createRoot } from "react-dom/client";
import { jsx } from "react/jsx-runtime";
import App from "./app/App.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(jsx(App, {}));
  