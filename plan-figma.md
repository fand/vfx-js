# Figma Shader Effects 実装プラン

対象は `spec-figma.md` の7エフェクト。
2部構成: (A) `@vfx-js/effects` への移植、(B) examples の "Figma Effects" ページ。

着手順は **Slice shift から**（仕様が軽く、Transform 共通ヘルパの最初の検証台にする）。

---

## A. エフェクト移植（`packages/effects/src/`）

### A0. 共通の足回り

- 1エフェクト1ファイル。`Effect` を実装（`render(ctx)` で `ctx.draw`）。雛形は `sinewave.ts`。
- frag は `#version 300 es` / `in vec2 uvContent` / `out vec4 outColor` / `uniform sampler2D src` /
  `uniform vec4 srcRectUv` の規約に揃える。
- 範囲外参照は `readTex(uv)` ヘルパ越しに。Edge wrap を持つエフェクトはここをモード分岐。
- 各 `*Params` 型は UI 名に寄せる（例 `threshold` / `thickness`）。`DEFAULT_PARAMS` をスクショ値で。
- `index.ts` に `export { XxxEffect, type XxxParams }` を追加。
- 色文字列は `voronoi.ts` の `parseHexColor`（`#rgb`/`#rrggbb`/`#rrggbbaa`）を共通化して使う。

**共通ヘルパ案**（新規 `packages/effects/src/_figma-common.ts`、`_curl-noise.ts` と同じ private 命名）:
- `parseHexColor(hex): [r,g,b,a]` を `voronoi.ts` から切り出して共有。
- Transform を持つエフェクト用に、`{x,y,r,a}` → `center(vec2)` / `rotation(mat2)` / `scale(float)`
  uniform を作る小関数 + GLSL スニペット文字列（回転・中心移動の前処理）。
- Edge wrap の GLSL `readTex` スニペット（Zero/Clamp/Repeat/Mirror を uniform int で分岐）。
- Bayer 行列の GLSL const（Dither 用、2/4/8/16）。

### A1. Slice shift（最初）

- params: `shift, softness, random, centerX, centerY, range, angle`。
- frag: 回転後の軸で `idx = floor(coord * sliceCount)`、`offset = shift*(...) + random*hash(idx)`、
  uv を `angle` 方向にずらして `readTex`。`softness` は隣接境界 `smoothstep` ブレンド。
- 検証: storybook story + examples で目視。Transform ヘルパの初出。

### A2. Pixel stretch

- params: `offset, smoothness, falloff, centerX, centerY, range, angle`。
- frag: `angle` 方向に投影 → `offset` ラインへ uv をクランプしてスメア。`falloff`/`smoothness` で元画像ブレンド。

### A3. Warp（enum Type×8）

- params: `type ('sine'|'twist'|'bulge'|'pinch'|'ripple'|'flag'|'squeeze'|'swirl'), amplitude, frequency, centerX, centerY, speed`。
- `type` を uniform int にマップ。frag 内 `if`/`switch` で uv 変形関数を分岐。
- `speed`（vfx拡張）で Flag/Ripple をアニメ。`speed=0` で静止。

### A4. Dither（enum Style×6）

- params: `style ('bayer2'|'bayer4'|'bayer8'|'bayer16'|'blueNoise'|'threshold'), size, levels, brightness, contrast, mono(bool), monoColor(string)`。
- Bayer は GLSL const 行列。blue noise は手織りの近似 or 小さな生成ノイズ（外部テクスチャを避け zero-dep 維持）。
- `mono` on で luminance を `monoColor` ↔ 背景で着色。

### A5. Pixelate（enum Shape×4 + Dissolve）

- params: `shape ('rect'|'ellipse'|'hexagon'|'triangle'), size, stretch, gap, colorTrim, averageColor, dissolveMode('dropout'), dissolve, falloff, knockout(bool)`。
- frag: セルグリッド → 形状 SDF マスク → セル中心色 + 平均ブレンド → `colorTrim` 量子化 →
  `gap` でマスク縮小 → `dissolve+falloff` を hash 間引き → `knockout` で alpha 抜き。
- 平均色はセル内数タップ平均で近似（重ければ mipmap/縮小バッファは後追い）。

### A6. Pattern refraction（最重・最後）

- params: `pattern ('lenticular'|'waves'|'circular'), strength, smoothness, frost, dispersion, edgeWrap('zero'|'clamp'|'repeat'|'mirror'), centerX, centerY, scale, angle`。
- frag: `pattern` 分岐で uv 変位を計算 → RGB別 `±dispersion` → `frost` ランダムぼかし →
  `edgeWrap` モードで `readTex`。`smoothness` でセル境目を連続化。

### A7 各エフェクトの storybook story

- `packages/storybook/src/Effect.stories.ts` の `presetStory` ヘルパに 7エフェクトを追加。
- enum は `argTypes` の `select`、色は `color`、Transform/数値は `range`。
- VRT（Chromatic）: 静的エフェクトは既定でスナップ可。アニメ（Warp speed>0）は `clock:true`、
  precision 依存が出るもの（Dither の量子化境界）は `chromatic.disableSnapshot`（既存 badJpeg と同様）。

### A8 export / ビルド確認

- `index.ts` に7つ追加。`pnpm --filter @vfx-js/effects run build` と `pnpm test` と `pnpm lint`。

---

## B. examples "Figma Effects" ページ

examples は `works/<id>.html` 単体HTML + `works.ts` 登録 + vite multi-entry（glob）。
既存 works はバンドル import（`@vfx-js/core` / `@vfx-js/effects` を bare specifier）。
このページは作品ではなくプレイグラウンド: **入力画像選択 + Tweakpane で全paramを実時間編集**。

### B1. 依存追加

- `packages/examples/package.json` に `tweakpane`（storybook と同じ `4.0.5`）を追加。
  必要なら `@tweakpane/core` も。`pnpm install`。

### B2. ページ作成 `works/figma-effects.html`

- 単体 HTML + `<script type="module">`。`VFX` + 7エフェクトを import。
- レイアウト: 中央に `<img>`（VFX 適用先）、右に Tweakpane。
- **入力画像選択**: 既存アセット（`pixelsort/*.webp` 等の既存画像を流用 or 数枚同梱）を
  ドロップダウンで切替 + ローカルファイル選択（`<input type=file>` → ObjectURL）。
  画像切替時は `vfx.remove` → `img.src` 差し替え → `onload` 後 `vfx.add`（halftone story の作法に倣う）。
- **エフェクト選択**: Tweakpane の list で7種から1つ選ぶ。選択で該当 Effect を作り直して付け替え。
- **param 編集**: 選択中エフェクトの `params` を `pane.addBinding` で全部出す。
  enum は `options`、色は `view:'color'`、数値は `min/max/step`。
  Figma の値域に合わせる（Threshold 0–100、Dispersion 0–100% 等）。
- 切替/再生成は storybook `utils.ts` のパターン（pane を作り直し、古い pane を dispose）を踏襲。

### B3. works.ts 登録

- `works` 配列に追加:
  ```
  { id: "figma-effects", index: "15", title: "Figma Effects",
    tags: ["effect-api", "Playground"], year: "2026", author: "AMAGI",
    description: "...", url: "./works/figma-effects.html" }
  ```
- vite glob が自動でエントリ化（設定変更不要）。

### B4. 動作確認

- `pnpm --filter @vfx-js/examples run dev`（`direnv exec .` 経由）で各エフェクト・画像切替・param を目視。

---

## マイルストン

1. 共通ヘルパ + **Slice shift** 実装 + story + examples 雛形（画像選択 + 1エフェクトの pane）。
2. Pixel stretch / Warp / Dither 追加。
3. Pixelate / Pattern refraction 追加。
4. 7エフェクトを examples の pane に出し切る。lint/test/build 通す。

## 未確定

- Pixelate の Dissolve mode 全項目（`Dropout` のみ確認）。当面 `Dropout` で実装。
- 平均色/blue noise の実装重さ次第で近似に倒す（zero-dep 維持を優先）。
