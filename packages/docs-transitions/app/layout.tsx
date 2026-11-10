import "./globals.css";
import type { Metadata } from "next";
import {
    Instrument_Serif,
    Inter_Tight,
    JetBrains_Mono,
} from "next/font/google";
import { Shell } from "./shell";

const sans = Inter_Tight({ subsets: ["latin"], variable: "--font-sans" });
const serif = Instrument_Serif({
    subsets: ["latin"],
    weight: "400",
    style: "italic",
    variable: "--font-serif",
});
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

// In public/, since the file convention adds basePath twice.
const ogImage = {
    url: "/og-image.png",
    width: 1200,
    height: 630,
    alt: "VFX-JS Transitions: Shader transitions for the DOM",
};

export const metadata: Metadata = {
    metadataBase: new URL("https://amagi.dev/vfx-js-transitions"),
    alternates: { canonical: "./" },
    openGraph: {
        type: "website",
        siteName: "VFX-JS Transitions",
        url: "./",
        images: [ogImage],
    },
    twitter: { card: "summary_large_image", images: [ogImage] },
    title: {
        default: "VFX-JS Transitions — shader transitions for the DOM",
        template: "%s — VFX-JS Transitions",
    },
    description:
        "Next-level page transitions with HTML-in-Canvas. Run your live pages through WebGL shaders in a few lines of React, Vue, Svelte, Astro or plain JS.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html
            lang="en"
            data-loading=""
            className={`${sans.variable} ${serif.variable} ${mono.variable}`}
        >
            <body>
                <Shell>{children}</Shell>
            </body>
        </html>
    );
}
