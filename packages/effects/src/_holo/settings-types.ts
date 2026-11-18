import type { ParamValue } from "./types.js";

export interface ParamSpec {
    id: string;
    kind: string;
    default: ParamValue | { type: string };
    min?: number;
    max?: number;
    options?: readonly string[];
}

export type LookData = Readonly<
    Record<
        "card" | "object",
        Readonly<
            Record<
                string,
                {
                    values: Readonly<Record<string, ParamValue>>;
                    pose: { rx: number; ry: number };
                }
            >
        >
    >
>;
