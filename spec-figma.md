# Figma Shader Effects 移植仕様

Figma の Shader Effect を vfx-js/effects に移植するための推定仕様。
各エフェクトの param UI スクショから挙動を起こした。出典は `figma-shader-img/` のスクショ。

すべて元画像を入力に取るポストプロセス（`Effect` の frag シェーダ + uniforms）。
vfx-js 側の規約は `packages/effects/src/sinewave.ts` / `voronoi.ts` を雛形にする。

## 共通事項

- **値域の正規化**: UI は `%` / `°` / 絶対値で出る。`params` はUI値のまま受け、`render()` 内で
  UV・ラジアン・正規化値へ変換する（px系は `value / width` で UV 換算。`sinewave.ts` と同じ）。
- **Transform (X/Y/R/A)**: 複数エフェクトに付く共通ブロック。
  - `X/Y` = エフェクト中心（%、要素ローカル）。
  - `R` = 半径/スケール/範囲（エフェクトで意味が変わる）。
  - `A` = 角度（°、エフェクトの向き）。
  - 中心 `vec2` / 回転 `mat2` / スケール `float` の uniform にまとめる共通ヘルパを置くと楽。
- **enum param**（Type / Pattern / Shape / Style / Edge wrap / Dissolve mode）は
  `params` の文字列 union + uniform int でシェーダ内分岐。
- **アニメ**: Figma は静的だが、vfx-js では `ctx.time` を足して動かせるものは動かすと映える
  （Warp の Flag/Ripple など）。

---

## 1. Colored edges

エッジ検出し、エッジ強度をグラデーションで着色する。輪郭強調系。

| param | 既定/例 | 意味 |
|---|---|---|
| Threshold | 20 | エッジ判定しきい値。低いほど多くの輪郭を拾う |
| Thickness | 3 | エッジの太さ（サンプリング半径, px） |
| Intensity | 80 | エッジ色の強さ/コントラスト |
| Gradient | 赤→青→赤 | エッジ強度→色のグラデーション（ramp or 多色補間） |
| Opacity | 0 | 元画像の残し具合（0=エッジのみ, 100=元画像にブレンド） |
| Background | #000000 100% | 非エッジ部の背景色 |

実装: Sobel 等で luminance 勾配 → `threshold` で判定 → 勾配強度を gradient で着色 →
`background` と合成、`opacity` で元画像をブレンド。`Thickness` はカーネル間隔。

## 2. Pixel stretch

ある走査線のピクセル色を一方向に引き伸ばす（スメア）。

| param | 既定/例 | 意味 |
|---|---|---|
| Offset | -100% | ストレッチ開始ラインの位置。符号で向き |
| Smoothness | 0% | ストレッチ境界のぼかし |
| Falloff | 0% | 距離減衰（遠いほど薄れる） |
| Transform X/Y | 50% | ストレッチ基準点 |
| Transform R | 100 | 影響範囲 |
| Transform A | 0° | ストレッチ方向 |

実装: `A` 方向に座標を投影し、`Offset` のラインのピクセルをそれ以降へコピー（uvをラインにクランプ）。
`Falloff`/`Smoothness` で元画像へブレンド。

## 3. Pattern refraction

パターンで UV を屈折させ、ガラス越しのように歪ませる。色収差つき。

**Pattern（対応3種）**

| Pattern | 挙動 |
|---|---|
| Lenticular | 画像をx軸で短冊に分割。各短冊の中心線を基準に uv を x 方向へ `scale`（かまぼこレンズ縞） |
| Waves | Lenticular + y方向の wave を重ねる |
| Circular | grid 上に円を敷き詰め、円内の uv を src rect 中心 (0.5, 0.5) へ向かって `scale`（凸レンズの粒） |

非対応（実装しない）: ZigZag / Curved Square / Flat Square。

| param | 既定/例 | 意味 |
|---|---|---|
| Pattern | Lenticular | 屈折パターン種別（上記3種） |
| Strength | 50 | 屈折量 |
| Smoothness | 0% | パターン境目で uv を滑らかにつなぐ（0=段差くっきり、上げると連続） |
| Frost | 0% | すりガラス度（ランダムぼかし） |
| Dispersion | 4% | 色収差（RGB別に屈折量をずらす） |
| Edge wrap | Zero | 範囲外サンプリングの扱い（下記4種） |
| Transform X/Y/R/A | 50/50/8.16%/45° | パターンの中心・スケール・回転 |

**Edge wrap（境界サンプリング4種）**

| 値 | 挙動 |
|---|---|
| Zero | 範囲外は透明 `vec4(0)` |
| Clamp | 端をクランプ `clamp(uv,0,1)` |
| Repeat | タイル繰り返し `fract(uv)` |
| Mirror | 鏡像反転で繰り返し |

実装:
- cell index = `floor(uv.x * count)` 等。`count` は Transform R（スケール）から導出。
- Lenticular: セル中心 `c` に対し `uv.x = c + (uv.x - c) * (1 + strength)`。
- Circular: グリッドセル中心からの距離で円内判定、円内は画像中心方向へ `scale`。
- RGB別に `±dispersion` をかけて色収差。
- `Transform A` で短冊/グリッドの向きを回す。
- `Edge wrap` は uniform int で `readTex` 内のサンプリングを分岐。

## 4. Slice shift

画像を帯（スライス）に分け、帯ごとに横ずらし。グリッチ/シャッフル系。

| param | 既定/例 | 意味 |
|---|---|---|
| Shift | 50% | 各スライスのずらし量 |
| Softness | 0 | スライス境界のぼかし |
| Random | 0 | ずらし量のランダム化（0=規則的, 大=ばらばら） |
| Transform X/Y | 50% | 基準点 |
| Transform R | 100 | スライス本数/幅に対応 |
| Transform A | 0° | スライスの向き（0=水平帯） |

実装: `A` 方向に直交する軸でスライス index を作り、`Shift + Random*hash(index)` だけ uv をずらす。
`Softness` で隣接スライス境界をブレンド。

## 5. Warp

ドメインワープ。`Type` で歪みの種類を切替。

**Type（8種）**: Sine wave / Twist / Bulge / Pinch / Ripple / Flag / Squeeze / Swirl

| param | 既定/例 | 意味 |
|---|---|---|
| Type | Swirl | 歪みの種類（8種） |
| Amplitude | 3 | 歪みの強さ |
| Frequency | 1 | 空間周波数（Ripple/Sine/Flag 等で効く） |
| Center X/Y | 50% | 歪みの中心（Twist/Swirl/Bulge/Pinch で重要） |

実装（Type ごとに uv を変形）:
- Sine wave: `uv += sin(uv*freq)*amp`
- Twist / Swirl: 中心からの角度を半径依存で回転
- Bulge / Pinch / Squeeze: 中心からの距離を非線形リマップ（符号で膨張/収縮）
- Ripple: 中心距離の `sin` で放射状リップル
- Flag: 旗のような波（time でアニメ）

## 6. Pixelate

画像をセルに分割し、各セルを単色＋形状で表示するモザイク。
通常の正方モザイクより高機能（セル形状・間引き・色トリム）。

**Shape（セル形状4種）**: Rectangle / Ellipse / Hexagon / Triangle

| param | 既定/例 | 意味 |
|---|---|---|
| Shape | Triangle | セルの形（矩形/楕円/六角/三角でタイル分割） |
| Size | 10 | セルの大きさ（px） |
| Stretch | 100% | セルの縦横比（X引き伸ばし。100%=正方） |
| Gap | 0 | セル間の隙間（背景が覗く） |
| Color trim | 2 | セル色の量子化（posterize 的に色数を減らす） |
| Average color | 80% | セル内平均色 vs 中心ピクセル色のブレンド比 |
| Dissolve mode | Dropout | セル消去の方式（`Dropout` ほか。全項目未確認） |
| Dissolve | 0% | セルをランダムに消す割合 |
| Falloff | 0% | Dissolve の空間グラデーション（距離で消え方を変える） |
| Knockout | on | セル外/消去部を透明に抜く |

実装: `Size/Stretch` でセルグリッド → セルUV → 形状マスク（矩形/楕円/六角/三角の SDF）。
セル中心色を `texture` で取り、`Average color` で平均とブレンド、`Color trim` で量子化、
`Gap` でマスク縮小、`Dissolve+Falloff` で hash により間引き、`Knockout` で抜き部の alpha=0。

## 7. Dither

減色＋ディザパターンでレトロ/8bit 風にする。

**Style（ディザ方式6種）**: Bayer 2×2 / Bayer 4×4 / Bayer 8×8 / Bayer 16×16 / Blue noise / Threshold

| param | 既定/例 | 意味 |
|---|---|---|
| Style | Threshold | ディザ行列の種類（Bayer各サイズ / blue noise / 単純しきい値） |
| Size | 2 | ディザパターンの拡大率（1ドット=何px） |
| Levels | 3 | 量子化の階調数（chあたりの色段数） |
| Brightness | 100% | 量子化前の明度調整 |
| Contrast | 1 | 量子化前のコントラスト調整 |
| Mono | off | モノクロ化（on で1ch→`Mono color`で着色） |
| Mono color | #FFFFFF 100% | Mono on のときの前景色 |

実装: `Brightness/Contrast` で色調整 → ディザ閾値（Bayer 行列 or blue noise、`Size` でスケール）を引いて
`Levels` 段に量子化。`Threshold` style は行列なしの単純2値。`Mono` は luminance を `Mono color` ↔ 背景で着色。
Bayer 行列はシェーダ内 const 配列で持つ。

## 8. Gradient Map

入力画像の輝度（luminance）をグラデーションの色へ置き換えるトーンマッピング/カラーグレーディング。

**Repeat type（ランプの折り返し3種）**: None（=clamp） / Repeat / Mirror
**Mix space（補間の色空間3種）**: sRGB / Linear / OKLab

| param | UI値 | 意味 |
|---|---|---|
| Gradient | 白→青→黒 | 輝度0→1 を引くカラーランプ（多stop） |
| Scatter | 0% | ランプ参照前に輝度へrandom noiseを足す（バンディング低減） |
| Offset | 55.5% | ランプ参照位置のシフト |
| Repeat type | Mirror | `t` を [0,1] に畳む方式（None=clamp / Repeat=fract / Mirror=三角波） |
| Repeat frequency | 2 | 輝度方向にランプを何回繰り返すか |
| Mix space | sRGB | ランプ色補間の色空間 |

処理: `t = luminance*frequency + offset` → `applyRepeat(t)` → `sampleGradient(t)` を mixSpace で補間。
`Scatter` は `t` 前に `hash(uv)` ノイズ。Linear は sRGB↔linear、OKLab は linear↔OKLab 変換を経て補間。

---

## 移植対象まとめ（8エフェクト）

| # | 名前 | enum param | 中核処理 | アニメ |
|---|---|---|---|---|
| 1 | Colored edges | – | エッジ検出→gradient着色 | 静的 |
| 2 | Pixel stretch | – | 走査線スメア | 静的 |
| 3 | Pattern refraction | Pattern×3, Edge wrap×4 | パターンでUV屈折＋色収差 | 静的 |
| 4 | Slice shift | – | スライス横ずらし | 静的 |
| 5 | Warp | Type×8 | ドメインワープ | 一部animで映える |
| 6 | Pixelate | Shape×4, Dissolve mode | 形状モザイク＋間引き | 静的 |
| 7 | Dither | Style×6 | 減色＋ディザ | 静的 |
| 8 | Gradient Map | Repeat×3, Mix space×3 | 輝度→カラーランプ置換 | 静的 |

## 未確定・要追加スクショ

- Pixelate の **Dissolve mode** ドロップダウン全項目（`Dropout` のみ確認済み）。
  未確定でも `Dropout`（ランダム消去）だけで進められる。
