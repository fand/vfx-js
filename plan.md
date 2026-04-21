# Effect Interface for @vfx-js/core

## Context

現在の `@vfx-js/core` は effect を純 GLSL 文字列 (`VFXPass[]`) として扱っており、JS 側の state を持てない（`packages/vfx-js/src/constants.ts:41-64` のプリセット群、`packages/vfx-js/src/types.ts:18-64` の `VFXPass` を参照）。複雑な effect（流体シミュレータなど）は storybook 側で `VFXPass[]` をビルドして渡すしかなく、再利用可能なパッケージとして配布しにくい。

この変更で、以下を満たす Effect 抽象化を追加する:

- Effect は init / update / render / dispose の optional ライフサイクルを持つ
- Context 経由で asset（render target 等）と raw WebGL を扱える
- **Effect 実装パッケージは `@vfx-js/core` を devDependency としてのみ利用**し、runtime では何も import しないで済む（構造的 interface + 型のみの契約）
- **Composable**: `effect: grayscale` (単一) と `effect: [grayscale, bloom]` (配列) の両方を受ける。配列なら順に pipeline 化する

## Design

### Public types (packages/vfx-js/src/types.ts に追加)

**public API から three 型は完全に排除する** (`@types/three` 不要で effect を書ける)。内部では引き続き three backed だが、ブランド型と raw WebGL escape hatch (`ctx.gl` のみ) で閉じる。これにより将来 three を剥がす / WebGPU backend を入れる migration で breaking を最小化できる。

結果として three 固有機能 (別 three scene の RenderTarget 出力、TSL/NodeMaterial、`renderer.properties.__webglTexture` 経由の WebGLTexture 抽出) は使えなくなる。three.Texture を効かせたいユーザーは、源ソース (HTMLImageElement / Canvas / ImageBitmap) を `ctx.wrapTexture` に直接渡す or `ctx.gl.createTexture()` + `texImage2D` で自前 upload して `ctx.wrapTexture(glTex, {size})` に渡すルートを取る。

```ts
export type EffectTexture = { readonly __brand: "EffectTexture" };

export type EffectRenderTarget = {
    readonly texture: EffectTexture;
    readonly width: number;
    readonly height: number;
    readonly __brand: "EffectRenderTarget";
};

export type EffectUniformValue =
    | number
    | [number, number]
    | [number, number, number]
    | [number, number, number, number]
    | EffectTexture
    | EffectRenderTarget;

// Source types accepted by ctx.wrapTexture. Intentionally no three.Texture
// here — the public API must not require @types/three. three.Texture users
// must pass their HTMLImageElement/Canvas/ImageBitmap source directly, or
// upload via ctx.gl themselves and pass the resulting WebGLTexture.
export type EffectTextureSource =
    | WebGLTexture
    | HTMLImageElement
    | HTMLCanvasElement
    | HTMLVideoElement
    | ImageBitmap;

export type EffectUniforms = { [name: string]: EffectUniformValue };

export type EffectRenderTargetOpts = {
    // Omit → match element size × pixelRatio and auto-resize on element resize.
    // Specify tuple → fixed size, no auto-resize. Tuple form prevents the
    // ambiguous "only-one-dimension" case and matches resolution/mouse style.
    size?: readonly [number, number];
    float?: boolean;       // default: false
    persistent?: boolean;  // default: false (double-buffered when true)
};

// Geometry: regl-shaped POJO. Maps 1:1 to three.js BufferGeometry today and
// WebGPU GPUVertexBufferLayout + primitive.topology tomorrow. Attribute names
// (not shaderLocation numbers) are the user contract; backend resolves to
// locations during material/pipeline compile, which keeps TSL/WGSL migration
// transparent to effect authors.
export type EffectTypedArray =
    | Float32Array | Uint8Array | Uint16Array | Uint32Array
    | Int8Array | Int16Array | Int32Array;

export type EffectAttributeDescriptor =
    | EffectTypedArray // shorthand: Float32Array, itemSize inferred from shader
    | {
          data: EffectTypedArray;
          itemSize: 1 | 2 | 3 | 4;
          normalized?: boolean;
          perInstance?: boolean; // InstancedBufferAttribute / WebGPU stepMode:"instance"
          // Optional explicit vertex attribute location. GLSL: honored via
          // gl.bindAttribLocation before link (otherwise auto). WGSL (future):
          // must match @location(N) in user's shader source. Omit for GLSL;
          // specify when writing raw WGSL.
          location?: number;
      };

export type EffectGeometry = {
    mode?: "triangles" | "lines" | "lineStrip" | "lineList" | "points"; // default: triangles
    attributes: Record<string, EffectAttributeDescriptor>; // "position" is conventional
    indices?: Uint16Array | Uint32Array;
    instanceCount?: number;
    drawRange?: { start?: number; count?: number };
};

// Opaque handle for the effect's "target region" quad:
//   element effect → element rect + overflow padding
//   post effect    → viewport + scrollPadding
// Users cannot construct or extend it; treat it as an injected default.
export type EffectQuad = { readonly __brand: "EffectQuad" };

export type EffectDrawOpts = {
    frag: string;
    vert?: string;
    geometry?: EffectQuad | EffectGeometry; // default: ctx.quad
    uniforms?: EffectUniforms;
    target?: EffectRenderTarget | null; // null => ctx.output
};

export type EffectContext = {
    // High-level API (no three import needed)
    readonly time: number;
    readonly deltaTime: number;
    readonly resolution: readonly [number, number];
    readonly mouse: readonly [number, number];
    readonly intersection: number;
    readonly enterTime: number;
    readonly leaveTime: number;
    readonly src: EffectTexture;
    readonly output: EffectRenderTarget | null; // final target; null => canvas
    readonly uniforms: Readonly<Record<string, EffectUniformValue>>;
    readonly quad: EffectQuad; // canonical target-region quad for this effect
    createRenderTarget(opts?: EffectRenderTargetOpts): EffectRenderTarget;
    // Wrap an externally-produced texture so it can be passed in uniforms.
    // WebGLTexture requires opts.size (no JS-side introspection available);
    // all other sources carry their own dimensions. Ownership of external
    // sources stays with the caller; DOM sources are uploaded internally
    // and the backing GPU resource is released on EffectHost.dispose().
    wrapTexture(
        source: EffectTextureSource,
        opts?: { size?: readonly [number, number] }
    ): EffectTexture;
    draw(opts: EffectDrawOpts): void; // geometry omitted => ctx.quad
    // Identity copy shortcut: draw src into target using an internal passthrough
    // shader. Useful for update-only effects that want to be transparent but
    // still emit, or for debugging intermediate chain stages.
    blit(src: EffectTexture, target: EffectRenderTarget | null): void;

    // Raw escape hatch: the live WebGL2 context VFX-JS renders into.
    // Use for custom GL operations (DataTexture upload, extensions, MRT, etc).
    // No three renderer is exposed — that is an intentional boundary so that
    // VFX-JS's backend (three today, raw WebGL / WebGPU later) stays swappable.
    readonly gl: WebGL2RenderingContext;
};

export interface Effect {
    init?(ctx: EffectContext): void | Promise<void>;
    update?(ctx: EffectContext): void;
    // Optional. If omitted, the effect is TRANSPARENT in the chain:
    // its slot produces no render pass, no intermediate RT is allocated,
    // and the previous rendering effect's output becomes the next rendering
    // effect's input directly. Use for update/init/dispose-only effects
    // (telemetry, external state coordination, debug hooks).
    render?(ctx: EffectContext): void;
    dispose?(): void;
    // Declares the output dimensions this effect writes into ctx.output.
    // Called at chain init and on element/viewport resize (NOT per frame).
    // Default: same as input (i.e. the size of ctx.src at that slot).
    // Only meaningful when render is present.
    outputSize?(dims: {
        readonly input: readonly [number, number];
        readonly element: readonly [number, number];
        readonly viewport: readonly [number, number];
        readonly pixelRatio: number;
    }): readonly [number, number];
}
```

`VFXProps` に `effect?: Effect | readonly Effect[];` を追加（`packages/vfx-js/src/types.ts:192-327`）。`shader` と排他。両方指定されたら effect を優先し dev warn を出す。単一形式は内部で長さ 1 の配列に正規化。空配列は dev warn + 要素 capture をそのまま最終 target に blit (identity chain)。

### 公開 export (packages/vfx-js/src/index.ts)

```ts
export type {
    Effect, EffectContext,
    EffectTexture, EffectTextureSource, EffectRenderTarget, EffectQuad,
    EffectUniforms, EffectUniformValue,
    EffectGeometry, EffectAttributeDescriptor, EffectTypedArray,
    EffectRenderTargetOpts, EffectDrawOpts,
} from "./types.js";
```

既存 `VFXOpts / VFXProps / VFXPostEffect / VFXPass` はそのまま。

### ユーザー側の使い方イメージ

```ts
// effect-my-effect/package.json
//   "devDependencies": { "@vfx-js/core": "^0.12.0" }
// effect-my-effect/src/index.ts
import type { Effect, EffectRenderTarget } from "@vfx-js/core"; // erased at compile

const FRAG = `...`;

export function createTrailEffect(): Effect {
    let feedback: EffectRenderTarget | null = null;
    return {
        init(ctx) {
            feedback = ctx.createRenderTarget({ persistent: true });
        },
        render(ctx) {
            // geometry omitted → ctx.quad (element rect + overflow or
            // viewport + scrollPadding depending on effect type)
            ctx.draw({
                frag: FRAG,
                uniforms: { src: ctx.src, prev: feedback!, time: ctx.time },
                target: feedback,
            });
            ctx.draw({
                frag: `/* copy */`,
                uniforms: { src: feedback! },
                target: ctx.output,
            });
        },
    };
}
```

Composition:

```ts
// Single effect
vfx.add(el, { effect: grayscale() });

// Pipeline — array order = pass order
vfx.add(el, { effect: [grayscale(), bloom({ threshold: 0.8 })] });

// Mixed: render-having effects form passes; render-less effects are transparent
vfx.add(el, { effect: [
    grayscale(),         // pass 0: capture → intermediate
    telemetry(),         // no render → skipped; grayscale output flows directly to bloom
    bloom({ ... }),      // pass 1: reads grayscale output, writes final target
]});
```

State-ful Effect は instance 単位で独立。**複数要素で同じ Effect オブジェクトを使い回さない** (factory 関数で毎回生成する)。

Custom geometry (e.g. line-strip trajectory overlay):

```ts
ctx.draw({
    frag: LINE_FRAG,
    vert: LINE_VERT,
    geometry: {
        mode: "lineStrip",
        attributes: {
            position: { data: positions, itemSize: 2 },
            aLife:    { data: life,      itemSize: 1 },
        },
    },
    uniforms: { color: [1, 0.4, 0.2] },
    target: ctx.output,
});
```

### Composition protocol

**正規化**: `effect` は `Effect | readonly Effect[]` を受け、内部で常に `readonly Effect[]` として扱う。

**レンダリング対象 effect の抽出**: 配列を走査し `render` を持つ effect のインデックス列 `renderingIndices` を得る。長さ M = `renderingIndices.length`。

**Intermediate RT の allocation** (chain init 時 / element・viewport resize 時):
- M = 0 なら intermediate 不要
- M ≥ 1 なら M - 1 個の intermediate を allocate
- 各 intermediate のサイズ = 対応する effect の `outputSize(dims)` (未指定なら input と同サイズ)
- `input` dims は、chain 先頭なら element rect × pixelRatio、以降は直前の rendering effect の output サイズ
- サイズ / float flag が前フレームと変わった intermediate のみ再 allocate (pool 化)

**毎フレームの実行順**:

1. **update phase**: 配列順に全 effect の `update?.(ctx)` を呼ぶ (ctx.src / ctx.output は前フレームの値でよい — update は state 更新のみ前提)
2. **render phase**: `renderingIndices` を順に走査。k 番目の rendering effect (元配列 index i) について:
   - `ctx.src` = (k=0) ? element capture : `intermediates[k-1].texture`
   - `ctx.output` = (k = M-1) ? final target (post-RT or null for canvas) : `intermediates[k]`
   - `effects[i].render(ctx)` を呼ぶ (effect は自分が chain 中のどこにいるか知らない)
3. **M = 0 の特殊ケース**: update-only な effect しか無い場合、chain は全透過。orchestrator が capture → final target へ 1 回 `blit` する (element が描画されなくなる事故を防ぐ)

**ctx オブジェクトの mutation**: 各 effect は **自分専用の `EffectContext` オブジェクト** を持つ (EffectHost が所有)。orchestrator は render phase でその object の `src` / `output` / `time` / `deltaTime` / `mouse` 等を書き換えるだけで、新規オブジェクトを作らない (reference stability と allocation 削減のため)。

**Lifecycle ordering**:
- `init`: 配列順、**sequential + await** (Promise 返却時は次に進む前に解決する)
- `update`: 毎フレーム配列順
- `render`: 毎フレーム `renderingIndices` 順
- `dispose`: 要素削除時に **配列 reverse 順**、各 `EffectHost.dispose()` も同時に

**State 共有ルール** (ドキュメント明示):
> Effect instances are stateful. Do not share a single Effect object across multiple elements — use a factory function that returns a new Effect per call.

## Implementation

### 修正対象ファイル

- **`packages/vfx-js/src/types.ts`** — 上記新型を追加、`VFXProps` に `effect?` 追加
- **`packages/vfx-js/src/index.ts`** — 新型の export を追加
- **`packages/vfx-js/src/vfx-player.ts`** — Effect パスの組み込み (下記)
- **`packages/vfx-js/src/effect-host.ts`** (新規) — `EffectContext` の実装、draw 用の geometry/material キャッシュ、RT 管理
- **`packages/vfx-js/src/effect-chain.ts`** (新規) — pipeline orchestrator: intermediate RT 管理、ctx.src/ctx.output の差し替え、init / update / render / dispose の順序制御
- **`packages/vfx-js/src/effect-geometry.ts`** (新規) — `EffectGeometry` POJO → `THREE.BufferGeometry` 変換 (WeakMap でキャッシュ)、`EffectQuad` 解決（element rect / viewport + scrollPadding を attribute として詰める）
- **`packages/vfx-js/src/vfx.ts`** — `add()` / `addHTML()` が `effect` プロパティを通す（ほぼ素通し）

### VFXPlayer 側の変更 (packages/vfx-js/src/vfx-player.ts)

1. `addElement` (L280-570) 冒頭で `opts.effect` を検出し、shader パス (passes 構築) をスキップして Effect パスを走らせる
2. 新規 `#addEffectElement(element, opts)`:
   - VFXElement を生成（`type`, `element`, `texture = await createTexture(...)` は既存ルートを再利用）
   - `opts.effect` を `readonly Effect[]` に正規化
   - 各 effect に対して `EffectHost` を new する (effect と 1:1)。`EffectHost` は:
     - 既存 `this.#renderer` / `this.#camera` / `#floatRTType` / `#pixelRatio` への参照を保持
     - 内部で `Map<string, { material }>` を持ち draw のシェーダをソース (frag+vert) キーでキャッシュ
     - `WeakMap<EffectGeometry, THREE.BufferGeometry>` を持ち geometry POJO を遅延コンパイル + キャッシュ（同じ参照を渡せば再構築無し）
     - `ctx.quad` は `EffectQuad` opaque token。draw 時に内部で「element effect → element rect + overflow の attribute」「post effect → viewport + scrollPadding の attribute」を詰めた `BufferGeometry` に解決（要素サイズ変更時のみ再構築）
     - `createRenderTarget(opts)` は `THREE.WebGLRenderTarget` or `Backbuffer` (`packages/vfx-js/src/backbuffer.ts:9-73` を再利用) をラップしてブランド付き handle を返す
     - `ctx.blit(src, target)` 用の internal passthrough material を 1 つ持つ (host 間では共有せず、各 host が所有。material キャッシュ経由でシェーダコンパイルは 1 回のみ)
     - 管理した RT / geometry / material はすべて `dispose()` で一括解放
   - `EffectChain` を new する。`EffectChain` は:
     - `hosts: EffectHost[]` を保持 (effects と 1:1)
     - `renderingIndices: number[]` を計算 (render を持つ effect の index 列)
     - `intermediates: (EffectRenderTarget | null)[]` を保持 (長さ M-1、M = renderingIndices.length)
     - サイズ再計算メソッド `resizeIntermediates(elementSize, viewportSize, pixelRatio)` を持ち、各 rendering effect の `outputSize()` を順に問い合わせて input→output を伝搬、サイズが変わった intermediate のみ再 allocate
     - `run(capture, finalTarget)` メソッドで毎フレーム実行: update phase → render phase。M=0 特殊ケースの identity blit もここで処理
     - `dispose()` で配列 reverse 順に各 effect の `dispose()` と各 host の `dispose()`、intermediate RT の release
   - 配列順に `await effects[i].init?.(hosts[i].ctx)` を sequential で呼ぶ
   - 要素を `#elements` に挿入、`#hitTest` も既存どおり
3. `render()` (L668-969) のループ内で、要素が effect タイプなら既存の passes レンダリングではなく:
   - chain 全体のフレーム状態 (time/mouse/resolution/intersection/enterTime/leaveTime/deltaTime) を各 host の ctx に反映 (EffectChain が一括)
   - `chain.run(elementCapture, finalTarget)` を呼ぶ
   - `finalTarget` は post-effect の有無で分岐:
     - post-effect あり: `#postEffectRenderTarget` を handle でラップして渡す
     - post-effect なし: `null` (→ canvas 直書き) + `#renderer.setViewport` を要素の矩形に合わせる
4. element resize / viewport resize 時に `chain.resizeIntermediates(...)` を呼ぶ
5. `removeElement`: `chain.dispose()` のみ (内部で effect.dispose と host.dispose を一括処理)

### draw 実装詳細

- `RawShaderMaterial` はシェーダソース (frag + vert) をキーにキャッシュ（同一 effect が複数 pass で同じシェーダを使う場合に再コンパイルを避ける）
- geometry:
  - `EffectQuad` (ctx.quad) → `EffectHost` が effect 種別に応じて `BufferGeometry` を内部生成（element effect: element rect + overflow、post effect: viewport + scrollPadding）。要素サイズ / viewport 変更時のみ再構築
  - `EffectGeometry` POJO → WeakMap で `BufferGeometry` にコンパイル。attribute descriptor → `BufferAttribute` / `InstancedBufferAttribute`、indices → `setIndex`、`mode` は描画時の Object3D 種別 (`Mesh` / `Line` / `LineSegments` / `Points`) にマップ。ユーザーが同じ POJO 参照を使い回せば再コンパイル無し、異なる参照なら毎回新規（短命 geometry 用途）
  - geometry 省略 → `ctx.quad` 扱い
- uniforms は `THREE.IUniform` に正規化。`EffectTexture` / `EffectRenderTarget` handle は内部 `three.Texture` に解決
- `setRenderTarget(target)` → `renderer.render(scene, camera)` → persistent なら `backbuffer.swap()`
- null target の場合は `ctx.output` にフォールバック。`ctx.output` も null なら canvas 直書き (要素矩形 viewport を適用)
- attribute 名は shader と一致する必要あり（backend で `BufferGeometry.setAttribute(name, ...)` するだけ）
- `location?` 指定時は GLSL で `gl.bindAttribLocation(program, location, name)` を link 前に呼んで尊重。未指定なら従来通り名前解決のみ
- 将来 WebGPU backend で TSL に切り替える場合: 名前ベースのまま TSL が location 自動割り当て
- 将来 raw WGSL サポートする場合: ユーザー shader の `@location(N)` と descriptor の `location` を一致させる契約。現状は GLSL のみ想定のため `location?` は optional かつ未指定でも動く

### 既存コードへの影響

- `VFXProps.shader` は deprecated にしない（既存ユーザーと 23 個のプリセットに影響）
- Effect 経路は完全に独立したコードパス。shader/post-effect 周りのロジックは touch しない
- 内部的には shader/pass 実装も将来 Effect で書き直せる（今回の PR では行わない）

## 検証

1. **型チェック**: `npm --workspace=@vfx-js/core run build` で dual ESM/CJS が通り、`lib/esm/index.d.ts` に新型が export されていること
2. **ユニットテスト**: `packages/vfx-js/src/effect-host.test.ts` と `packages/vfx-js/src/effect-chain.test.ts` を追加（Vitest）
   - EffectHost:
     - draw の material キャッシュがソース一致で 1 インスタンスになる
     - 同じ `EffectGeometry` 参照を 2 回渡すと `BufferGeometry` が再利用される (WeakMap hit)
     - `perInstance: true` 指定で `InstancedBufferAttribute` が生成される
     - `mode: "lineStrip"` で描画時の Object3D が `Line` になる
     - `ctx.quad` が省略された draw と明示指定した draw で同じ結果になる
     - `ctx.blit(src, target)` が passthrough 1 pass で完了する
     - createRenderTarget に persistent:true で backbuffer が返る
     - EffectHost.dispose() で全 RT / geometry / material が解放される
   - EffectChain:
     - 単一 Effect と長さ 1 配列が同じ挙動になる
     - N=3 で render を持つ 3 effect を繋ぐと intermediates 2 枚 allocate され、pass 順に src/output が差し替わる
     - 中間 effect が `render` を持たない場合、その slot は skip され、前 effect の output が直後の rendering effect の src になる (intermediate 数が減る)
     - 全 effect が render 欠損なら M=0 特殊ケースで capture → finalTarget へ 1 回 blit される
     - `outputSize` を指定すると対応する intermediate が指定サイズで allocate される
     - element resize 時に intermediate のサイズが再計算・再 allocate される (サイズ変更なしなら流用)
     - `init` が Promise を返すと sequential に await される (後続 effect の init が先行 effect 完了前に走らない)
     - `dispose` が配列 reverse 順で呼ばれる
   - run: `npm --workspace=@vfx-js/core run test`
3. **統合デモ**: `packages/storybook/src/Effect.stories.ts` を追加し、simple trail effect を実装。`@vfx-js/core` を devDep 扱いで `import type` のみ使う想定で書いて `npm --workspace=storybook run dev` でブラウザ確認
4. **zero-runtime-dep 検証**: storybook のストーリ内で `import type { Effect } ...` のみ書き、ビルド成果物を `grep` して `@vfx-js/core` への runtime import が含まれないことを確認
5. **既存テスト**: `npm test` と `npm run lint` が通ること

## Critical files

- `packages/vfx-js/src/types.ts` — 新型追加 + `VFXProps.effect` 追加 (既存 L18-64, L192-327)
- `packages/vfx-js/src/index.ts` — 新型 export (既存 L1-12)
- `packages/vfx-js/src/vfx-player.ts` — effect パス分岐 (既存 `addElement` L280-570, `render` L668-969, `#renderPostEffects` L1202-1375)
- `packages/vfx-js/src/effect-host.ts` — 新規 (EffectContext 実装)
- `packages/vfx-js/src/effect-chain.ts` — 新規 (pipeline orchestrator、intermediate RT 管理)
- `packages/vfx-js/src/effect-geometry.ts` — 新規 (EffectGeometry → BufferGeometry 変換 + ctx.quad 解決)
- `packages/vfx-js/src/backbuffer.ts` — そのまま再利用 (L9-73)
- `packages/vfx-js/src/vfx.ts` — `effect` プロパティ素通し (既存 `add` L33-273)
- `packages/storybook/src/Effect.stories.ts` — 新規デモ
