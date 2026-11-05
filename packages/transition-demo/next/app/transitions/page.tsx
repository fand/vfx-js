import type { Metadata } from "next";
import { PageFrame } from "../_components/page-frame";
import { PageTransition } from "../_components/page-transition";
import { presetList } from "../_lib/presets";
import { GLPlayground } from "./gl-playground";
import { Playground } from "./playground";

export const metadata: Metadata = { title: "Transitions" };

export default function Transitions() {
    return (
        <PageFrame tone="dark">
            <PageTransition preset="pixelsort" />
            <section className="doc-hero">
                <p className="kicker">Transitions</p>
                <h1>
                    Nine presets.
                    <br />
                    <em>Zero</em> config.
                </h1>
                <p className="lead">
                    Click a preset to play it on the stage. Change the duration,
                    play it in reverse, or let it loop. Below that, every shader
                    from gl-transitions.
                </p>
            </section>
            <section className="doc-section">
                <Playground />
            </section>
            <section className="doc-section">
                <h2>gl-transitions</h2>
                <p>
                    Any shader from{" "}
                    <a href="https://gl-transitions.com/">gl-transitions</a>{" "}
                    works through <code>createGLTransition</code>. Pick one to
                    play it.
                </p>
                <GLPlayground />
            </section>
            <section className="doc-section">
                <table className="preset-table">
                    <thead>
                        <tr>
                            <th>Preset</th>
                            <th>What it does</th>
                            <th>Factory</th>
                        </tr>
                    </thead>
                    <tbody>
                        {presetList.map((p) => (
                            <tr key={p.name}>
                                <td>
                                    <code>{p.name}</code>
                                </td>
                                <td>{p.note}</td>
                                <td>{p.factory && <code>{p.factory}</code>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </PageFrame>
    );
}
