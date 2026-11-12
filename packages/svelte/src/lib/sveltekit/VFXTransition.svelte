<!--
  Animate between SvelteKit pages with a shader.
  Put it around `{@render children()}` in a layout. Each path is one page.
  The target fills the viewport height by default; pass `fullscreen={false}` to size it yourself.
-->
<script lang="ts" generics="T extends Transition | TransitionClass">
    import { onNavigate } from "$app/navigation";
    import { page } from "$app/state";
    import type {
        AddTransitionOpts,
        RunContext,
        Transition,
        TransitionClass,
        TransitionHandle,
    } from "@vfx-js/core";
    import { onMount, setContext, type Snippet } from "svelte";
    import type { HTMLAttributes } from "svelte/elements";
    import { createScope, TransitionScopeKey } from "../scope.js";
    import { attachVFX } from "../vfx.js";

    type Props = AddTransitionOpts<T> &
        Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
            /** Size the target to the viewport height. Default `true`; `false` leaves sizing to your CSS. */
            fullscreen?: boolean;
            children?: Snippet;
        };

    let {
        children,
        fullscreen = true,
        style,
        transition,
        params,
        reverse,
        duration,
        overflow,
        ease,
        keepWrapped,
        waitFor,
        autoReverse,
        keepPlaying,
        ...attrs
    }: Props = $props();

    // Pages share one viewport-sized box and scroll inside it.
    const FILL_STYLE = "height: 100dvh; overflow: hidden;";

    const scope = createScope();
    setContext(TransitionScopeKey, scope);

    // One options object that follows the props.
    // Core reads it on each run, so a prop change applies to the next run.
    const live: Record<string, unknown> = {};
    $effect.pre(() => {
        const opts: Record<string, unknown> = {
            transition,
            params,
            reverse,
            duration,
            overflow,
            ease,
            keepWrapped,
            waitFor,
            autoReverse,
            keepPlaying,
        };
        for (const [key, value] of Object.entries(opts)) {
            if (value === undefined) {
                delete live[key];
            } else {
                live[key] = value;
            }
        }
    });

    let target: HTMLDivElement;
    let handle: TransitionHandle | null = null;
    // The run that waits for the new page, while it waits.
    let held: RunContext | null = null;

    // A config change replaces the VFX; a run on the old one is cut.
    onMount(() =>
        attachVFX((vfx) => {
            handle = vfx.addTransition(target, live as AddTransitionOpts);
            return () => {
                handle?.destroy();
                handle = null;
            };
        }),
    );

    // SvelteKit waits for this promise before it updates the DOM,
    // so the run captures the old page first.
    onNavigate((nav) => {
        const t = handle;
        if (!t || !nav.to || nav.to.url.pathname === nav.from?.url.pathname) {
            return;
        }
        scope.reset();
        return new Promise<void>((snapshotTaken) => {
            t.run(
                async (run) => {
                    held = run;
                    snapshotTaken();
                    try {
                        // Rejects when the navigation fails; core then ends the run.
                        await nav.complete;
                    } finally {
                        if (held === run) {
                            held = null;
                        }
                    }
                },
                // Read once the new page is in, so its transitionIn counts.
                () => scope.pick(),
            ).catch(() => {});
        });
    });

    // Longer than any run; the outro ends when core gives the page back.
    const HOLD_MS = 60 * 60 * 1000;

    // The leaving page's outro: hand it to core and keep it until core gives it back.
    function keepOldPage(node: HTMLElement) {
        const parent = node.parentNode;
        held?.keepPlaying(node, () => {
            node.style.display = "none";
            endOutro(node);
        });
        // Core keeps nothing when the run does not use keepPlaying.
        return { duration: node.parentNode === parent ? 0 : HOLD_MS };
    }

    // Svelte removes the page once its outro animation ends.
    // The animation may not exist yet, so retry each frame until it ends.
    function endOutro(node: HTMLElement) {
        let ended = false;
        node.addEventListener("outroend", () => (ended = true), { once: true });
        const finish = () => {
            if (ended || !node.isConnected) {
                return;
            }
            for (const animation of node.getAnimations()) {
                animation.finish();
            }
            requestAnimationFrame(finish);
        };
        finish();
    }
</script>

<!--
  Core moves the inner div into a canvas during a run.
  Svelte removes the outer div on destroy, and that one never moves.
-->
<div style="display: contents">
    <div
        {...attrs}
        bind:this={target}
        style={fullscreen ? `${FILL_STYLE}${style ?? ""}` : style}
    >
        {#if keepPlaying}
            <!-- A new path makes a new block, so the old page stays while it leaves. -->
            {#key page.url.pathname}
                <div style="display: contents" out:keepOldPage>
                    {@render children?.()}
                </div>
            {/key}
        {:else}
            {@render children?.()}
        {/if}
    </div>
</div>
