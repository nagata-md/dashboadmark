# 社内ツール共通デザインシステム

> 「名刺情報共有ツール」で `design-sample.html`（ダッシュボードのデザイン参考資料）から抽出し、実装したデザインシステムのまとめ。
> 今後、社内で新しく作るツール（Claude Codeで内製するもの）に同じ見た目を踏襲させたい場合は、**このファイルをそのままプロジェクトのルートに置いて「このデザインシステムに沿って実装して」と伝えるだけ**で再現できるようにしてある。

---

## 0. 前提・方針

- 対象は「社内向けの業務効率化ツール」。マーケティングサイトではなく、情報密度が高く実務的なダッシュボードの見た目を志向する。
- 実装は**素のHTML/CSS/JS**（フレームワーク・ビルドツールなし）を前提とする。本ドキュメントのCSSはそのままコピーして使える。
- **デザインは実装済みの機能に合わせる。機能にない要素（分割ビュー、保存済みフィルタ、列ソート、ページネーション、キーボードショートカットなど）は、参考デザインにあってもツール側に対応する機能がなければ実装しない。** 逆に機能を追加する際は、このデザインシステムのコンポーネントパターンに沿わせる。
- ロゴ文言（下記では`MEISHI`）・アクセントカラーの色相などは、ツールごとに変えても構わない。**構造とトーン（サイドバー構成・角丸・シャドウの強さ・情報密度・フォントの使い分け）を揃えることが目的**であり、完全に同一色である必要はない。

---

## 1. カラーパレット

| 変数名 | 値 | 用途 |
|---|---|---|
| `--navy` | `#0F2E4F` | ブランドカラー。サイドバー背景、見出し、主要ボタン、テーブルヘッダー罫線 |
| `--navy-hover` | `#163f6b` | 主要ボタンのホバー |
| `--accent` | `#A61A72` | アクセント（マゼンタ）。選択状態、タグの印、セクションラベルの下線、ページ見出しの左バー |
| `--accent-tint` | `#FFF0FF` | アクセントの淡色。選択中の背景など |
| `--ink` | `#101820` | 本文の基本文字色 |
| `--gray-700` | `#6D6E71` | 補助テキスト（ラベル、サブ情報） |
| `--gray-500` | `#9BA1A6` | プレースホルダー、Eyebrowラベル |
| `--gray-450` | `#8C9298` | 補助 |
| `--gray-400` | `#C6CBCF` | ボーダー（入力欄など濃いめ） |
| `--gray-300` | `#D9DCDF` | ボーダー（パネル・テーブルなど標準） |
| `--gray-100` | `#F3F4F5` | ページ全体の背景 |
| `--gray-050` | `#FBFBFC` | テーブルヘッダー・フィルターバーなどの淡い背景 |
| `--white` | `#FFFFFF` | カード・パネル背景 |
| `--danger` | `#B3261E` | 削除など破壊的操作 |
| `--danger-tint` | `#FDEDEB` | 破壊的ボタンのホバー背景 |

**別ツールに展開する際**: `--navy`と`--accent`の2色を変えれば、他は概ねそのまま流用できる（グレースケール・dangerは共通でよい）。

---

## 2. タイポグラフィ

- **日本語本文**: Noto Sans JP（`400/500/600/700`）
- **英字ラベル・ロゴ**: Archivo（`500/600/700`）。大文字＋`letter-spacing: 0.04〜0.14em`で使う（例: ページ見出し横の`CONTACTS`、サイドバーロゴ、テーブルヘッダー）
- フォールバック: `-apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif`

```css
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&display=swap');
```

基本文字サイズは **13px**（データ密度重視、一般的なWebサイトより一回り小さい）。Eyebrowラベルやテーブルヘッダーは`11〜11.5px`＋letter-spacing。detail画面の氏名など主役の見出しのみ`20〜28px`まで上げる。

---

## 3. スペーシング・角丸・シャドウ

| 変数 | 値 |
|---|---|
| `--radius` | `8px`（パネル、ボタン以外の大きめの角） |
| `--radius-sm` | `6px`（ボタン、入力欄） |
| `--shadow` | `0 1px 4px rgba(15, 46, 79, 0.08)`（控えめな浮き感。ネイビーを混ぜた影にするのがポイント） |

---

## 4. レイアウトシェル（サイドバー + メイン）

全画面共通の骨格。左に固定サイドバー（幅240px、ネイビー背景）、右にメインコンテンツ。**モバイル幅（768px以下）ではサイドバーが上部バー+ハンバーガーメニューに変形する**（§4.1）ため、最初からハンバーガー用のボタンとcollapsibleラッパーを組み込んでおく。

```html
<body>
<div class="app-shell">
  <aside class="sidebar">
    <div class="sidebar-topbar">
      <div class="sidebar-brand">
        <div class="logo">MEISHI</div>
        <div class="sub">名刺データベース</div>
      </div>
      <button type="button" class="sidebar-toggle" id="sidebar-toggle" aria-label="メニューを開く">☰</button>
    </div>
    <div class="sidebar-collapsible" id="sidebar-collapsible">
      <ul class="sidebar-nav">
        <li><a href="..." class="active">一覧</a></li>
        <li><a href="...">新規登録</a></li>
        <!-- 機能に応じたナビ項目 -->
      </ul>
      <div class="sidebar-spacer"></div>
      <div class="sidebar-user">
        <div class="name">ユーザー名</div>
        <div class="email">user@example.com</div>
        <a href="/logout.php">ログアウト</a>
      </div>
    </div>
  </aside>
  <main class="main-content">
    <!-- ページごとのコンテンツ -->
  </main>
</div>

<script>
(function () {
  var toggle = document.getElementById('sidebar-toggle');
  var collapsible = document.getElementById('sidebar-collapsible');
  if (toggle && collapsible) {
    toggle.addEventListener('click', function () {
      collapsible.classList.toggle('open');
    });
  }
})();
</script>
</body>
```

- ナビ項目の`active`クラスで現在地を示す（アクセントカラーの左ボーダー3px＋背景をわずかに明るく）。
- サーバーサイドで複数画面から共通include（PHPなら`partials/nav.php`のような1ファイル）にしてDRYにする。呼び出し側で「どのナビが active か」を変数で渡す設計にする。トグル用のJSもこのinclude内に閉じ込めて、ページ固有のJSと分離する。
- ログイン前の画面（ログイン画面など）はサイドバーを出さず、中央カード1枚のレイアウト（§7）にする。

### 4.1 モバイル対応（重要）

社内ツールは**スマホから使う画面（撮影・登録系）が必ず存在する**前提で、最初からモバイル対応を組み込む。参考にした元デザインがPC向けダッシュボードのみだった場合、モバイル最適化は**参考デザインに含まれていないので自分で設計する必要がある**（実際にこのプロジェクトでも、デザイン刷新直後にモバイル確認を怠り、固定240pxサイドバーが画面の大半を占める崩れが起きた）。

- ブレークポイントは`max-width: 768px`。
- サイドバーは横幅100%の上部バーに変形し、ナビ本体（`.sidebar-collapsible`）はハンバーガーボタンで開閉する非表示状態がデフォルト。
- ページ見出しのアクションボタン・フィルターバーの入力/ボタン群は、モバイルでは縦積み・全幅にしてタップしやすくする。
- 横並びの選択肢（例: モード切り替えのラジオボタンカード）は縦積みに変える。日本語の説明文が長いカードを横並びのままにすると、幅が足りず1〜2文字ごとに改行される致命的な崩れが起きるため注意。
- テーブルは`overflow-x:auto`のラッパーで包み、列数が多くても横スクロールで破綻しないようにする。
- **実装後は必ずスマホ幅（375〜390px程度）でスクリーンショット確認する。** PC幅だけで確認すると崩れに気づけない。

---

## 5. コンポーネント

### 5.1 ページ見出し
```html
<div class="page-header">
  <h1>名刺一覧</h1>
  <span class="eyebrow">CONTACTS</span>
  <div class="actions">
    <a class="btn btn-primary" href="...">＋ 新規登録</a>
  </div>
</div>
```
見出しは左にアクセントカラーの太い縦線（4px）。右に英字のeyebrowラベル、さらに右端に主要アクションボタン。

### 5.2 ボタン
- `.btn`: 標準（白背景・グレー枠・ネイビー文字）
- `.btn.btn-primary`: 主要アクション（ネイビー背景・白文字）
- `.btn.btn-danger`: 破壊的アクション（白背景・赤枠赤文字、常時警告色で表示）
- 無効時は`opacity:0.5`

### 5.3 フォーム
- 入力欄はグレー枠・角丸6px・13pxフォント。フォーカス時はアクセントカラーの2pxアウトライン。
- `.form-row`でlabel（12px, 太字, グレー700）+ input(width:100%)を縦積み。
- チェックボックス・ラジオは`accent-color: var(--accent)`でブラウザネイティブの着色を使う（余計なカスタムUIを作らない）。

### 5.4 フィルター/検索バー
```html
<form class="filter-bar">
  <input type="text" placeholder="...">
  <select>...</select>
  <button class="btn">検索</button>
  <span class="count">12件</span>
</form>
```
淡いグレー背景・角丸パネルの中に検索条件を横並びで配置し、右端に件数を表示。

### 5.5 テーブル
- ヘッダー行: Archivo・大文字・letter-spacing・グレー700文字・下線はネイビー2px・背景は淡いグレー。
- 行ホバーで淡いグレー背景。
- 主項目（会社名・氏名など）を太字、部署や役職などの補助情報は`<span class="sub">`でセル内2行目・グレー・小さめフォントにする（1セルに主/副情報を積む「stacked cell」パターン）。

### 5.6 タグ/バッジ
```html
<span class="tag">タグ名</span>
```
白背景・薄いグレー枠・角丸4px、前にアクセントカラーの小さな四角（`::before`で表現、画像不要）。選択・強調用に`.tag-dark`（ネイビー背景・白文字）も用意。

### 5.7 パネル/カード
```html
<div class="panel">
  <div class="section-label">セクション名</div>
  ...
</div>
```
白背景・グレー枠・角丸8px・控えめシャドウ。セクション見出しは`.section-label`（Archivo・大文字・グレー・下にアクセントカラーの2px下線）。

### 5.8 詳細画面（レコード1件を表示するパターン）
- `.detail-heading`: 会社名（小・グレー）→氏名（大見出し・28px）→部署役職（グレー）の3段構成。
- `.field-list`: `dt`(ラベル,グレー,11.5px) / `dd`(値) の2カラムgridでラベル・値を並べる（編集フォームが必要な場合はinputに置き換えてよい）。

### 5.9 ログイン画面
サイドバーなし。ネイビー背景に白いカード（`.auth-shell`、角丸8px・強めのシャドウ・幅360px程度）を中央配置。ロゴ＋説明文＋認証ボタンのみのシンプル構成。

---

## 6. 実装ガイドライン（新しいツールに適用する時の手順）

1. まずこのファイルとエンドユーザーの機能要件（spec.md相当）を確認する。
2. §7の再利用可能CSSをそのまま`public/css/app.css`等にコピーし、ロゴ文言・`--navy`/`--accent`をツールに合わせて調整する（変更は最小限でよい）。
3. サイドバーの共通include（§4）を1つ作り、各画面から呼び出す。
4. 各画面の機能に必要なコンポーネントだけを§5から拾って組み立てる。**参考にした元デザインにあっても、その画面に対応する機能がなければ実装しない**（例: ソートや保存済みビューなど）。
5. 実装後、Headless Chrome等で実際にスクリーンショットを撮り、意図した見た目になっているか確認してから完了とする（CSSの詳細度の衝突などは目視で気づきやすい）。**PC幅だけでなく、必ずスマホ幅（375〜390px程度、`isMobile`/`hasTouch`指定）でも確認する**（§4.1）。

---

## 7. 再利用可能なベースCSS

そのまま新規プロジェクトの`app.css`としてコピー可能。`.confirm-card` / `.mode-choice` / `.phone-row` / `.detail-heading` / `.field-list` / `.card-image` は名刺管理ツール固有の実装例なので、他ツールでは不要なら削除し、必要なら命名を変えて流用する（パターン自体は「選択式トグル」「ラベル/値の一覧」「画像付きヘッダー」など汎用的）。

```css
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&display=swap');

:root {
  --navy: #0F2E4F;
  --navy-hover: #163f6b;
  --accent: #A61A72;
  --accent-tint: #FFF0FF;
  --ink: #101820;
  --gray-700: #6D6E71;
  --gray-500: #9BA1A6;
  --gray-450: #8C9298;
  --gray-400: #C6CBCF;
  --gray-300: #D9DCDF;
  --gray-100: #F3F4F5;
  --gray-050: #FBFBFC;
  --white: #FFFFFF;
  --danger: #B3261E;
  --danger-tint: #FDEDEB;
  --radius: 8px;
  --radius-sm: 6px;
  --shadow: 0 1px 4px rgba(15, 46, 79, 0.08);
}

* {
  box-sizing: border-box;
}

body {
  font-family: "Noto Sans JP", "Hiragino Sans", -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--ink);
  background: var(--gray-100);
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

a {
  color: var(--navy);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

h1, h2, h3 {
  margin: 0;
  font-weight: 700;
  color: var(--navy);
}

.eyebrow {
  font-family: "Archivo", sans-serif;
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gray-500);
}

/* ---------- レイアウトシェル（サイドバー + メイン） ---------- */

.app-shell {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--navy);
  color: var(--white);
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
}

.sidebar-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.sidebar-toggle {
  display: none;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: var(--white);
  border-radius: var(--radius-sm);
  font-size: 18px;
  line-height: 1;
  padding: 6px 10px;
  cursor: pointer;
}

.sidebar-brand {
  margin-bottom: 24px;
}

.sidebar-brand .logo {
  font-family: "Archivo", sans-serif;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.06em;
  color: var(--white);
}

.sidebar-brand .sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  margin-top: 2px;
}

.sidebar-nav {
  list-style: none;
  margin: 0 0 24px;
  padding: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding-top: 12px;
}

.sidebar-nav li + li {
  margin-top: 2px;
}

.sidebar-nav a {
  display: block;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  border-left: 3px solid transparent;
}

.sidebar-nav a:hover {
  background: rgba(255, 255, 255, 0.06);
  text-decoration: none;
}

.sidebar-nav a.active {
  background: rgba(255, 255, 255, 0.08);
  border-left-color: var(--accent);
  color: var(--white);
  font-weight: 600;
}

.sidebar-spacer {
  flex: 1;
}

.sidebar-user {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding-top: 12px;
  font-size: 12px;
}

.sidebar-user .name {
  color: var(--white);
  font-weight: 600;
}

.sidebar-user .email {
  color: rgba(255, 255, 255, 0.55);
  word-break: break-all;
  margin-top: 2px;
}

.sidebar-user a {
  color: rgba(255, 255, 255, 0.7);
  display: inline-block;
  margin-top: 8px;
  font-size: 12px;
}

.main-content {
  flex: 1;
  min-width: 0;
  padding: 28px 32px;
}

/* ---------- ページヘッダー ---------- */

.page-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.page-header h1 {
  font-size: 20px;
  border-left: 4px solid var(--accent);
  padding-left: 10px;
}

.page-header .actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
  align-items: center;
}

/* ---------- カード/パネル ---------- */

.panel {
  background: var(--white);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px;
  margin-bottom: 16px;
}

.section-label {
  font-family: "Archivo", sans-serif;
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gray-500);
  border-bottom: 2px solid var(--accent);
  display: inline-block;
  padding-bottom: 4px;
  margin-bottom: 14px;
}

/* ---------- ボタン ---------- */

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  cursor: pointer;
  background: var(--white);
  color: var(--navy);
  border-color: var(--gray-400);
}

.btn:hover {
  background: var(--gray-100);
  text-decoration: none;
}

.btn-primary {
  background: var(--navy);
  color: var(--white);
  border-color: var(--navy);
}

.btn-primary:hover {
  background: var(--navy-hover);
}

.btn-danger {
  background: var(--white);
  color: var(--danger);
  border-color: var(--danger);
}

.btn-danger:hover {
  background: var(--danger-tint);
}

.btn:disabled {
  opacity: 0.5;
  cursor: default;
}

/* ---------- フォーム ---------- */

input[type="text"],
input[type="email"],
input[type="url"],
input[type="date"],
input[type="file"],
input[type="password"],
select,
textarea {
  font-family: inherit;
  font-size: 13px;
  color: var(--ink);
  border: 1px solid var(--gray-400);
  border-radius: var(--radius-sm);
  padding: 7px 10px;
  background: var(--white);
}

input:focus, select:focus, textarea:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

input[type="checkbox"] {
  width: 15px;
  height: 15px;
  accent-color: var(--accent);
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  background: var(--gray-050);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius);
  padding: 12px 14px;
  margin-bottom: 14px;
}

.filter-bar .count {
  margin-left: auto;
  color: var(--gray-700);
  font-size: 12px;
}

.form-row {
  margin-bottom: 14px;
}

.form-row label {
  display: block;
  font-weight: 600;
  font-size: 12px;
  color: var(--gray-700);
  margin-bottom: 4px;
}

.form-row input[type="text"],
.form-row input[type="email"],
.form-row input[type="url"],
.form-row input[type="date"],
.form-row textarea,
.form-row select {
  width: 100%;
}

/* ---------- テーブル ---------- */

table {
  width: 100%;
  border-collapse: collapse;
  background: var(--white);
}

thead th {
  font-family: "Archivo", sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gray-700);
  text-align: left;
  padding: 10px 12px;
  border-bottom: 2px solid var(--navy);
  background: var(--gray-050);
}

tbody td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--gray-300);
  vertical-align: top;
  font-size: 13px;
}

tbody tr:hover {
  background: var(--gray-050);
}

td .sub {
  display: block;
  color: var(--gray-700);
  font-size: 11.5px;
  margin-top: 1px;
}

.name-link {
  font-weight: 600;
}

/* ---------- タグ/バッジ ---------- */

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--white);
  color: var(--ink);
  border: 1px solid var(--gray-300);
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 11.5px;
  margin-right: 4px;
  white-space: nowrap;
}

.tag::before {
  content: "";
  width: 6px;
  height: 6px;
  background: var(--accent);
  display: inline-block;
  border-radius: 1px;
}

.tag-dark {
  background: var(--navy);
  color: var(--white);
  border-color: var(--navy);
}

.tag-dark::before {
  background: var(--accent-tint);
}

.tag .remove-tag {
  border: none;
  background: none;
  color: var(--gray-500);
  cursor: pointer;
  font-size: 12px;
  padding: 0 0 0 2px;
  line-height: 1;
}

.tag .remove-tag:hover {
  color: var(--danger);
}

/* ---------- 詳細画面（ドメイン固有の例。命名は自由に変えてよい） ---------- */

.detail-heading .company {
  color: var(--gray-700);
  font-size: 12.5px;
  margin-bottom: 2px;
}

.detail-heading h1 {
  font-size: 28px;
  border-left: none;
  padding-left: 0;
}

.detail-heading .role {
  color: var(--gray-700);
  font-size: 13px;
  margin-top: 4px;
}

.field-list {
  display: grid;
  grid-template-columns: 120px 1fr;
  row-gap: 10px;
  column-gap: 12px;
  font-size: 13px;
}

.field-list dt {
  color: var(--gray-700);
  font-size: 11.5px;
  letter-spacing: 0.04em;
}

.field-list dd {
  margin: 0;
  word-break: break-all;
}

.card-image {
  max-width: 320px;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-sm);
  display: block;
  margin-bottom: 12px;
}

/* ---------- ステータス表示 ---------- */

.danger {
  color: var(--danger);
}

.status-message {
  font-size: 13px;
  min-height: 1.4em;
}

/* ---------- ログイン画面 ---------- */

.auth-body {
  background: var(--navy);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.auth-shell {
  background: var(--white);
  border-radius: var(--radius);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  padding: 40px 36px;
  width: 100%;
  max-width: 360px;
  text-align: center;
}

.auth-shell .logo {
  font-family: "Archivo", sans-serif;
  font-weight: 700;
  font-size: 22px;
  letter-spacing: 0.06em;
  color: var(--navy);
  margin-bottom: 6px;
}

.auth-shell .sub {
  color: var(--gray-700);
  font-size: 13px;
  margin-bottom: 24px;
}

/* ---------- モバイル対応（§4.1参照。必須） ---------- */

@media (max-width: 768px) {
  .app-shell {
    flex-direction: column;
    min-height: 0;
  }

  .sidebar {
    width: 100%;
    padding: 14px 16px;
  }

  .sidebar-brand {
    margin-bottom: 0;
  }

  .sidebar-toggle {
    display: inline-flex;
  }

  .sidebar-collapsible {
    display: none;
    margin-top: 14px;
  }

  .sidebar-collapsible.open {
    display: block;
  }

  .sidebar-nav {
    border-top: none;
    padding-top: 0;
    margin-bottom: 14px;
  }

  .sidebar-spacer {
    display: none;
  }

  .sidebar-user {
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    padding-top: 12px;
  }

  .main-content {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .page-header .actions {
    margin-left: 0;
    width: 100%;
  }

  .page-header .actions .btn {
    width: 100%;
    justify-content: center;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-bar input,
  .filter-bar select,
  .filter-bar button,
  .filter-bar a.btn {
    width: 100%;
  }

  .filter-bar .count {
    margin-left: 0;
    text-align: right;
  }

  .table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .table-scroll table {
    min-width: 640px;
  }

  /* 横並びの選択肢カード（例: .mode-choice）は縦積みに */
  .mode-choice {
    flex-direction: column;
  }

  .confirm-card,
  .panel {
    padding: 16px;
  }
}
```

一覧テーブルなど横に長くなりがちな表は、必ず`<div class="table-scroll"><table>...</table></div>`のようにラップする。

---

## 8. 実装例（参照プロジェクト）

このデザインシステムの完全な実装例は「名刺情報共有ツール」プロジェクト（本リポジトリ）にある。特に以下が参考になる。

- `public/css/app.css` — 本ドキュメント§7の元になった実ファイル（ドメイン固有コンポーネント含む完全版）
- `public/partials/nav.php` — サイドバー共通includeの実装パターン
- `public/cards/index.php` — 一覧・検索・テーブルの実装例
- `public/cards/show.php` — 詳細/編集画面（パネル分割・タグ・field的な構成）の実装例
- `public/login.php` — ログイン画面の実装例
