import { voidReact } from "@void/react/plugin";
import { defineConfig } from "vite";
import { voidPlugin } from "void";

export default defineConfig({
    plugins: [voidPlugin(), voidReact()],
    server: { port: 5005 },
    preview: { port: 5005 },
});
