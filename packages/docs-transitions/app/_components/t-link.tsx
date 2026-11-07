"use client";

import { transition } from "@vfx-js/react";
import Link from "next/link";
import { presets } from "../_lib/presets";
import type { PresetName } from "../_lib/site";

/** A Link that plays `preset` on click. Usable from Server Components. */
export function TLink({
    preset,
    ...props
}: React.ComponentProps<typeof Link> & { preset: PresetName }) {
    return (
        <Link
            {...props}
            onClick={transition({ transition: presets[preset] })}
        />
    );
}
