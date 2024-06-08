import { useContext } from "react";
import { VFXContext } from "./context";

export function useVfx(): (e: HTMLElement) => void {
    const player = useContext(VFXContext);

    return (e: HTMLElement) => player?.updateTextElement(e);
}
