-- 動作確認用のテストデータ。
--
-- id は書かない。書くと自動採番のシーケンスとずれて、後から API 経由で登録したときに
-- 主キーの衝突が起きる。
--
-- created_at / updated_at / status は明示的に入れている。これらの既定値は
-- DB の DEFAULT 制約ではなくエンティティ側（Task.java）で与えているため、
-- SQL から直接 INSERT すると効かない。docs/data-design.md 3章に書いたとおり。

-- 先に全件消してから入れ直す。
-- spring.sql.init.mode=always はこのファイルを「起動のたびに実行する」設定であって、
-- 「起動のたびに初期化する」設定ではない。消す動きはどこにも入っていないため、
-- これを書かずに2回起動すると同じ6件がもう一度入って12件になる（実際に踏んだ）。
DELETE FROM tasks;

INSERT INTO tasks (title, description, due_date, priority, status, sort_order, created_at, updated_at) VALUES
('要件定義書を通しで読み直す', '5文書に分割したあと、記述の重複と矛盾がないか確認する', '2026-09-12', 'medium', 'todo',  1, now(), now()),
('カードの日付表示のズレを決着させる', '画面設計書の絵では 9-01、プロトタイプでは 2026/09/05。どちらが正か文書からは決められない', '2026-09-20', 'low',    'todo',  2, now(), now()),
('タイムゾーンの扱いを決める',       'created_at が UTC で保存され、アプリのログの JST と9時間ずれる', '2026-09-30', 'high',   'todo',  3, now(), now()),
('タスクの読み取り API を実装する',   'Controller / Service / Repository の3層に分けて GET を3本', '2026-09-07', 'high',   'doing', 1, now(), now()),
('GitHub の運用ルールを明文化する',   'CLAUDE.md とブランチ保護。Issue 駆動に切り替える',            '2026-09-07', 'medium', 'doing', 2, now(), now()),
('Docker で PostgreSQL を立てる',     'compose.yaml を書いて JPA から接続する',                      '2026-09-06', 'high',   'done',  1, now(), now());
