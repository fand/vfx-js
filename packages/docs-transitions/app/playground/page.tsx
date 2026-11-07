import type { Metadata } from "next";
import { PageTransition } from "../_components/page-transition";
import { ShaderLab } from "./shader-lab";

export const metadata: Metadata = { title: "Playground" };

export default function PlaygroundPage() {
    return (
        <div className="frame" data-tone="dark">
            <PageTransition preset="crosszoom" />
            <ShaderLab
                head={
                    <header className="lab-head">
                        <h1>Playground</h1>
                        <p>
                            Write a transition in GLSL, or load a preset or a
                            gl-transition and change it. Press Play to run it on
                            the stage.
                        </p>
                    </header>
                }
            />
        </div>
    );
}
