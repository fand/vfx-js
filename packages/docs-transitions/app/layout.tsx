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

// HTML-in-Canvas origin trial for https://amagi.dev. Expires 2027-03-01.
const originTrialToken =
    "Aq07hgHuOPLTTcC5I5833AV8SEY0KSy7K3t3eOAOpRrAQf2BQIWGtBVXelF8sHCp1mydQ8uDvro6xwA0UMSEIgsAAABPeyJvcmlnaW4iOiJodHRwczovL2FtYWdpLmRldjo0NDMiLCJmZWF0dXJlIjoiSFRNTEluQ2FudmFzIiwiZXhwaXJ5IjoxODAzOTQ1NjAwfQ==";

export const metadata: Metadata = {
    metadataBase: new URL("https://amagi.dev/vfx-js-transitions"),
    alternates: { canonical: "./" },
    openGraph: {
        type: "website",
        siteName: "VFX-JS Transitions",
        url: "./",
        images: [ogImage],
    },
    twitter: {
        card: "summary_large_image",
        site: "@amagitakayosi",
        creator: "@amagitakayosi",
        images: [ogImage],
    },
    title: {
        default: "VFX-JS Transitions — shader transitions for the DOM",
        template: "%s — VFX-JS Transitions",
    },
    description:
        "WebGL shader transitions for real DOM pages. Works with React, Vue, Svelte, Astro and plain JS.",
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
            <head>
                {/* Metadata API only emits name=, but Chrome needs http-equiv. */}
                <meta httpEquiv="origin-trial" content={originTrialToken} />
            </head>
            <body>
                <Shell>{children}</Shell>
            </body>
        </html>
    );
}
