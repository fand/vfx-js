export const scenes = [
    { id: "a", index: "01", word: "Ultra", sub: "marine" },
    { id: "b", index: "02", word: "Sol", sub: "ar flare" },
    { id: "c", index: "03", word: "Acid", sub: " bloom" },
    { id: "d", index: "04", word: "Noir", sub: " static" },
];

/** A loud card to transition between. Pure CSS, so it captures fast. */
export function Scene({ index }: { index: number }) {
    const s = scenes[index % scenes.length];
    return (
        <div className="scene" data-scene={s.id}>
            <div className="scene-grid" aria-hidden />
            <span className="scene-index">{s.index}</span>
            <div className="scene-word">
                {s.word}
                <em>{s.sub}</em>
            </div>
            <span className="scene-tag">@vfx-js/transitions</span>
        </div>
    );
}
