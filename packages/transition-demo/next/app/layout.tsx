import "@vfx-js/transition-demo-shared/style.css";
import { Shell } from "./shell";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <Shell>{children}</Shell>
            </body>
        </html>
    );
}
