import { Footer } from "./footer";

export type Tone = "light" | "paper" | "dark";

/** One page in the outlet: scrolls on its own and ends with the footer. */
export function PageFrame({
    tone,
    simpleFooter = false,
    children,
}: {
    tone: Tone;
    simpleFooter?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="frame" data-tone={tone}>
            <main className="frame-main">{children}</main>
            <Footer simple={simpleFooter} />
        </div>
    );
}
