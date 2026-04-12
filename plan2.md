# Plan 2: html-in-canvas — class/style copy + canvas RO

## Background

plan.md の方針 (class/style copy + RO on canvas) を実装する中で判明した問題と対処。

### 判明した事実

1. **Storybook の stories は `addHTML` を DOM 挿入前に呼ぶ** — `getBoundingClientRect()` = 0x0、`getComputedStyle()` = 全プロパティ空文字
2. **`layoutsubtree` canvas は height auto-fit** — child content に合わせて高さが自動決定。child RO 不要
3. **CSS width 未指定の canvas は intrinsic size (= `canvas.width` 属性) を使う** — canvas RO が `canvas.width` を設定すると feedback loop で無限膨張
4. **WICG 公式パターンは explicit CSS width/height を前提** — RO は pixel buffer のみ

### 現在の実装 (作業中コード) の状態

`packages/vfx-js/src/html-in-canvas.ts` に以下を実装済み:

- class + style 属性コピー
- `element.isConnected` 分岐 (connected → computed style / detached → inline style)
- padding/border compensation (connected → rect, detached → inline 計算)
- `width: 100%` fallback (explicit CSS width がない場合の feedback loop 防止)
- canvas RO (`device-pixel-content-box`) で pixel buffer sync + onReflow
- onpaint hook
- captureElement: pixel buffer 0 時の fallback 測定

## 残タスク

### 1. Storybook 目視確認

| Story | 確認項目 | 期待結果 |
|---|---|---|
| `AddHTML` | シェーダー表示、リサイズ追従 | 親幅に追従、content reflow で高さ変化 |
| `BugFixedWidth` | 300px 維持 | canvas = 300px |
| `BugChildWithPadding` | canvas = child border-box | canvas = 470x105 (= 400 + padding 60 + border 10) |
| `BugContentReflow` | テキスト変更でサイズ変化 | canvas 幅は maxWidth: 600px 内で追従 |
| `AddHTMLWithImage` | 画像表示 | cross-origin 画像が正しく描画 |

### 2. 問題があれば修正

- `width: 100%` の margin ズレ (margin-left/right がある auto-width 要素)
- element-type selector mismatch (`div.foo` は canvas にマッチしない — 既知制約)

### 3. lint + build + test

```
npm --workspace=@vfx-js/core run lint
npm --workspace=@vfx-js/core run build
npm test
```

### 4. コミット

作業中コミット `128fff8` を squash or 新コミットで上書き。

---

## Architecture Summary

```
wrapElement(element)
│
├── 1. Copy CSS identity
│   ├── canvas.className = element.className
│   └── canvas.setAttribute("style", element style attr)
│
├── 2. Literal overrides (safe for detached)
│   ├── display: block
│   ├── padding: 0
│   ├── border: none
│   └── box-sizing: content-box
│
├── 3. Computed overrides (only if element.isConnected)
│   ├── display: inline → block conversion
│   ├── margin (element-type defaults like <p>)
│   └── position/float/flex/grid (placement)
│
├── 4. Padding/border compensation
│   ├── Connected: rect.width (border-box)
│   ├── Detached: inline width + inline padding + inline border
│   └── Fallback: width: 100% (no explicit width → prevent RO feedback)
│
├── 5. Pixel buffer (rect × dpr, may be 0)
├── 6. DOM swap (insertBefore + appendChild)
├── 7. Cross-origin images
├── 8. Canvas RO (device-pixel-content-box) → pixel buffer + onReflow
└── 9. onpaint → onReflow (if available)
```

### Why no child RO

`layoutsubtree` canvas auto-fits height to child content (confirmed experimentally).
Width は CSS cascade が決定 (class/inline copy or 100% fallback)。
Canvas RO が pixel buffer を sync し、onReflow を発火。

### Why `width: 100%` fallback

Canvas は replaced element。CSS width 未指定だと intrinsic size (`canvas.width` 属性) を使う。
Canvas RO が `canvas.width` を設定 → intrinsic size 変更 → CSS width 変更 → RO 再発火 → 無限膨張。
`width: 100%` は explicit CSS width なので intrinsic size は無関係。

### 既知の制約

1. **要素型セレクタ** (`div.foo`): canvas は `<div>` ではないのでマッチしない
2. **padding/border 付き要素の responsive**: 固定 px でサイズ設定するため responsive を失う
3. **構造セレクタ** (`:nth-child`): DOM 構造変化でマッチしなくなる場合あり
4. **`width: 100%` fallback と margin**: margin-left/right がある auto-width 要素で微小なオーバーフロー
5. **detached element + class-derived padding**: computed style が取れないため compensation 不可
