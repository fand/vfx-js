import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame } from "../_components/page-frame";
import { PageTransition } from "../_components/page-transition";
import { FrameworkTabs } from "./framework-tabs";

export const metadata: Metadata = { title: "Getting Started" };

export default function GettingStarted() {
    return (
        <PageFrame tone="paper" simpleFooter>
            <PageTransition preset="swipe" />
            <section className="doc-title">
                <h1>Getting Started</h1>
            </section>

            <section id="setup" className="doc-section">
                <FrameworkTabs />
            </section>

            <section id="next" className="doc-section doc-next">
                <Link href="/how-it-works" className="next-card">
                    <span>Next</span>
                    <strong>How it works →</strong>
                </Link>
                <Link href="/presets" className="next-card">
                    <span>Try</span>
                    <strong>All presets →</strong>
                </Link>
            </section>
        </PageFrame>
    );
}
