# html-in-canvas: サイズ計算の問題点

`packages/vfx-js/src/html-in-canvas.ts` の `wrapElement` / `captureElement` と
`packages/vfx-js/src/vfx-player.ts` の hic 経路を読み込み、さらに実ブラウザ
(Chromium + `chrome://flags/#canvas-draw-element`) で DOM/ピクセルバッファを
直接検査して検証した結果。

既存ストーリー (`AddHTML`, `AddHTMLWithImage`) は全部 `<div>` (デフォルト幅
100% のブロック) だから問題が表面化しない。`HtmlInCanvas.stories.ts` に
`BugFixedWidth` / `BugChildWithPadding` / `BugContentReflow` を追加してある
ので、それぞれ該当問題を視覚的に再現できる。

---

## 問題1: `width: 100%` 強制による幅の上書き ⚠️ 最重要

`wrapElement` 内:

```js
canvas.style.setProperty("width", "100%");
```

`LAYOUT_FLOW_STYLES` には `width` / `min-width` / `max-width` が**含まれていない**。
元要素の幅が無条件に親の100%になる。

**壊れるケース:**
- `width: 200px` の固定幅要素 → ラッパーキャンバスが親いっぱいに広がる
- `display: inline-block` → 内在幅で配置されるべきものが100%扱い
  (display は inline-block のままなので 100% 自体は無視されるが、結果はバラバラ)
- `max-width: 600px` の制約付き要素 → 制約が消失
- `width: max-content` / `fit-content` → 全幅化

---

## 問題2: `drawElementImage` の density と wrapper canvas の不一致 (問題1の派生)

問題1 で canvas の CSS width が child より広くなると、以下の連鎖が起こる:

- `captureElement` はピクセルバッファを `childRect × dpr` で設定 (例: 600×160)
- その後 `ctx.drawElementImage(child, 0, 0)` を呼ぶ
- **重要な発見**: `drawElementImage` は `devicePixelRatio` ではなく
  **canvas 自身の pixel density (buffer / CSS size)** で子要素をラスタライズする

### 実測値 (BugFixedWidth: child 300×80 CSS, canvas CSS 800×80, buffer 600×160)

- canvas pixel density: `600/800 = 0.75` (水平), `160/80 = 2.0` (垂直)
- child は `300 × 0.75 = 225px`, `80 × 2.0 = 160px` でラスタライズされる
- texture の non-transparent bbox: **225 × 160** (buffer 600×160 の左上に収まる)
- 右 375px 分は透明パディング

```
pixel buffer (600×160):
┌─────────────────────────────────┐
│ child       │                   │
│ (225×160)   │   transparent     │
│             │                   │
└─────────────────────────────────┘
 ← 225 →     ← 375 (空) →
```

### 視覚的に見える/見えない条件

シェーダーが texture の alpha を見るかで結果が変わる:

- **alpha 依存シェーダー** (`rainbow`, `uvGradient`, etc.) — 透明部分は出力も透明
  になるので、画面上は「300px 幅のコンテンツが正しい位置に表示される」ように
  見える。**偶然視覚的にキャンセルしてバグが隠れる**
- **alpha 非依存シェーダー** (custom で `outColor = vec4(col, 1.)` 等) — 透明
  パディング部分もシェーダー出力が描画されるので、**800px 幅の描画領域が
  ハッキリ可視化される**

### それでも実在する副作用

視覚的にキャンセルしても、実害は残る:

1. **DOM レイアウト破壊** — wrapper canvas は実際に 800×80 を占める。兄弟要素
   の配置・scrollHeight・親の height などすべて影響を受ける
2. **テクスチャ品質低下** — child は 0.75x 密度でラスタライズされる (300 CSS
   pixel に対し 225 texture pixel)。dpr=2 なら本来 600 pixel あるべきところ。
   **約 2.67× の解像度損失**。拡大するとボケる
3. **ヒットテスト/マウスイベント** — wrapper canvas の 800×80 全域がイベント
   ターゲットになる。視覚上 300px の箇所しか見えていないのにその外側でも
   反応する (`pointer-events: none` が無ければ)

---

## 問題3: `ResizeObserver` の `contentRect` vs 初期測定の border-box

```js
// 初期 (wrapElement)
const rect = element.getBoundingClientRect();        // ← border-box
canvas.style.setProperty("height", `${rect.height}px`);

// リサイズ時
const ro = new ResizeObserver((entries) => {
    const { height } = entry.contentRect;            // ← content-box (padding/border 抜き)
    canvas.style.setProperty("height", `${height}px`);
});
```

子要素に `padding` や `border` がある場合、初回 RO 発火で canvas が
`padding+border` 分縮む。texture (childRect 由来 = border-box) > canvas CSS height
となり、はみ出す。

修正: `entry.borderBoxSize[0].blockSize` を使うべき。

---

## 問題4: コンテンツ reflow 時の自動再キャプチャがない

`wrapElement` 内の RO は CSS height を更新するだけで `vfx.update()` を呼ばない。
`vfx-player` の hic 再キャプチャは `window.resize` でしか発火しない。

→ テキスト書き換え・フォント遅延読込・画像読込完了などで child のサイズが
変わると、CSS の枠だけ広がってテクスチャは古いまま。ユーザーが手動で
`vfx.update(el)` を呼ぶ必要がある。

`react-vfx/canvas.tsx` 側は `MutationObserver` + `ResizeObserver` で
`vfx.update()` を呼んでいるので `<VFXCanvas>` 経由なら問題ない。
**`vfx.addHTML()` 直接利用が要注意**。

---

## 問題5: DPR 変化 (HiDPI ↔ 通常ディスプレイ間移動)

`devicePixelRatio` 変化は `window.resize` を必ずしも発火しない。ピクセルバッファが
古い DPR のまま残ってボケる/シャープすぎる。

修正: `matchMedia('(resolution: 1dppx)')` をリッスンするか、各 capture で常に
DPR を再評価。

---

## 問題6: `box-sizing: border-box` 強制

```js
canvas.style.setProperty("box-sizing", "border-box");
```

元要素が `content-box` でも上書き。canvas 自体は padding/border を持たない
(`LAYOUT_FLOW_STYLES` に含まれない) のでCSS的には実害ないが、後で誰かが
CSSルールで padding を当てた瞬間に挙動が変わる罠。

---

## 問題7: flex/grid item としての wrap タイミング

`wrapElement` は **wrap前** の `getBoundingClientRect()` でピクセルバッファを
決める。flex container の中で `flex: 1 1 200px` の要素を wrap → canvas が flex
item になり再レイアウト → 実サイズが pre-wrap と異なる可能性。

captureElement で再測定するから初回 add では救われるが、`addElement` 内
`getBoundingClientRect` (`vfx-player.ts:295`) の値とズレる。

---

---

## コード精査で判明した追加事項

### git history から読み取れる背景

- commit `1e39f1d` (`fix: remove DPR scaling from drawElementImage`)
  - 当時 `wrapElement` は `canvas.style.width = "${rect.width}px"` (固定px) だった
  - → canvas CSS = child rect, buffer = rect × dpr
  - → **density = dpr (ピッタリ)**
  - この前提で `ctx.scale(dpr, dpr)` を外すのは正しかった
- commit `261258c` (`fix: make canvas wrapper responsive to window resize`)
  - `canvas.style.width = "100%"` に変更 (レスポンシブ化のため)
  - しかし `captureElement` 側の `canvas.width = childRect.width * dpr` は
    そのまま残った
  - → density ≠ dpr になり、`1e39f1d` の前提が **silently 崩壊**

commit メッセージの「drawElementImage renders display list at device pixel
resolution」という仮説は厳密には誤り。正しくは「**canvas 自身の pixel
density (buffer / CSS size) でレンダリング**」。同じ密度を dpr に保っている
限り結果は同じに見えるので、当時のテストはすり抜けた。

### 問題8: `waitForPaint` 中の空 buffer / opacity:1 リーク

```ts
// captureElement 226-242
const prevOpacity = canvas.style.opacity;
canvas.style.setProperty("opacity", "1");                // ← opacity 1

const childRect = ...;
canvas.width = Math.round(childRect.width * dpr);        // ← buffer リセット (中身も transform もクリア)
canvas.height = Math.round(childRect.height * dpr);

await waitForPaint(canvas);                              // ← 2 フレーム待つ

ctx.clearRect(0, 0, canvas.width, canvas.height);        // ← 既に空なので無駄
ctx.drawElementImage(targetChild, 0, 0);

canvas.style.setProperty("opacity", prevOpacity);        // ← opacity 復帰
```

`waitForPaint` の 2 フレーム間、wrapper canvas は **opacity: 1** かつ
**pixel buffer が空** (`canvas.width = N` 自体で中身と transform がクリア
されるため)。`layoutsubtree` で子は paint されないので視覚的には多くの場合
透明に見えるが、前フレームの WebGL 描画が残っていたり、親に背景があったり
すると **一瞬の空白表示**が起こりうる。

また 237 行目の `clearRect` は `canvas.width` 設定で既にクリア済みなので
冗長。

修正案: `drawElementImage` の直前に `opacity:1` を設定し、直後に戻す。
buffer サイズ変更もそのタイミングに寄せる (paint 待機が終わった後)。

### 問題9: `maxSize` クランプ時のバイリニア劣化 (低優先)

```ts
// captureElement 247-270
if (maxSize && (w > maxSize || h > maxSize)) {
    const scale = Math.min(maxSize / w, maxSize / h);
    w = Math.floor(w * scale);
    h = Math.floor(h * scale);
}
// ...
offCtx.drawImage(canvas, 0, 0, w, h);
```

`drawImage` の 4引数形式は WebGL のテクスチャではなく 2D canvas の縮小を
**バイリニア**で行う。巨大要素 (`maxTextureSize` 超過) の場合、高品質な
縮小が必要なら `createImageBitmap` + `resizeQuality: "high"` の検討余地。

通常サイズでは発火しないので優先度は低い。

---

## width:100% 起因バグの修正可能性

`width: 100%` を外す修正で解消する問題:

| 問題 | 解消するか | 理由 |
|---|---|---|
| 問題1 (width override) | ✅ 解消 | 直接の原因を除去 |
| 問題2 (density 不整合) | ✅ 解消 | canvas CSS = rect になり density = dpr に戻る |
| バグA (captureElement buffer) | ✅ 解消 | 同上 |
| バグB (wrapElement 初期 buffer) | ✅ 解消 | 同上 |
| DOM レイアウト破壊 | ✅ 解消 | wrapper canvas が元要素と同じサイズに収まる |
| ヒットテスト/pointer events | ✅ 解消 | 同上 |
| テクスチャ品質低下 | ✅ 解消 | density = dpr でフル解像度レンダリング |

**ただし副作用として失うもの**: **responsive 動作** (`261258c` が解決しようと
していた課題)。親幅が変わってもラッパーキャンバスは初期測定値に固定される。

responsive を保ちつつ density バグも直すには、**parent 側の ResizeObserver で
canvas CSS 幅を追従させる**追加機構が必要。

### 推奨する修正戦略

1. **短期**: `width: 100%` を `${rect.width}px` (または computed style の
   `width` 値コピー) に戻す。density バグ・レイアウト破壊・ヒットテスト・
   品質低下がまとめて解消する。responsive は一旦諦める
2. **中期**: canvas の parent を `ResizeObserver` で監視し、parent の
   contentRect に応じて canvas CSS 幅と buffer を同期更新するロジックを
   追加。これで responsive も復活
3. **並行**: 問題3 (borderBoxSize)・問題4 (reflow 再キャプチャ)・問題8
   (opacity flash) は独立して修正可能

問題5 (DPR 変化)・問題6 (box-sizing)・問題7 (flex wrap タイミング)・
問題9 (maxSize 縮小品質) は低優先度。

---

## 推奨修正 (優先度順)

1. **`width: 100%` をやめる** — 最重要。`getBoundingClientRect()` の幅を
   そのまま `${rect.width}px` で固定するか、`width` / `min-width` / `max-width`
   を `LAYOUT_FLOW_STYLES` に追加して computed style からコピー。
   これで問題1・2 (layout 破壊、drawElementImage density 低下、ヒットテスト
   ズレ) が一度に解消する
2. **ResizeObserver で `borderBoxSize` を使う** — 初期測定と一致させる (問題3)
3. **wrapElement の RO 内でテクスチャ再キャプチャをトリガー** —
   `vfx.update()` 相当を呼ぶ仕組み (コールバック注入か EventTarget)。問題4
4. **DPR 変化リスナー追加** — `matchMedia('(resolution: 1dppx)')` ベース。問題5
5. **`box-sizing` 強制を削除** — `LAYOUT_FLOW_STYLES` に追加して元要素から継承。問題6

とくに `<VFXCanvas>` ではなく `vfx.addHTML()` を直接使うケースで (3) が顕在化する。

## ブラウザ検証メモ

`drawElementImage` の仕様で重要なのは、child を `devicePixelRatio` ではなく
**canvas 自身の pixel density** (pixel buffer / CSS size) でラスタライズする点。
これを知らずに `canvas.width = childRect.width * dpr` と設定すると、canvas の
CSS width が child より広い場合に density が dpr 未満になり、解像度が落ちる。

修正案としては、pixel buffer の設定前に canvas CSS 幅を child 幅に一致
させる (= width:100% を廃止) のが根本対処。それができない限り、buffer と
CSS の比率を dpr に合わせる別のアプローチが必要になる。
