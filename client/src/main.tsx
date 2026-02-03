/**
 * Client bootstrap.
 *
 * This file is intentionally tiny: it mounts the React app and pulls in global CSS.
 * If you need app-wide providers, put them in `App.tsx` so routing/layout stays visible.
 */

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
