# Plan: html-in-canvas サイズ計算バグ修正 (v2)

## Context

`wrapElement` が canvas にサイズを設定する方法に根本的な問題がある。

- v1 の Phase 1 は `${rect.width}px` 固定値で解決 → 正確だが responsive を失う
- v1 の Phase 2 は parent RO で親幅を流す → block-auto は動くが固定幅要素を破壊
- heuristic で分類 → edge case が多く、振る舞いが説明しにくい

### 新方針: CSS identity (class + style 属性) を canvas にコピー

WICG html-in-canvas の公式パターンは「canvas が CSS レイアウト上のコンテナ」。
これに倣い、**元要素の class と style 属性を canvas にコピー**して、
ブラウザの CSS カスケードにそのままサイズ解決を委ねる。

`getComputedStyle` の resolved value は使わない (auto と explicit px が区別不能なため)。
CSS class 由来の `width: 300px` / `width: 50%` / `max-width` などが
そのまま canvas に適用されるので、responsive も fixed も正しく動く。

追加で WICG 推奨の:
- **RO on canvas (`device-pixel-content-box`)** で pixel buffer 同期
- **`canvas.onpaint`** で texture 再キャプチャ (利用可能な場合)

を採用し、child RO / parent RO / onReflow コールバックを廃止してシンプル化。

---

## 既に完了したコミット (維持)

| コミット | 内容 | 状態 |
|---|---|---|
| `04db6e5` | Phase 1: width 固定px化 + box-sizing 削除 | ✅ Phase 2 リライトで上書き |
| `d438f9e` | 問題3: borderBoxSize 化 | ✅ RO 構成変更で上書き |
| `8a8419a` | 問題8: opacity/clearRect 修正 | ✅ 維持 |
| `a427e7d` | Phase 2 (parent RO + onReflow) | ❌ リライト対象 |

---

## Phase 2 リライト: class/style コピー + RO on canvas

### wrapElement の新しいフロー

```ts
export async function wrapElement(
    element: HTMLElement,
    onReflow?: (canvas: HTMLCanvasElement) => void,
): Promise<HTMLCanvasElement> {
    const rect = element.getBoundingClientRect();

    const canvas = document.createElement("canvas");
    canvas.setAttribute("layoutsubtree", "");

    // --- 1. CSS identity をコピー ---
    // class → CSS ルールが canvas に適用される (width, max-width, % 等)
    canvas.className = element.className;

    // style 属性 → inline の width, height 等がそのまま canvas に乗る
    const styleAttr = element.getAttribute("style");
    if (styleAttr) {
        canvas.setAttribute("style", styleAttr);
    }

    // --- 2. canvas 固有の上書き ---
    // display: 元要素の computed display をコピー (div=block, span=inline 等の
    // 要素型デフォルトは class に含まれないため)
    const cs = getComputedStyle(element);
    const display = cs.display === "inline" ? "block" : cs.display;
    canvas.style.setProperty("display", display);

    // margin: 要素型デフォルト (e.g. <p> の margin-block) を拾うため computed をコピー
    for (const prop of MARGIN_PROPS) {
        canvas.style.setProperty(prop, cs.getPropertyValue(prop));
    }

    // position/float/flex/grid: レイアウト配置を正確に再現
    for (const prop of POSITION_FLOW_STYLES) {
        canvas.style.setProperty(prop, cs.getPropertyValue(prop));
    }

    // padding/border を canvas から除去 (canvas content-box = 元要素 border-box にする)
    canvas.style.setProperty("padding", "0");
    canvas.style.setProperty("border", "none");
    canvas.style.setProperty("box-sizing", "content-box");

    // --- 3. padding/border 補正 ---
    // class 由来の width は content-box 基準 (デフォルト)。canvas は padding/border=0
    // なので content-box = width 値そのまま。元要素に padding/border があると
    // 要素 border-box > canvas content-box でオーバーフローする。
    //
    // 補正: 元要素の padding+border 分を canvas width に加算。
    // ただし class 由来の width 表現 (%, auto 等) に px を加算する手段がないため、
    // padding/border がある場合は rect.width (border-box) を inline width として設定。
    // → この場合 responsive は失うが、サイズは正確。
    const paddingH = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const paddingV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const borderH = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    const borderV = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    if (paddingH + borderH > 0) {
        canvas.style.setProperty("width", `${rect.width}px`);
    }
    if (paddingV + borderV > 0) {
        canvas.style.setProperty("height", `${rect.height}px`);
    }

    // --- 4. pixel buffer 初期値 ---
    const dpr = window.devicePixelRatio;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    // --- 5. DOM 操作 ---
    savedMargins.set(element, element.style.margin);
    element.parentNode?.insertBefore(canvas, element);
    canvas.appendChild(element);
    element.style.setProperty("margin", "0");

    // --- 6. cross-origin images ---
    const restore = await inlineCrossOriginImages(element);
    imageRestorers.set(canvas, restore);

    // --- 7. RO on canvas (device-pixel-content-box) ---
    // WICG 公式パターン: canvas 自体を観察して pixel buffer を同期。
    // child RO / parent RO を置き換える。
    const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const dpSize = entry.devicePixelContentBoxSize?.[0];
            if (dpSize) {
                canvas.width = dpSize.inlineSize;
                canvas.height = dpSize.blockSize;
            } else {
                // fallback: borderBoxSize × dpr
                const box = entry.borderBoxSize?.[0];
                if (box) {
                    canvas.width = Math.round(box.inlineSize * dpr);
                    canvas.height = Math.round(box.blockSize * dpr);
                }
            }
        }
        onReflow?.(canvas);
    });
    ro.observe(canvas, { box: "device-pixel-content-box" });
    resizeObservers.set(canvas, ro);

    // --- 8. onpaint (利用可能なら) ---
    // canvas.onpaint は子の描画内容が変わると発火。RO では検知できない
    // テキスト変更・フォントロード等もカバーする。
    if ("onpaint" in canvas) {
        canvas.onpaint = () => onReflow?.(canvas);
    }

    return canvas;
}
```

### LAYOUT_FLOW_STYLES の分割

現在の `LAYOUT_FLOW_STYLES` を 2 グループに分割:

```ts
// margin: 要素型デフォルトのために computed → inline コピー
const MARGIN_PROPS = [
    "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
];

// 配置系: computed → inline コピー
const POSITION_FLOW_STYLES = [
    "position", "top", "right", "bottom", "left",
    "float",
    "flex", "flex-grow", "flex-shrink", "flex-basis",
    "align-self", "justify-self", "place-self", "order",
    "grid-column", "grid-column-start", "grid-column-end",
    "grid-row", "grid-row-start", "grid-row-end", "grid-area",
];

// display は個別処理 (inline → block 変換あり)
// width, height, max-*, min-*, padding, border, box-sizing は
// class + style 属性コピーで CSS カスケードに委ねる → computed 不要
```

### unwrapElement の変更

- `parentResizeObservers` WeakMap → 削除 (parent RO 廃止)
- canvas から class / style を除去する必要はない (canvas ごと remove するため)
- element の margin 復元は維持
- element の class は変更していないので復元不要

### captureElement の変更

- pixel buffer 設定 (`canvas.width = ...`) を削除 — RO が担当
- `waitForPaint` は維持 (onpaint がない環境用)
- opacity 最小化 (問題8 修正) は維持

```ts
export async function captureElement(
    canvas: HTMLCanvasElement,
    targetChild: Element,
    oldOffscreen?: OffscreenCanvas,
    maxSize?: number,
): Promise<OffscreenCanvas> {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2d context");

    await waitForPaint(canvas);

    const prevOpacity = canvas.style.opacity;
    canvas.style.setProperty("opacity", "1");

    // pixel buffer は RO が管理。ここでは canvas.width/height をそのまま使う。
    // clearRect は不要 (drawElementImage が上書き)
    ctx.drawElementImage(targetChild, 0, 0);

    canvas.style.setProperty("opacity", prevOpacity);

    // Clamp + OffscreenCanvas 転写 (既存ロジック維持)
    ...
}
```

---

## 解消される問題

| 問題 | 解消方法 |
|---|---|
| 問題1 (width override) | class/style コピー → 元の CSS がそのまま適用 |
| 問題2 (density 不整合) | RO `device-pixel-content-box` で正確な pixel buffer |
| 問題3 (contentRect vs borderBox) | child RO 廃止 → RO on canvas で統一 |
| 問題4 (reflow 時の再キャプチャ) | RO on canvas + onpaint で検知 → onReflow |
| 問題6 (box-sizing 強制) | class コピー → 元の box-sizing が適用 |
| 問題8 (opacity leak) | 維持 (既コミット) |
| Phase 2 regression (固定幅 → 親幅) | parent RO 廃止 → class 由来の width が維持 |

---

## 既知の制約

1. **要素型セレクタ** (`div.foo { width: 300px }`): canvas は `<div>` ではないのでマッチしない。`.foo` だけなら OK。wrapper を使う以上避けられない制約。
2. **padding/border 付き要素の responsive**: canvas の padding/border を 0 にした上で rect.width を inline 設定するため responsive を失う。padding/border なしの要素は class 由来の width がそのまま使われ responsive。
3. **構造セレクタ** (`:nth-child`, `parent > div`): DOM 構造が変わるため一部マッチしなくなる。
4. **onpaint の可用性**: chrome://flags/#canvas-draw-element で有効化が必要。未対応環境では RO のみで検知 (テキスト変更は検知不可、vfx.update() で対応)。

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `packages/vfx-js/src/html-in-canvas.ts` | wrapElement リライト (class/style コピー, RO on canvas, onpaint), unwrapElement 簡素化, captureElement から pixel buffer 設定を削除 |
| `packages/vfx-js/src/vfx.ts` | 変更なし (onReflow コールバックの仕組みは維持) |

---

## 実装順序

1. `LAYOUT_FLOW_STYLES` を `MARGIN_PROPS` + `POSITION_FLOW_STYLES` に分割
2. wrapElement リライト: class/style コピー + padding/border 補正 + RO on canvas + onpaint
3. unwrapElement 簡素化: parentResizeObservers 削除
4. captureElement: pixel buffer 設定を削除 (RO に委譲)
5. lint + build + test
6. Storybook 目視確認:
   - `BugFixedWidth`: 300px 維持 ✅
   - `BugChildWithPadding`: 元要素と同じ高さ ✅
   - `BugContentReflow`: テキスト変更で自動更新 (onpaint 対応環境)
   - `AddHTML`: ウィンドウリサイズで追従 ✅
7. 各段階でコミット

## 残る低優先度問題 (このPRでは対応しない)

- 問題5 (DPR 変化): `matchMedia` 対応は別PR
- 問題7 (flex/grid wrap タイミング): 別PR
- 問題9 (maxSize クランプのバイリニア縮小): 別PR
