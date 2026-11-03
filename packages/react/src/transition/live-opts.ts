import type { AddTransitionOpts } from "@vfx-js/core";
import { useRef } from "react";

/**
 * Keep one options object whose fields follow the latest props.
 * The transition reads it on each run, so prop changes apply without a new transition.
 */
export function useLiveOpts(opts: AddTransitionOpts): AddTransitionOpts {
    const live = useRef<AddTransitionOpts>({}).current as Record<
        string,
        unknown
    >;
    for (const key of Object.keys(live)) {
        if (!(key in opts)) {
            delete live[key];
        }
    }
    Object.assign(live, opts);
    return live as AddTransitionOpts;
}
