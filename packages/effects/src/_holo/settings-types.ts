import type { ParamValue } from "./types.js";

export interface ParamSpec {
    id: string;
    kind: string;
    /** null: depends on the element (the emboss logo's px placement). */
    default: ParamValue | { type: string } | null;
    min?: number;
    max?: number;
    step?: number;
    options?: readonly string[];
}

export type LookData = Readonly<
    Record<
        "card" | "object",
        Readonly<
            Partial<
                Record<
                    string,
                    {
                        values: Readonly<Record<string, ParamValue>>;
                        pose: { rx: number; ry: number };
                    }
                >
            >
        >
    >
>;
