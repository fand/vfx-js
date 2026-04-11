# Plan: html-in-canvas サイズ計算バグ修正

## Context

`research.md` にまとめた問題の根本原因は `wrapElement` が `canvas.style.width = "100%"` を強制していること。これにより:

- canvas CSS width ≠ child width → `drawElementImage` の density (`buffer / CSS`) が dpr とズレる → テクスチャが低解像度でラスタライズ (例: 300 CSS px → 225 buffer px = dpr 2 の 37.5%)
- canvas が DOM レイアウト上 `100%` 幅を占める → 兄弟要素配置・scrollHeight・ヒットテストすべて狂う
- alpha 依存シェーダーでは視覚的にキャンセルして見えなくなるので気付きにくい
- commit `1e39f1d` が `ctx.scale(dpr, dpr)` を外した当時は `canvas.style.width = "${rect.width}px"` (固定) だったため density = dpr が成立していた。`261258c` で `width: 100%` に変更した時点で前提が silently 崩壊

このPRで2段階に分けて修正する:

1. **Phase 1**: `width: 100%` を外す (固定px化)。density・レイアウト・ヒットテスト・解像度が一気に解消。ただし responsive 動作を失う
2. **Phase 2**: canvas の親要素を `ResizeObserver` で監視し、親幅の変化に応じて canvas CSS 幅と pixel buffer を追従更新。responsive を取り戻す

---

## Phase 1: `width: 100%` を外す

### 変更内容

`packages/vfx-js/src/html-in-canvas.ts` の `wrapElement`:

```ts
// Before
canvas.style.setProperty("width", "100%");
canvas.style.setProperty("height", `${rect.height}px`);
canvas.style.setProperty("box-sizing", "border-box");

// After
canvas.style.setProperty("width", `${rect.width}px`);
canvas.style.setProperty("height", `${rect.height}px`);
// box-sizing 強制も不要 (問題6) なので削除
```

### この変更で解消する問題

| 問題 | 解消理由 |
|---|---|
| 問題1 (width override) | 直接の原因を除去 |
| 問題2 (density 不整合) | canvas CSS = rect × dpr → density = dpr |
| バグA (captureElement buffer) | 同上 |
| バグB (wrapElement 初期 buffer) | 同上 |
| 問題6 (box-sizing 強制) | 強制設定を削除 |
| DOM レイアウト破壊 | canvas が元要素と同じサイズに収まる |
| ヒットテスト/pointer events ズレ | 同上 |
| テクスチャ品質低下 | density = dpr でフル解像度 |

### 検証

- `HtmlInCanvas.stories.ts` の `BugFixedWidth` を目視:
  - REFERENCE 300×80 と WITH addHTML が**同じ幅 (300px)** で並ぶ
  - custom gradient シェーダーが 300px の枠内で完結する (800px に広がらない)
- DevTools Console で再度 diagnostic 実行:
  - `canvas.cssWidth === "300px"`
  - `canvas.rectW === 300`
  - `canvas.bufferW === 600` (300 × dpr 2)
  - `nonTransparentBbox === { w: 600, h: 160 }` (child がピクセルバッファを完全に埋める)

---

## Phase 2: Parent `ResizeObserver` で responsive 化

### 設計

`wrapElement` 時に canvas の親要素を特定し、その `contentRect` を観測する。親幅が変化したら:

1. canvas CSS width を親の新しい contentRect width に同期 (block 要素の width:auto 相当の挙動)
2. pixel buffer を再計算 (`canvas.width = newWidth * dpr`)
3. `captureElement` 相当を再実行してテクスチャ更新

これで block-auto 要素 (= `vfx.addHTML()` の典型利用ケース) の responsive が復活する。

### 実装詳細

#### `wrapElement` の追加ロジック

```ts
// After moving element inside canvas:
const parent = canvas.parentElement;
if (parent) {
    const parentRO = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const newW = entry.contentRect.width;
            canvas.style.setProperty("width", `${newW}px`);
            // pixel buffer と再キャプチャは captureElement 経由で行う
            // → 外部から再キャプチャをトリガーする仕組みが必要
        }
    });
    parentRO.observe(parent);
    parentResizeObservers.set(canvas, parentRO);
}
```

#### 再キャプチャのトリガー

現状 `wrapElement` は capture を直接呼ばない (vfx-player が addElement 時に呼ぶ)。Phase 2 では `wrapElement` が「再キャプチャが必要」というイベントを発火する必要がある。

**実装方針**: `wrapElement` のシグネチャを変えて、capture 再実行コールバックを受け取る。

```ts
// 新シグネチャ
export async function wrapElement(
    element: HTMLElement,
    onReflow?: () => void,  // ← 新規
): Promise<HTMLCanvasElement>;
```

呼び出し側 (`vfx.ts` の `addHTML`):

```ts
wrapper = await wrapElement(element, () => {
    this.#player.updateHICElement(wrapper);
});
```

親 ResizeObserver と既存の子 ResizeObserver (問題4 の reflow 検知) の両方でこのコールバックを呼ぶ → 問題4 (`wrapElement` の RO が texture 再キャプチャしない) も同時に解決する。

#### Child ResizeObserver (height 追従) との関係

現在の child ResizeObserver は `contentRect.height` で canvas height を更新している (問題3)。Phase 2 と同時に以下も修正:

- `contentRect` → `borderBoxSize[0].blockSize` に変更 (問題3)
- 発火時に `onReflow()` も呼ぶ (問題4)

### 限界 / 既知の非対応ケース

- **固定幅要素 (`width: 300px`)**: 親幅変化に対して追従すべきではないが、Phase 2 の実装では親に追従してしまう
  - 対処: 元要素の computed `width` が `auto` か px か判定して分岐... が、`getComputedStyle` は `auto` を px に解決して返すので直接は判定不可
  - 代替案: 元要素の inline style `element.style.width` を見る (`""` or `"auto"` なら responsive)。ただし CSS class 由来の width は捕捉できない
  - 判断: 典型的な `vfx.addHTML()` ユースケース (`<div>` に shader を掛ける) では block-auto が大半なので、まず全ケースで responsive にする。固定幅要素は既知の制約として後続 PR に委ねる
- **Flex/Grid アイテム**: flex/grid の伸縮挙動は親幅追従とは異なる。親 RO では追従しきれない可能性あり (問題7)。これも後続

---

## 独立して修正する問題

Phase 1/2 とは別に以下も同 PR で修正する:

### 問題3 修正: ResizeObserver を `borderBoxSize` 化

```ts
// Before
const { height } = entry.contentRect;

// After
const borderH = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
```

初期測定 (`rect.height` は border-box) と一致させる。

### 問題8 修正: `waitForPaint` 中の空 buffer / opacity leak

```ts
// Before
canvas.style.setProperty("opacity", "1");
canvas.width = Math.round(childRect.width * dpr);
canvas.height = Math.round(childRect.height * dpr);
await waitForPaint(canvas);
ctx.clearRect(...);       // 冗長 (canvas.width 設定で既にクリア)
ctx.drawElementImage(...);
canvas.style.setProperty("opacity", prevOpacity);

// After
await waitForPaint(canvas);
const prevOpacity = canvas.style.opacity;
canvas.style.setProperty("opacity", "1");
canvas.width = Math.round(childRect.width * dpr);  // ← paint 待機後に buffer 設定
canvas.height = Math.round(childRect.height * dpr);
ctx.drawElementImage(targetChild, 0, 0);
canvas.style.setProperty("opacity", prevOpacity);
// clearRect は削除 (canvas.width 設定で十分)
```

opacity が 1 で留まる時間を最小化、冗長な clearRect 削除。

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `packages/vfx-js/src/html-in-canvas.ts` | Phase 1 (width 固定化, box-sizing 削除), Phase 2 (parent RO, onReflow コールバック), 問題3 (borderBoxSize), 問題8 (opacity/clearRect 修正) |
| `packages/vfx-js/src/vfx.ts` | `addHTML()` の wrapElement 呼び出しに onReflow コールバック追加 |
| `packages/storybook/src/HtmlInCanvas.stories.ts` | Bug* ストーリーで修正後の正しい挙動を確認 |
| `research.md` | 修正完了後に該当問題を「解消済み」マークで更新 (または削除) |

## 検証手順

1. `npm run build` で型チェック通過
2. `npm run lint` で lint 通過
3. `npm test` で既存テスト通過
4. Storybook 起動 (`npm --workspace=@vfx-js/storybook run dev`)
5. Chromium + `chrome://flags/#canvas-draw-element` を有効化
6. 各ストーリーで以下を目視確認:
   - `AddHTML` / `AddHTMLWithImage`: 既存挙動が壊れていない
   - `BugFixedWidth`: 300×80 の REFERENCE と WITH addHTML が**同じ大きさ**に見える (バグが解消)
   - `BugChildWithPadding`: 2つのボックスが**同じ高さ**に見える (問題3 解消)
   - `BugContentReflow`: 「Change DOM text」で rainbow 内容が**自動更新**される (問題4 解消、手動 vfx.update() ボタンは不要に)
7. ブラウザウィンドウをリサイズ:
   - `AddHTML` ストーリーで shader 領域が親幅に追従する (Phase 2 機能)
8. DevTools Console で diagnostic script 実行:
   - `canvas.rectW === child.rectW` (canvas と child が同サイズ)
   - `canvas.bufferW === canvas.rectW * dpr` (density = dpr)
   - `nonTransparentBbox.w === canvas.bufferW` (child がバッファ全域を埋める)

## 残る低優先度問題 (このPRでは対応しない)

- 問題5 (DPR 変化): `matchMedia` 対応は別PR
- 問題7 (flex/grid wrap タイミング): 別PR
- 問題9 (maxSize クランプのバイリニア縮小): 別PR

---

## 実装順序

1. Phase 1: `width: 100%` を `${rect.width}px` に変更 (+ box-sizing 削除)
2. ストーリー目視確認 (BugFixedWidth が直っていることを確認)
3. 問題3 修正: `borderBoxSize` 化 → BugChildWithPadding 確認
4. 問題8 修正: opacity/clearRect 修正
5. Phase 2: `onReflow` コールバック導入 → parent RO + 既存 child RO で呼び出す
6. BugContentReflow ストーリー確認 (手動 update 不要になる)
7. ウィンドウリサイズ確認 (responsive 動作)
8. 型チェック・lint・test
9. 各段階でコミット (`fix:` プレフィクス、一問題一コミット)
