import type { Metadata } from "next";
import Link from "next/link";
import { Code } from "../_components/code";
import { PageFrame } from "../_components/page-frame";
import { PageTransition } from "../_components/page-transition";

export const metadata: Metadata = { title: "Limitations" };

export default function Limitations() {
    return (
        <PageFrame tone="paper" simpleFooter>
            <PageTransition preset="tile" />
            <section className="doc-title">
                <h1>Limitations</h1>
            </section>

            <section id="browsers" className="doc-section doc-prose">
                <div>
                    <h2>Browser support</h2>
                    <p>
                        Transitions run in any browser with WebGL. How VFX-JS
                        captures the content depends on the browser.
                    </p>
                    <h3>With HTML-in-Canvas</h3>
                    <p>
                        The browser draws the element into the canvas itself,
                        with <code>drawElementImage</code>, so the capture
                        matches the page. HTML-in-Canvas is still experimental:
                        it is in Chrome Canary, or in Chrome with{" "}
                        <code>chrome://flags/#canvas-draw-element</code> on.
                    </p>
                    <h3>Without it</h3>
                    <p>
                        Safari, Firefox and Chrome by default use dom-to-canvas.
                        VFX-JS clones the element, copies its computed styles
                        onto the clone, and draws the clone as an SVG image.
                        This is a workaround, and it can't match the page
                        exactly. Some content doesn't make it into the capture:
                    </p>
                    <ul>
                        <li>
                            <code>::before</code> and <code>::after</code>. The
                            clone has no stylesheets.
                        </li>
                        <li>
                            Web fonts and CSS background images. An SVG image
                            can't load other files, so text falls back to a
                            local font.
                        </li>
                        <li>Cross-origin images served without CORS.</li>
                        <li>
                            The content of <code>&lt;canvas&gt;</code>,{" "}
                            <code>&lt;video&gt;</code> and{" "}
                            <code>&lt;iframe&gt;</code>.
                        </li>
                        <li>Content inside shadow roots.</li>
                    </ul>
                    <p>
                        The SVG renderer can also draw some CSS differently from
                        the page. Safari, for example, draws{" "}
                        <code>box-shadow</code> wrong in the capture. These gaps
                        show only during a run; the page itself is plain DOM
                        before and after.
                    </p>
                </div>
            </section>

            <section id="motion" className="doc-section two-col">
                <div>
                    <h2>Reduced motion</h2>
                    <p>
                        VFX-JS doesn&apos;t check{" "}
                        <code>prefers-reduced-motion</code>. Set{" "}
                        <code>duration</code> to 0 to cut without animation.
                    </p>
                </div>
                <Code label="main.ts">{`
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const t = vfx.addTransition(el, {
  transition: Swipe,
  duration: reduce ? 0 : 0.6,
});
`}</Code>
            </section>

            <section id="keep-playing" className="doc-section doc-prose">
                <div>
                    <h2>keepPlaying</h2>
                    <p>
                        With <code>keepPlaying</code>, VFX-JS moves the old
                        content into a hidden canvas next to the container and
                        captures it every frame. That has costs and side
                        effects.
                    </p>
                    <h3>One more capture per frame</h3>
                    <p>
                        The old and new content are both captured during the
                        run. Without HTML-in-Canvas, the run uses a snapshot as
                        usual.
                    </p>
                    <h3>Some selectors stop matching the old content</h3>
                    <p>
                        The hidden canvas holds a copy of the container without
                        its <code>id</code>, outside its parent. Rules that
                        reach the old content through <code>#id</code>,
                        ancestors (<code>.layout &gt; main .card</code>) or
                        siblings don't apply during the run, so it may look
                        different. The hidden canvas also sits next to the
                        container, which can break sibling selectors like{" "}
                        <code>main + footer</code> for a moment.
                    </p>
                    <h3>What keeps running depends on the framework</h3>
                    <ul>
                        <li>
                            React: the old page stays mounted, with its state
                            and effects.
                        </li>
                        <li>
                            Nuxt and SvelteKit: the old page's DOM keeps playing
                            (CSS animations, videos), but Vue and Svelte stop
                            updating it.
                        </li>
                        <li>
                            Astro and <code>show()</code>: the old nodes keep
                            running as they are.
                        </li>
                    </ul>
                    <h3>Function opts can't turn it on</h3>
                    <p>
                        With <code>run(cb, () =&gt; opts)</code>, the spec is
                        known only after <code>cb</code>, which is too late to
                        keep the old nodes. Set <code>keepPlaying</code> on the
                        container; the function can still turn it off.
                    </p>
                    <h3>Set it on the component</h3>
                    <p>
                        In React, Nuxt and SvelteKit, set{" "}
                        <code>keepPlaying</code> on{" "}
                        <code>&lt;VFXTransition&gt;</code>. A page or link spec
                        can turn it off but not on. The pages then sit in a{" "}
                        <code>display: contents</code> div, so{" "}
                        <code>.target &gt; .page</code> needs{" "}
                        <code>.target &gt; div &gt; .page</code>. Turning it on
                        or off remounts the shown page.
                    </p>
                    <h3>Framework notes</h3>
                    <ul>
                        <li>
                            Nuxt: <code>&lt;NuxtPage&gt;</code> must be a direct
                            child of <code>&lt;VFXTransition&gt;</code>, and
                            each page needs one root element. It replaces your
                            own page transition.
                        </li>
                        <li>
                            SvelteKit: each path change remounts the page and
                            its nested layouts.
                        </li>
                        <li>
                            Vue Router (without Nuxt) and{" "}
                            <code>useVFXTransition</code> don't hand the old
                            page over. With <code>useVFXTransition</code>, call{" "}
                            <code>ctx.keepPlaying()</code> yourself.
                        </li>
                    </ul>
                </div>
            </section>

            <section id="other" className="doc-section doc-prose">
                <div>
                    <h2>Other limits</h2>
                    <h3>Nested VFX elements freeze</h3>
                    <p>
                        VFX elements inside the container stop during a run and
                        show their plain content.
                    </p>
                    <h3>
                        <code>&lt;body&gt;</code> can't be the target
                    </h3>
                    <p>
                        Target the router outlet instead, like{" "}
                        <code>&lt;main&gt;</code>.
                    </p>
                    <h3>Size changes aren't animated</h3>
                    <p>
                        If the new content has a different size, the box stays
                        at the old size during the run and jumps afterwards.
                    </p>
                    <h3>One pending click spec per page</h3>
                    <p>
                        All <code>&lt;VFXTransition&gt;</code>s on the page
                        share it.
                    </p>
                    <h3>autoReverse needs the Navigation API</h3>
                    <p>
                        Without <code>navigation.currentEntry</code>, back plays
                        like any other navigation, with no reverse. After a
                        reload or in a new tab, no spec is stored yet, so the
                        first back plays its own spec too.
                    </p>
                    <h3>On back, the stored spec wins</h3>
                    <p>
                        With <code>autoReverse</code>, back plays the spec that
                        entered the page, even after{" "}
                        <code>setNextTransition()</code>.
                    </p>
                    <h3>Reduced motion cuts</h3>
                    <p>
                        With <code>prefers-reduced-motion: reduce</code>, every
                        run cuts to the new content.
                    </p>
                    <h3>Browser swipes cut</h3>
                    <p>
                        A phone animates a swipe back or forward on its own. The
                        run then cuts to the new page instead of playing a
                        second animation. Browsers without{" "}
                        <code>hasUAVisualTransition</code> play it as usual.
                    </p>
                    <h3>No multi-page navigation</h3>
                    <p>
                        Cross-document navigation isn't supported. With Turbo or
                        htmx, call core <code>run(cb)</code> by hand.
                    </p>
                </div>
            </section>

            <section className="doc-section doc-next">
                <Link href="/presets" className="next-card">
                    <span>Next</span>
                    <strong>All presets →</strong>
                </Link>
            </section>
        </PageFrame>
    );
}
