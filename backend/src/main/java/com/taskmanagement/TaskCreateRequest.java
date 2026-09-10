package com.taskmanagement;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * POST /api/tasks が受け取る内容。
 *
 * Task をそのまま受け取らず、専用の型を用意している。Task で受けると
 * id / createdAt / updatedAt / sortOrder の入り口ができてしまい、
 * 「送られても無視する」コードを書いて防ぐことになる。
 * ここに書いていない項目は、そもそも送りつける先が無い。
 *
 * これらの値を誰が決めるかは次のとおり。
 * - id ......... データベース（自動採番）
 * - createdAt .. Hibernate（@CreationTimestamp）
 * - updatedAt .. Hibernate（@UpdateTimestamp）
 * - sortOrder .. TaskService（その列の末尾になるよう採番する）
 *
 * record は「値を持つだけの型」を1行で書くための仕組み。
 * フィールド・コンストラクタ・getter が自動で作られる。
 *
 * ■ メッセージを書いていない理由（実測にもとづく）
 *
 * 制約に message = "タイトルは必須です" のような文言を付けても、
 * **応答の本文には含まれない**。実際に返るのは次の形で、3種類のエラーが
 * すべて同じ本文になる（Spring Boot 4.1.1 の既定）。
 *
 *   {"timestamp":"...","status":400,"error":"Bad Request","path":"/api/tasks"}
 *
 * server.error.include-message=always を足しても変わらず、
 * spring.mvc.problemdetails.enabled=true にすると形は変わるが
 * detail は "Invalid request content." で、どの項目が悪いかは出ない。
 * 出ない文言をここに書くと「画面に届く」と誤解するので書かない。
 *
 * **画面に出す文言はフロント側が自前で持つ**（frontend/src/components/TaskCreateModal.tsx）。
 * 詳しくは docs/api-design.md 2.4。
 */
public record TaskCreateRequest(

		/** 必須。100文字まで（tasks.title は nullable = false, length = 100）。F-02。 */
		@NotBlank
		@Size(max = 100)
		String title,

		/** 任意。長さの制限なし（列は text 型）。 */
		String description,

		/** 任意。"2026-09-12" の形。時刻は持たない。形式が違えば Spring が読む前に弾く。 */
		LocalDate dueDate,

		/**
		 * 任意。@Pattern は値が null のときは検証しないので、未指定はそのまま通る。
		 * enum にしていないのは、データベースの列が文字列で、
		 * docs/data-design.md 4章も文字列として定義しているため。
		 */
		@Pattern(regexp = "high|medium|low")
		String priority,

		/**
		 * 未指定なら TaskService が todo にする。
		 *
		 * 値を制限しているのは、列が文字列なので "foo" でも保存できてしまうため。
		 * status が "foo" のタスクは画面の3列（未着手 / 作業中 / 完了）の
		 * どれにも現れず、登録できたのに二度と見えないカードになる。
		 */
		@Pattern(regexp = "todo|doing|done")
		String status) {
}
