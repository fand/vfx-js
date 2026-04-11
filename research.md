# html-in-canvas: サイズ計算の問題点

`packages/vfx-js/src/html-in-canvas.ts` の `wrapElement` / `captureElement` と
`packages/vfx-js/src/vfx-player.ts` の hic 経路を読み込んで検証した結果。

現状のストーリー (`HtmlInCanvas.stories.ts`) は全部 `<div>` (デフォルト幅100%
のブロック) だから問題が顕在化していないだけで、実利用では複数の経路で破綻する。

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

## 問題2: テクスチャと描画領域のサイズ不一致 (問題1の派生)

- `captureElement` のピクセルバッファ → **child** の `getBoundingClientRect`
- `vfx-player` のWebGL配置とシェーダー `resolution` uniform → **wrapper canvas**
  の rect (`vfx-player.ts:805` の `glRectWithOverflow`)

ブロック子要素が canvas いっぱいに広がる場合は両者が一致するので問題ない。
しかし問題1で canvas が child より広くなると:

```
canvas wrapper:  ████████████████████  800px (width:100%)
inner child:     ██████                200px (width:200px)
texture:         200×h (child rect 由来)
shader area:     800×h (wrapper rect 由来)
→ テクスチャが800pxに引き伸ばされて表示される
```

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

## 推奨修正 (優先度順)

1. **`width: 100%` をやめる** — `getBoundingClientRect()` の幅をそのまま
   `${rect.width}px` で固定するか、`width` / `min-width` / `max-width` を
   `LAYOUT_FLOW_STYLES` に追加して computed style からコピー
2. **ResizeObserver で `borderBoxSize` を使う** — 初期測定と一致させる
3. **wrapElement の RO 内でテクスチャ再キャプチャをトリガー** —
   `vfx.update()` 相当を呼ぶ仕組み (コールバック注入か EventTarget)
4. **DPR 変化リスナー追加** — `matchMedia` ベース
5. **`box-sizing` 強制を削除** — `LAYOUT_FLOW_STYLES` に追加して元要素から継承

とくに `<VFXCanvas>` ではなく `vfx.addHTML()` を直接使うケースで(4)が顕在化する。
