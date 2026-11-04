import type { Metadata } from "next";
import { PageFrame } from "../_components/page-frame";
import { TLink } from "../_components/t-link";
import { FrameworkTabs } from "./framework-tabs";

export const metadata: Metadata = { title: "Getting Started" };

export default function GettingStarted() {
    return (
        <PageFrame tone="paper">
            <section className="doc-hero">
                <p className="kicker">Getting Started</p>
                <h1>
                    Pick your <em>stack</em>.
                </h1>
                <p className="lead">
                    Every setup follows the same three steps: give the outlet a
                    fixed size, snapshot the old page before the DOM changes,
                    and let the shader run.
                </p>
            </section>

            <section className="doc-section">
                <ol className="steps">
                    <li>
                        <strong>Install</strong>
                        <span>
                            <code>@vfx-js/core</code> and{" "}
                            <code>@vfx-js/transitions</code>. Add{" "}
                            <code>@vfx-js/react</code> for React.
                        </span>
                    </li>
                    <li>
                        <strong>Fix the size</strong>
                        <span>
                            The target is your router outlet. Give it a height,
                            like <code>100dvh</code>.
                        </span>
                    </li>
                    <li>
                        <strong>Hook the router</strong>
                        <span>
                            Start a run before the swap. Pick a preset per link.
                        </span>
                    </li>
                </ol>
            </section>

            <section className="doc-section">
                <FrameworkTabs />
            </section>

            <section className="doc-section doc-next">
                <TLink
                    href="/how-it-works"
                    preset="crosszoom"
                    className="next-card"
                >
                    <span>Next</span>
                    <strong>How it works →</strong>
                </TLink>
                <TLink
                    href="/transitions"
                    preset="pixelsort"
                    className="next-card"
                >
                    <span>Try</span>
                    <strong>All transitions →</strong>
                </TLink>
            </section>
        </PageFrame>
    );
}
