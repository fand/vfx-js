# Simplification punch list

不必要な複雑さを抱えている箇所の一覧。1つずつ片付ける。

優先度: ✅ verified（手堅い） → 🔍 needs verify → ❌ refuted（やらない）

---

## ✅ Verified

### 1. `#finalTargetFb` + `#finalTargetHandle` を1フィールドに ✅ 完了

- 場所: `packages/vfx-js/src/effect-chain.ts:125-126`
- 問題: 2フィールドで1概念。`setFinalTarget()` で常に同期。前回リファクタの遺産
- 案: `#finalTargetFb` だけ持って handle は使用時に on-demand で wrap（or 単一の `#finalTargetHandle` のみ持って FB はハンドル経由で参照）
- 注意: `setFinalTarget` の cache invalidation を維持

### 2. `get size()` と `getTargetDimensions()` の重複削除 ✅ 完了

- 場所: `packages/vfx-js/src/post-effect-pass.ts:171, 179`
- 問題: 両者とも `this.#size` を返すだけの完全重複
- 案: `getTargetDimensions()` を削除し呼び出し側を `.size` getter へ移行
- 注意: 外部の呼び出し箇所を全部更新

### 3. `#warnedUpdate` + `#warnedRender` を統合 ✅ 完了

- 場所: `packages/vfx-js/src/effect-chain.ts:127-128`
- 問題: "このエフェクトを警告済みか" を phase ごとに別 Set で管理
- 案: `#warnedEffects: Set<\`${number}:${"update"|"render"}\`>` 1個に統合
- 注意: Set のキー方式が意味的に分かりやすいか（複合キー vs ネスト Map）

### 4. post-effect chain の `mouse` / `mouseViewport` 重複

- 場所: `packages/vfx-js/src/vfx-player.ts:1721-1722`
- 問題: `[mouseX*pr, mouseY*pr]` を両フィールドに渡す。post-effect コンテキストでは canvas == element なので構造的に等しい
- 案: `ChainFrameInput.mouseViewport` を消し、chain 内で `isPostEffect ? mouse : mouseViewport` を扱うか、両者を最初から1フィールドに
- 注意: element chain 側との整合性（element chain は両者異なる値）

### 5. `#postEffectPassTargets` + `#postEffectUniformGeneratorsList` の構造化

- 場所: `packages/vfx-js/src/vfx-player.ts:58-65`
- 問題: インデックスで揃った並行配列。可読性低く同期保証も弱い
- 案: `Array<{ target?: string; generators: ... }>` への統合
- 注意: `#postEffectPasses` との3-way 並行配列にもなっているなら全部まとめるか検討

---

## 🔍 Needs verify

### 6. `#shouldUsePostEffect()` のインライン化

- 場所: `packages/vfx-js/src/vfx-player.ts:1318-1322`
- 問題: 1行ヘルパー。L1207, L1289 でしか呼ばれていなければインライン化候補
- 案: 呼び出し側に直接書く
- 確認: 全使用箇所をリストアップ。3箇所以上ならヘルパー維持

### 7. `isEffectQuad()` の `__brand` フォールバック

- 場所: `packages/vfx-js/src/effect-geometry.ts:23-30`
- 問題: `EFFECT_QUAD_TOKEN` 同一性チェック後の brand 検査が dead branch の可能性
- 案: ユーザー側に EffectQuad 自作経路がなければフォールバックを削除
- 確認: ユーザー API ドキュメント / index.ts export と types.ts の `EffectQuad` 定義を確認

### 8. `isEffectRenderTarget` / `isEffectTexture` の防御チェック

- 場所: `packages/vfx-js/src/effect-host.ts:71-86, 821-828`
- 問題: `toInternalUniform` 1箇所でしか使われない。union 型 narrow 用なら型ガードだけで足りるかも
- 案: type guard を inline / 削除
- 確認: 他の使用箇所がないか、TypeScript の型 narrow が runtime check 不要にできる構造か

### 9. `makeEffectRenderTargetFromFb` の no-op `dispose`

- 場所: `packages/vfx-js/src/effect-host.ts:879-894`
- 問題: chain 所有なので何もしないと明示コメント。resolver shape のために空関数を持つ
- 案: `RenderTargetResolver.dispose` を `dispose?: () => void` にしてオプショナル化
- 確認: 他の resolver 実装が必ず dispose を持つかどうか、optional 化で副作用がないか

### 10. `#canvasSize` + `#paddingX` + `#paddingY` の構造化

- 場所: `packages/vfx-js/src/vfx-player.ts:91-93`
- 問題: 同時に更新される（らしい）
- 案: `{ size: [w, h], padding: [x, y] }` 構造体に
- 確認: 本当に常に同時更新か、別々に更新される経路がないか

### 11. `backbuffer.ts:69` `getViewport()` 薄ラッパー

- 場所: `packages/vfx-js/src/backbuffer.ts:69`
- 問題: `getGLRect()` を呼ぶだけのラッパー。1箇所でしか呼ばれていなければ削除候補
- 案: 呼び出し側に inline、`width`/`height` を public getter で公開
- 確認: 全使用箇所を確認

---

## ❌ Refuted（やらない）

### `#postEffectChainReady`

- 場所: `packages/vfx-js/src/vfx-player.ts:68`
- 主張: `#postEffectChain !== null` と冗長
- 反証: **非冗長**。`#postEffectChain` は同期セット、`Ready` は `initAll()` await 後に立つ async ガード（L1667-1668）。init pending 中の二重実行を防ぐので必須

---

## 進め方

1. 各項目で別コミット（rollback しやすく、ベンチマークしやすく）
2. 1個終わるごとにテスト実行 (`pnpm --filter @vfx-js/core run test -- --run`)
3. 🔍 項目は手をつける前に「確認」項目を必ず実行
4. 各項目の commit message: `refactor: <verb> <what>`（既存スタイルに合わせる）
