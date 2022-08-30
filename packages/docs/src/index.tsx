import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import vhCheck from "vh-check";
vhCheck();

const container = document.getElementById("root")!;
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(<App />);
