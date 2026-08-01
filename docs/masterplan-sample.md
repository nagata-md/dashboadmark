# サーバー情報管理アプリ — masterplan.md

> `spec.md`（v1）に対する実装計画。**何を・どの順で・どう作るか**を定義する。
> 仕様の記述を正とし、本書は「実装の地図」として spec を分解・補完する。
> 記法: ⚠️ = 着手前に人間判断が要る箇所 / ✅ = spec で確定済み / 📌 = 受け入れ基準に直結。

---

## 実装状況（2026-07-31）

全9フェーズ実装完了。ローカル開発環境（PHP内蔵サーバー + Homebrew MySQL）でcurlベースの統合テストにより全機能を確認済み。実際のGoogleアカウントでのログイン疎通・Xserverへの本番デプロイ・実ブラウザでの目視確認は未実施（詳細はPhase 8の項を参照）。

- ローカル開発サーバー：`php -S localhost:8080 -t public`（**8080番**。8000番は別プロセスが使用中のため使用しない）
- ローカルDB：MySQL（Homebrew、`127.0.0.1:3306`）に `server_mgmt_dev` データベース／同名ユーザーを作成済み
- `serverhub_app/config.php`（DB接続情報・暗号鍵・Google OAuth設定・セッションタイムアウト値）を作成。Git管理対象外（`.gitignore`）。テンプレートは `serverhub_app/config.example.php` にコミット済み
- Gitリポジトリ初期化済み（初回コミット済み）

Phase 1（デザインシステム移植）も完了。`public/assets/css/app.css`（DESIGN_SYSTEM.md §7をそのまま移植）、共通レイアウトinclude（`public/partials/header.php` / `nav.php` / `footer.php`）を作成。ロゴ文言は「SERVER HUB / サーバー情報管理」。ヘッドレスChromeでPC幅(1280px)・スマホ幅(390px)のスクリーンショットを確認し、崩れがないことを確認済み（`public/_design_preview.php`、Phase 4でclients.php実装後に削除予定）。spec §8によりPC対応のみ必須のため、モバイル用ハンバーガーメニューのトグル機構は実装していない（サイドバーは常時展開表示）。

Phase 2（データ層）も完了。`serverhub_sql/schema.sql`をローカルDBに適用し全7テーブル作成済み。`serverhub_app/crypto.php`（AES-256-GCM、`openssl_encrypt`/`openssl_decrypt`）と`serverhub_app/editlog.php`（`logCreate`/`logUpdate`/`logDelete`/`logRestore`/`logRevoke`＋機密フィールドの自動暗号化）を実装し、単体テストで暗号化のラウンドトリップ・DB格納値が平文でないこと・編集履歴からの復号表示を確認済み。`serverhub_sql/seed.php`（PHPスクリプト。暗号化が必要なためSQLではなくPHPで実装）でダミーデータ（顧客3社・サイト3件・SNS1件・社内共通ツール2件）を投入し、`sites.server_password`等が暗号化されて保存されていることを実データで確認済み。

Phase 3（認証・セッション管理）も実装完了。`serverhub_app/google_oauth.php`（cURL＋素のPHPでOIDC実装。JWK→PEM変換・RS256署名検証を外部ライブラリなしで実装、E1）、`serverhub_app/auth.php`（多重ログイン防止・8時間無操作タイムアウト）、`public/login.php` / `oauth_callback.php` / `logout.php` / `clients.php`（Phase 4で本実装に置き換え予定の暫定版）を作成。

- JWT検証ロジックは自己署名した模擬id_tokenで単体テスト済み（正常系・署名不正・aud不一致・hd不一致・期限切れをすべて確認）。
- セッション/多重ログイン/タイムアウトは、`establishSession()`を直接叩く一時的なテスト用エンドポイント経由で実サーバーに対しcurlで統合テストを実施し、削除済み（本番コードには含まれない）。
- **バグ修正**：多重ログイン検知時に`clearSession()`がDBの`current_session_token`を無条件でNULLにしており、後続で別端末が確立した新しいセッションを巻き添えで無効化する不具合を発見。ローカルセッション破棄のみ行う`destroySessionLocally()`を新設し、DBトークンを触ってよいのは明示的なログアウト（`logout.php`）のみに限定した。
- **バグ修正**：PHPの既定タイムゾーン(UTC)とMySQLの`NOW()`(JST)が9時間ずれており、セッションタイムアウト判定が機能しない不具合を発見。`serverhub_app/db.php`で`date_default_timezone_set('Asia/Tokyo')`とMySQLセッションの`SET time_zone='+09:00'`を設定し解消。

✅ **2026-07-31 追記：実アカウントでのログイン疎通確認済み**。Google Cloud ConsoleでOAuthクライアント（Webアプリケーション、リダイレクトURIに`http://localhost:8080/oauth_callback.php`と`https://s1e1v1e9r.marketingdept-llc.com/oauth_callback.php`の両方を登録、OAuth同意画面は内部・`marketingdept-llc.com`限定）を発行。本番Xserver環境（`https://s1e1v1e9r.marketingdept-llc.com/`）で、`serverhub_sql/create_initial_admin.php`相当の事前登録（`main@marketingdept-llc.com` / role=admin をphpMyAdmin経由でINSERT）→実際のGoogleアカウントでログイン成功→`google_sub`の自動紐づけまで確認済み。開発中は「`establishSession()`を直接呼ぶ一時的な未コミットスクリプト」でログイン状態を模擬していたが、これで実OAuthフローも実証された。

Phase 4（顧客/サイト/SNS管理）も実装完了。`clients.php`（一覧・検索）、`client_new.php`（会社名のみ〜サイト/SNS込みの一括登録）、`client_detail.php`（会社名編集・サイト/SNS一覧・追加フォーム）、`site_detail.php`（サーバー/ドメイン/FTP/MySQL/WordPress/備考の全項目編集）、`api/save_field.php`（ダブルクリック自動保存）、`api/delete.php`（論理削除・管理者限定）を実装。共通部品として`serverhub_app/fields.php`（編集可能フィールドのホワイトリスト）、`serverhub_app/csrf.php`、`serverhub_app/helpers.php`（`renderEditableField()`）、`public/assets/js/edit.js`（ダブルクリック→自動保存の汎用JS）を追加。

- **spec.mdの抜けを発見・修正**：検索対象に「ドメイン」とあるが、`sites`テーブルに実際のドメイン名（例: example.com）を保持するカラムが存在せず、`domain_registrar`（レジストラ名）のみだった。ユーザー確認の上、`sites.domain_name`を追加（spec.md §6、`serverhub_sql/schema.sql`、`serverhub_app/fields.php`、`serverhub_sql/seed.php`を更新、ローカルDBにも`ALTER TABLE`で反映）。
- 一時的な`establishSession()`直叩きスクリプト（未コミット・テスト後削除）でログインを模擬し、curlで以下を確認：一覧表示、検索（1件ヒット時の直接ジャンプ／複数ヒット時の一覧表示）、ダブルクリック編集相当の`save_field.php`呼び出し（暗号化フィールドの暗号化保存・編集履歴記録・CSRF拒否・フィールドホワイトリストによる不正カラム拒否）、管理者のみ削除可（一般ユーザーは403）、論理削除後に一覧から消えること、顧客新規登録（サイト/SNS同時作成・会社名のみ登録・必須バリデーション）、サイト/SNS追加フォーム。
- ヘッドレスChromeでの認証後ページのスクリーンショット確認は環境都合で断念（プロファイル起動が安定してハングした）。Phase 1で共通CSSコンポーネント（panel/table/field-list/filter-bar等）は視覚確認済みで、Phase 4はそれらを再利用する形のため大きな崩れの可能性は低いと考えているが、**実際のブラウザでの見た目は未確認**。
- 外部共有ボタン（spec §4.8、画面一覧のサイト詳細説明に記載）はPhase 7で追加する計画のため、`site_detail.php`には意図的にまだ実装していない。

Phase 5（社内共通ツール管理）も完了。`tools.php`（一覧・追加・ダブルクリック編集・管理者限定削除）を、Phase 4と同じ部品（`renderEditableField`/`api/save_field.php`/`api/delete.php`）を再利用して実装。curlで一覧表示・追加・編集・削除を確認済み。

Phase 6（編集履歴・復元）も完了。`history.php`（全編集ログの一覧、対象種別・変更者・日時・変更前後を表示、機密フィールドは復号して表示）と`api/restore.php`を実装。`serverhub_app/helpers.php`に表示ラベル変換（`targetTypeLabel`/`actionLabel`/`fieldLabel`）と対象レコード名解決（`resolveTargetLabel`）を追加。

- 復元は2種類：(1) 削除ログの復元＝`is_deleted`を0に戻す、(2) 更新ログの復元＝該当フィールドをそのログの`before_value`に戻す（新たに`action='restore'`のログを記録）。いずれもcurlで実データにより確認（削除→復元、平文フィールドの復元、暗号化フィールド(`server_password`)の復元と復号確認）。
- `share_link`はテーブルホワイトリスト（`tableForTargetType`）に含めていないため、共有リンクの失効ログは復元対象にならない（意図的：失効済み共有は復活させない設計）。

Phase 7（外部共有機能）も完了。`serverhub_app/fields.php`に`SHARE_CATEGORIES`（server/domain/ftp/mysql/wordpress/notesの6カテゴリ→カラムのマッピング）を追加。`site_detail.php`にカテゴリ選択→発行フォームを追加、`api/share_create.php`（token生成・`generateComplexPassword()`によるパスワード生成・`password_hash()`保存・発行直後の1回限りの平文パスワード表示）、`api/share_revoke.php`、`shares.php`（一覧・状態表示・失効）、`share_view.php`（ログイン不要・パスワード必須・選択カテゴリのみ復号表示の閲覧専用ページ、独自のシンプルなレイアウトでサイドバーは出さない）を実装。

- curlで一連を確認：カテゴリ選択発行→URLとパスワードの取得→未ログインでの`share_view.php`アクセス→誤パスワード拒否→正パスワードで選択カテゴリ（FTP・WordPress）のみ復号表示（サーバー・ドメイン・MySQLは非表示）→`shares.php`での一覧確認→失効→失効後は同じリンクでアクセス不可、をすべて確認。カテゴリ未選択時のバリデーション、不正なカテゴリ値（ホワイトリスト外）の送信時にも安全に拒否されることを確認。
- `edit_logs`に`share_link`の発行(`create`)・失効(`revoke`)が正しく記録されることを確認。

Phase 8（ユーザー管理・エクスポート・バックアップ・仕上げ）も完了。

**ユーザー管理**：`users.php`（管理者のみ）と`api/user_add.php`相当（`users.php`内で処理）/`api/user_set_role.php`/`api/user_delete.php`/`api/user_restore.php`を実装。

- **spec.mdの抜けを発見・修正**：初期セットアップ（spec §9「社長のアカウントのみ事前にadmin付与」）を実現するため、`users.google_sub`をNULL許容に変更。事前登録時は`google_sub=NULL`で`email`のみ登録し、本人の初回Googleログイン時に`oauth_callback.php`が email 一致（`google_sub IS NULL AND is_deleted=0`）で該当行を見つけて`google_sub`を確定させる（ロールは事前設定のまま維持）。`serverhub_sql/create_initial_admin.php`を初期セットアップ用CLIスクリプトとして用意。
- **spec.mdの抜けを発見・修正**：ユーザー管理画面の「削除」は、`edit_logs.changed_by`がusers.idを外部キー参照しているため物理削除できない（ユーザー確認の上、`users.is_deleted`を追加し論理削除に）。削除されたユーザーは`oauth_callback.php`・`serverhub_app/auth.php`の両方でログイン拒否される。
- **安全装置**：最後の管理者は一般ユーザーへの降格・削除ができない（`api/user_set_role.php`・`api/user_delete.php`で管理者数をカウントしてガード）。自分自身の削除もできない。
- ユーザー管理の操作は`edit_logs`の対象外（spec §4.5の対象はClient/Site/SNS/InternalTool/ShareLinkのみのため）。同じ理由で、一般ユーザーも復元できてしまう`history.php`/`api/restore.php`の仕組みとは意図的に分離し、削除済みユーザーの復元も`users.php`内（管理者専用）で完結させている。
- curlで確認：ユーザー追加（ドメイン外メールは拒否）、ロール昇格/降格、最後の管理者への降格・削除のブロック、自分自身の削除のブロック、削除→ログイン拒否→復元→再ログイン可、一般ユーザーによるユーザー管理画面/APIへのアクセス拒否(403)。

**エクスポート**：`export.php`と`api/export_csv.php`を実装。全カテゴリ（顧客・サイト・SNS・社内共通ツール）を「レコード種別」列を持つ1本のワイドフォーマットCSVに出力し、機密フィールドは復号済み平文で出力する（サービス終了時のバックアップ・移行用途のため）。Excelでの文字化け防止にUTF-8 BOMを付与。

- **バグ修正**：PHP 8.5で`fputcsv()`の`$escape`引数省略が非推奨警告となり、その警告テキストがCSV本文に混入して壊れる不具合を発見。全`fputcsv()`呼び出しに明示的な区切り文字・囲み文字・エスケープ文字を指定して解消。
- curlで全レコード種別の出力・復号済みパスワードの平文出力を確認。

**バックアップ**：`serverhub_scripts/backup.php`（`mysqldump`→gzip、日次30世代＋月初12ヶ月保持、`serverhub_app/config.php`の`backup.remote_destination`設定時はrsync転送）を実装。

- **バグ修正**：`mysqldump`をシェルパイプ（`| gzip`）で繋ぐと、mysqldump自体が権限エラーで実質失敗していてもパイプライン全体の終了コードは最後のコマンド（gzip）のものになり検知できない不具合を発見。mysqldumpとgzipを別コマンドに分離し、それぞれの終了コードを個別に検証する方式に変更。
- **ローカル検証で判明した追加の実務的知見**：制限された権限のDBユーザーで`mysqldump`を実行すると、MySQL 9.x系では`--single-transaction`だけでは`FLUSH TABLES`関連の内部処理で権限エラーが発生し、しかも**終了コードが0のまま尻切れの不完全なダンプを生成する**ことを確認。`--skip-lock-tables` `--set-gtid-purged=OFF` `--skip-masking-policies` `--no-tablespaces`を追加し、さらに終了コードだけでなく「ダンプ内容に`CREATE TABLE`が含まれるか」を完了判定に加えることで、不完全なダンプを検知できるようにした（本番のXserverでは異なるMySQLバージョン・権限設定の可能性があるため、デプロイ後に一度実行確認が必要）。
- 日次30世代・月次12世代のローテーションをダミーファイルで実地検証済み（それぞれ上限を超えた分の最古ファイルが正しく削除されることを確認）。
- ✅別ストレージへの転送は行わない方針に確定（2026-07-31、spec §10-4）。Xserverアカウント内保存（`public_html/backups/`）のみ。`backup.remote_destination`は`null`のままでよい。

**Xserver実機での発見（2026-07-31、デプロイ作業中）**：`app/` / `sql/` / `scripts/` という汎用的なディレクトリ名は、`public_html`配下を他の複数アプリ（名刺情報共有ツール等）と共有しているXserver環境では衝突する（実際に`public_html/app/`等が他アプリに使われていた）ことが判明。リポジトリ全体で`serverhub_app/` / `serverhub_sql/` / `serverhub_scripts/`にリネームし、参照箇所（`public/`配下の全ページ・API、リネーム後のディレクトリ内の相互参照、`.gitignore`）を一括修正した。ローカル・本番で同一のディレクトリ構成を維持している。

**Xserver実デプロイの進捗（2026-07-31）**：サブドメイン作成・MySQL作成・スキーマ適用（phpMyAdmin）・ファイル一式のFTPアップロード・`serverhub_app/config.php`の本番値設定・初期管理者の事前登録・実Googleアカウントでのログイン、まで完了。

**残っている作業**：
1. ~~Google OAuthクライアントの発行・実アカウントでのログイン疎通確認~~ → 完了（上記）
2. バックアップの転送先決定と`backup.remote_destination`への設定
3. ~~`serverhub_scripts/backup.php`のXserver cronへの登録~~ → 登録済み。ただし即時実行テストは今回できず、翌日以降の自動実行結果（`public_html/backups/daily/`にファイルが作成されるか）を確認予定
4. 実ブラウザでのPhase 4以降の画面の目視確認（この開発環境ではヘッドレスChromeが不安定だったため未実施。本番で実際にログインできたので、続けて画面遷移・ダブルクリック編集などを本番ブラウザで確認するとよい）

| Phase | 状態 |
|---|---|
| 0 基盤セットアップ | ✅ 完了 |
| 1 デザインシステム移植 | ✅ 完了 |
| 2 データ層（MySQL） | ✅ 完了 |
| 3 認証・セッション管理 | ✅ 完了（⚠️実Googleアカウントでの疎通は未検証、要OAuthクレデンシャル・保留中） |
| 4 顧客/サイト/SNS管理 | ✅ 完了 |
| 5 社内共通ツール管理 | ✅ 完了 |
| 6 編集履歴・復元 | ✅ 完了 |
| 7 外部共有機能 | ✅ 完了 |
| 8 ユーザー管理・エクスポート・バックアップ・仕上げ | ✅ 完了 |

---

## 0. 前提と現状

- ✅ 確定済みコア技術：**素のPHP + MySQL + 素のHTML/CSS/JS**（フレームワーク・ビルドツールなし）、**Xserver**（既存契約のサブドメインを切り出して運用）。デザインは `DESIGN_SYSTEM.md` をそのまま踏襲（spec §7・§12）。
- ✅ 参照ドキュメント：`spec.md`（本書の元仕様）、`DESIGN_SYSTEM.md`（見た目の正）、`サーバー情報管理アプリ_要件定義書_vol1.md`（背景）。

### 着手前に確定が必要な事項（spec §10 / 各所の ⚠️）→ すべて解決済み

| # | 事項 | 確定内容 |
|---|---|---|
| D1 | ~~暗号鍵の具体的な管理場所・ローテーション方針（spec §6）~~ → **解決** | public_htmlと同階層に配置する設定ファイル（`serverhub_app/config.php`、`.htaccess`でアクセス拒否・Git管理外）に鍵を保持。ローテーションは行わない（鍵漏洩が疑われた場合のみ都度再暗号化して差し替え） |
| D2 | ~~Xserverの契約プラン・予算の具体額（spec §10-2）~~ → **解決** | 既存契約のサブドメインで運用。新規契約・追加予算は不要 |
| D3 | ~~セッションの明示的なタイムアウト時間（spec §10-3）~~ → **解決** | 最終操作から**8時間**操作がない場合、自動的にログアウトする（多重ログイン防止とは別の無操作タイムアウトとして実装） |

> D1〜D3 はすべて確定済み。以降のフェーズ記述はこの確定値を前提に進める。

### エンジニアリング上の実装方針（spec には明記されていないが実装に必要な決定）

| # | 事項 | 方針 |
|---|---|---|
| E1 | Google認証の実装方法 | 外部ライブラリ（Composer等）に依存せず、cURLでGoogleのOpenID Connect discoveryエンドポイント／トークンエンドポイントを直接叩き、`id_token`（JWT）を検証する。検証項目：署名・`aud`・`hd`（`marketingdept-llc.com`）・有効期限 |
| E2 | ルーティング | ファイルベースルーティング（1画面＝1 PHPファイル、SPAではない）。§1のディレクトリ構成に準拠 |
| E3 | 暗号化実装 | PHPの `openssl_encrypt` / `openssl_decrypt`（AES-256-GCM）を `serverhub_app/crypto.php` に集約 |
| E4 | 共有パスワードのハッシュ化 | PHPの `password_hash()` / `password_verify()`（bcrypt）を使用 |
| E5 | ダブルクリック編集の自動保存 | 素のJS（`fetch`）で `api/save_field.php` へ非同期POSTし、フォーカスアウトで送信。ページ全体のリロードはしない |
| E6 | CSRF対策 | セッションに紐づくトークンをフォーム・fetchリクエストに含め、`serverhub_app/csrf.php` で共通検証 |

---

## 1. アーキテクチャ全体像

```
public/ (Xserverのドキュメントルート＝Webからアクセス可能)
├─ index.php                 # ログイン状態に応じて login.php or clients.php へ
├─ login.php                 # Googleログインへのリダイレクト
├─ oauth_callback.php        # トークン交換・hd検証・ユーザー自動作成・多重ログイン処理
├─ logout.php
├─ clients.php                # 2. 顧客一覧画面（検索フォーム含む）
├─ client_new.php             # 3. 顧客新規登録画面
├─ client_detail.php          # 4. 顧客詳細画面（?id=）
├─ site_detail.php            # 5. サイト詳細/編集画面（?id=、「共有」ボタン含む）
├─ sns_edit.php               # 6. SNS登録・編集画面（?id=）
├─ tools.php                  # 7. 社内共通ツール画面
├─ history.php                # 8. 編集履歴画面
├─ shares.php                 # 9. 共有管理画面（管理者/一般とも可）
├─ users.php                  # 10. ユーザー管理画面（管理者のみ）
├─ export.php                 # 11. エクスポート画面
├─ share_view.php             # 12. 共有閲覧画面（?token=、要パスワード、ログイン不要）
├─ api/                       # 非同期エンドポイント（fetchから叩く）
│  ├─ save_field.php          # ダブルクリック編集の自動保存
│  ├─ search.php              # 横断検索
│  ├─ delete.php / restore.php
│  ├─ share_create.php / share_revoke.php
│  └─ export_csv.php
├─ assets/
│  ├─ css/ (DESIGN_SYSTEM.md準拠)
│  └─ js/ (編集UI・検索UI等)
└─ .htaccess                  # api/以外への直叩き制御、セキュリティヘッダ等

serverhub_app/ (public_htmlと同階層。他アプリと共有される領域のため.htaccessで直接アクセスを拒否。§0参照)
├─ config.php                 # DB接続情報・暗号鍵（D1・Git管理外）
├─ db.php                     # PDO接続の共通初期化
├─ auth.php                   # セッションチェック・多重ログイン検証・ロール判定
├─ google_oauth.php           # E1: OIDC実装
├─ crypto.php                 # E3: 暗号化/復号ヘルパ
├─ editlog.php                # create/update/delete/restore/revoke を記録する共通関数
└─ csrf.php                   # E6: CSRFトークン発行・検証

serverhub_sql/
├─ schema.sql                 # spec §6 のテーブル定義一式
└─ seed.php                   # 開発用ダミーデータ投入（暗号化が必要なためSQLではなくPHP、顧客数件・サイト・社内共通ツール等）
```

### データフローの要点

- **一覧・詳細表示**：通常のPHPページ遷移（サーバーサイドでMySQLから取得しHTML生成）。
- **ダブルクリック編集の自動保存**：対象要素をダブルクリック→入力欄に切替→`blur`で `fetch('api/save_field.php')` にPOST→`serverhub_app/editlog.php` 経由で`edit_logs`に記録→成功時に表示をコミット（spec §4.3）。
- **検索**：フォーム送信（ボタン/Enter）で `api/search.php` またはページ本体がGETパラメータを受けてサーバーサイドで横断検索し、ヒット種別に応じて遷移先URLを決定（spec §4.2）。
- **外部共有閲覧**：`share_view.php?token=...` にアクセス→パスワード入力フォーム→`password_verify()`成功時のみ、`share_links.included_fields` に含まれるカテゴリだけを復号して表示（編集UIは出さない）。

---

## 2. 実装フェーズ（順序付き）

各フェーズは独立検証可能な単位。先頭ほど他に依存される基盤。

### Phase 0 — 基盤セットアップ
**ゴール**：Xserverのサブドメインにアクセスすると、DB接続済みの最小PHPページが表示される。
1. Xserverでサブドメインを作成する。ドキュメントルートはサブドメインのフォルダそのもの（`public_html/<サブドメイン>/`）で、`public/`のようなサブフォルダへのカスタマイズはできなかったため、`public/`の中身をこのフォルダ直下にそのままアップロードする（§0参照）。
2. MySQLデータベース・接続ユーザーを作成。
3. `serverhub_app/config.php`（`.gitignore`対象、`public_html`と同階層に配置）にDB接続情報・暗号鍵を用意。`serverhub_app/db.php` でPDO接続を共通化。
4. `.htaccess` で `serverhub_app/` `serverhub_sql/` `serverhub_scripts/` への直接アクセスを防止（これらはpublic_html配下の他アプリと共有される領域に置かれるため必須の対策）。
**完了条件**：`public/index.php` からDBへの疎通確認（例：`SELECT 1`）が通る。

### Phase 1 — デザインシステム移植
**ゴール**：`DESIGN_SYSTEM.md` と同じ見た目（サイドバー構成・配色・情報密度・角丸/シャドウ）の共通レイアウトが再現される。
1. `DESIGN_SYSTEM.md` のCSS変数・コンポーネントCSSを `public/assets/css/` にそのまま移植。
2. サイドバー＋メインエリアの共通レイアウトをPHPの `include`（`header.php` / `footer.php` 相当）としてテンプレート化。
3. サイドメニュー項目：顧客一覧・社内共通ツール・編集履歴・共有管理・ユーザー管理・エクスポート（spec §5）。
4. ロゴ文言・アクセントカラーは名刺ツールと同一のまま踏襲（spec §12で変更可としているが、差し当たり同一で進める。⚠️ブランドカラーを変える場合は本フェーズ内で確定）。
**完了条件**：空のページでも `DESIGN_SYSTEM.md` 記載のトーンで表示される。📌 受け入れ §12。

### Phase 2 — データ層（MySQL）
**ゴール**：spec §6準拠のスキーマが揃い、暗号化ヘルパが単体で正しく動く。
1. `serverhub_sql/schema.sql`：`users` / `clients` / `sites` / `sns_accounts` / `internal_tools` / `share_links` / `edit_logs` の全テーブルを作成。
2. インデックス：`clients(company_name)`、`sites(client_id)`、`sites(site_name)`、`sites(domain_registrar)`、`sns_accounts(client_id)`、`edit_logs(target_type, target_id)`、`share_links(token)` unique。
3. 各 `is_deleted` カラムに対応するインデックス（`is_deleted`込みの複合インデックスで一覧・検索クエリを高速化）。
4. `serverhub_app/crypto.php`（E3）：AES-256-GCMでの暗号化・復号関数を実装し、往復（暗号化→復号）が一致することを単体で確認。
5. `serverhub_app/editlog.php`：`edit_logs` への記録を1箇所に集約する共通関数（`logCreate` / `logUpdate` / `logDelete` / `logRestore` / `logRevoke`）を用意し、以降の全フェーズがこれを呼ぶ。
6. `serverhub_sql/seed.php`：開発用ダミーデータ（顧客数件・サイト・社内共通ツール等）。暗号化フィールドがあるため `serverhub_app/crypto.php` を使うPHPスクリプトとして実装（純粋なSQLではない）。
**完了条件**：`schema.sql` を流し込んで全テーブルが作成される。`crypto.php` の単体テストが通る。

### Phase 3 — 認証・セッション管理
**ゴール**：📌 許可ドメインのGoogleアカウントのみログインでき、多重ログインが防止される。
1. `serverhub_app/google_oauth.php`（E1）：Googleの認可エンドポイントへのリダイレクトURL生成、`oauth_callback.php` でのトークン交換・`id_token`検証（署名・`aud`・`hd=marketingdept-llc.com`・有効期限）。
2. 初回ログイン時、検証成功なら `users` にレコード自動作成（`role='general'`）。
3. **多重ログイン防止**：ログイン成功時に新しいセッショントークンを発行し `users.current_session_token` を上書き。`serverhub_app/auth.php` を全保護ページの先頭で呼び、CookieのトークンとDB値が一致しなければ強制ログアウト＋ログイン画面へリダイレクト。
4. **セッションタイムアウト（8時間）**：`users`（または別テーブル）に`last_activity_at`を持たせ、`serverhub_app/auth.php`の認証チェック時に毎回更新。最終操作から8時間経過していれば、多重ログイン判定とは別にセッションを無効化しログイン画面へリダイレクト。
5. `logout.php`：セッション破棄＋`current_session_token`をNULLに。
6. ロール判定（`general` / `admin`）をヘルパ関数化し、以降のフェーズで権限チェックに使う。
**完了条件**：許可ドメインはログイン後 `clients.php` に到達、非許可ドメインは拒否される。別端末で再ログインすると元のセッションが自動的に無効化される。8時間操作がないと自動ログアウトされる。📌 受け入れ §11。

### Phase 4 — 顧客/サイト/SNS管理（中心機能）
**ゴール**：📌 顧客・サイト・SNSの登録・編集・検索・削除が一通り動作し、ダブルクリック編集で自動保存される。
1. `clients.php`：顧客一覧＋検索フォーム（ボタン/Enter送信、spec §4.2）。
2. `client_new.php`：会社名＋任意で最初のサイト情報・SNS情報をまとめて入力（会社名のみでの登録も可）。
3. `client_detail.php`：会社名の直接編集（ダブルクリックUI）、サイト一覧、SNS一覧、追加導線。
4. `site_detail.php`：サーバー・ドメイン・FTP・MySQL・WordPress・備考の各項目をダブルクリック編集→`api/save_field.php`で自動保存（E5）。
5. `sns_edit.php`：サービス名・ログインID・パスワードの入力/編集。
6. `api/search.php`：会社名・サイト名・ドメイン・WordPressユーザー名・備考を横断検索し、会社名ヒットは顧客詳細へ、サイト名/ドメイン等のピンポイントヒットはサイト詳細へ直接遷移。
7. `api/delete.php`：管理者のみ実行可（`serverhub_app/auth.php`でロールチェック）、論理削除（`is_deleted=true`）＋`editlog.php`で記録。
**完了条件**：顧客・サイト・SNSの登録/編集/検索/削除が動作し、変更が`edit_logs`に記録される。一般ユーザーは削除操作ができない。

### Phase 5 — 社内共通ツール管理
**ゴール**：顧客情報とは独立した社内共通アカウント管理が動作する。
1. `tools.php`：AUN・Adobe等の一覧・追加・編集（ダブルクリックUI）・削除（論理削除、管理者のみ）。
**完了条件**：社内共通ツールのCRUDが顧客側と同じ編集UXで動作する。

### Phase 6 — 編集履歴・復元
**ゴール**：📌 変更履歴が閲覧でき、削除したデータが復元できる。
1. `history.php`：`edit_logs`を新しい順に一覧表示（対象種別・変更者・日時・変更前後の内容）。全ユーザーが閲覧可能。
2. 復元操作：論理削除されたレコードは `is_deleted=false` に戻す。フィールド単位の変更は `before_value` の内容に戻す（戻す操作自体も`action='restore'`として記録）。
**完了条件**：削除したデータが編集履歴画面から復元でき、一覧・検索に再度表示される。

### Phase 7 — 外部共有機能
**ゴール**：📌 サイト単位・項目選択で閲覧専用の共有リンクを発行・失効できる。
1. `site_detail.php` に「共有」ボタンを追加し、共有する項目（サーバー/ドメイン/FTP/MySQL/WordPress/備考）を選択するUI。
2. `api/share_create.php`：推測困難な`token`と複雑なパスワードを生成、パスワードは`password_hash()`（E4）でハッシュ化して`share_links`に保存。生成直後の画面でのみ平文パスワードを表示。
3. `share_view.php`：`token`でアクセス→パスワード入力フォーム→`password_verify()`成功時のみ、選択済みカテゴリの項目を復号して閲覧専用表示（編集UIなし）。
4. `shares.php`（共有管理画面）：全共有リンクの対象サイト・共有項目・発行者・発行日時・状態（有効/失効）を一覧表示し、個別に失効（`is_revoked=true`）できる。
5. 発行・失効操作は `editlog.php` 経由で `edit_logs`（`target_type='share_link'`）に記録。
**完了条件**：共有リンクを発行→正しいパスワードで選択項目のみ閲覧できる→失効後は同じリンクでアクセスできない。📌 受け入れ §11。

### Phase 8 — ユーザー管理・エクスポート・バックアップ・仕上げ
**ゴール**：📌 残りの受け入れ基準をすべて満たし、v1として完了する。
1. `users.php`（管理者のみ）：ユーザー一覧、ロール変更（一般⇔管理者）、削除。
2. `export.php` / `api/export_csv.php`：全データ（顧客・サイト・SNS・社内共通ツール）を「レコード種別」列を持つワイドフォーマットの1本のCSVに出力（spec §4.6）。
3. **バックアップ**：Xserverのcron機能等で`mysqldump`を日次実行するスクリプトを用意し、直近30世代を保持。加えて月初分を12ヶ月保持。ダンプはサーバー本体とは別の保存先（別ストレージ）にも転送する（spec §8）。
4. 初期セットアップ：社長のGoogleアカウントに対応する`users`レコードをリリース時点で`role='admin'`としてあらかじめ投入。
5. 最終確認：暗号化（DBに平文パスワードが存在しないこと）、想定規模（300社・数名〜10名の同時利用）でのパフォーマンス、PCブラウザでの表示崩れがないこと。
**完了条件**：spec §11の受け入れ基準を全項目チェック。

---

## 3. 受け入れ基準 ↔ フェーズ対応（spec §11）

| 受け入れ基準 | 担当フェーズ |
|---|---|
| Googleアカウント（ドメイン制限）でログイン、他ドメイン拒否 | Phase 3 |
| 別端末ログインで既存セッションが自動ログアウト | Phase 3 |
| 横断検索とヒット種別に応じた画面遷移 | Phase 4 |
| ダブルクリック編集→自動保存 | Phase 4・5 |
| 管理者のみ削除できる／一般ユーザーは削除不可 | Phase 4・5 |
| 削除データが編集履歴から復元できる | Phase 6 |
| 編集履歴に変更者・日時・変更前後が記録される | Phase 4〜7（`editlog.php`共通） |
| 全データが1本のCSVでエクスポートできる | Phase 8 |
| パスワード等がDBに平文で存在しない | Phase 2（暗号化）+ 全フェーズ |
| 日次バックアップ・30世代・月初12ヶ月保持 | Phase 8 |
| 共有リンク発行・パスワード照合・閲覧専用表示 | Phase 7 |
| 共有管理画面での一覧・失効 | Phase 7 |
| `DESIGN_SYSTEM.md` 準拠のUI | Phase 1（+全画面） |

---

## 4. v1スコープ境界（念押し）

**作らない**：スマホ対応（PCのみ）、リアルタイム/インクリメンタル検索、共有リンクの自動メール送信、共有リンク閲覧側のアクセスログ、アプリ独自の二段階認証、担当者⇔顧客の権限紐付け、共有リンクの有効期限。

---

## 5. リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| Xserverの共用プランで環境変数が使えない | D1の鍵管理方針が崩れる | public_htmlと同階層の設定ファイル方式＋.htaccessでのアクセス拒否（E1〜E6と同様、`serverhub_app/config.php`）を既定にし、環境変数前提の設計にしない |
| `config.php`等がWebから直接閲覧可能になる | 暗号鍵・DB接続情報の漏洩 | public_htmlと同階層（他アプリと共有される領域）に置かれるため、`.htaccess`のdeny-allで直接アクセスを拒否。Gitリポジトリ管理対象外にする |
| 論理削除の`is_deleted`条件をクエリで書き漏らす | 削除済みデータが一覧・検索・エクスポートに漏れる | DBアクセスを`serverhub_app/`層の共通関数経由にし、`is_deleted=false`条件を一箇所に集約 |
| 共有リンクのtokenが推測される | 機密情報の不正閲覧 | tokenを十分な長さのランダム値にし、必ずパスワードとセットで運用（token単体では閲覧不可）(spec §4.8) |
| 素のPHPでCSRF/XSS対策が漏れる | フォーム経由の不正操作、画面への不正スクリプト混入 | `serverhub_app/csrf.php`を全フォーム・fetch POSTで共通利用。出力時のエスケープ（`htmlspecialchars`）を徹底 |
| ダブルクリック編集の自動保存中にネットワークエラー | 入力内容が失われる/保存済みと誤認 | `api/save_field.php`のレスポンスを見て保存成功/失敗をUI上に明示し、失敗時は再入力を促す |

---

## 6. 進め方の指針

1. **Phase 0→1→2→3 を先に固める**（基盤・デザイン・データ・認証）。
2. **Phase 4（顧客/サイト/SNS管理）に最も時間を割く**（アプリの中心機能）。
3. Phase 7（外部共有）は機密情報の閲覧専用公開経路になるため、実装後にtoken/パスワードの組み合わせなしでのアクセス不可を必ず確認する。
4. 各フェーズ末で完了条件と対応する受け入れ基準を実機チェックしてから次へ進む。
5. D1〜D3は確定済み（§0）。以降、新たな⚠️が発生した場合は本書に追記して可視化し、対応するフェーズ着手前に確定させる。

> 次アクション候補：①Phase 0（サブドメイン・DB準備） → ②`serverhub_sql/schema.sql`の作成（Phase 2） → ③Google OAuth疎通確認（Phase 3）。
