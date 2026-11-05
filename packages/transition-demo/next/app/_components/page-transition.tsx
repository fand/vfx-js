"use client";

import { useTransitionIn } from "@vfx-js/react";
import { presets } from "../_lib/presets";
import type { PresetName } from "../_lib/site";

/**
 * Sets how this page enters.
 * A client component, since a def with JS hooks can't cross from a Server Component.
 */
export function PageTransition({ preset }: { preset: PresetName }) {
    useTransitionIn({ transition: presets[preset] });
    return null;
}
