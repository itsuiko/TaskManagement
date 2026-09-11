package com.taskmanagement;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * PUT /api/tasks/{id} が受け取る内容。
 *
 * TaskCreateRequest とほとんど同じ形だが、**status が任意ではなく必須**な点だけ違う。
 *
 * 登録では status を省略でき、省略されたら TaskService が todo にする。これは
 * 「どの列に置くか指定されなかったら未着手から始める」という *登録時* の判断で、
 * 更新には当てはまらない。更新で省略を許すと、作業中のカードを保存しただけで
 * 未着手に戻る（あるいは戻さないための例外処理が要る）。
 * PUT は丸ごと置き換える操作なので、画面は常に現在の状態を送る。
 *
 * 送れない項目があるのは登録と同じ。id / createdAt / updatedAt / sortOrder は
 * 受け口そのものを用意していない。
 *
 * - id ......... 変えられない（URL の {id} で指すもの）
 * - createdAt .. 作成した時刻なので更新で動かない（@Column(updatable = false)）
 * - updatedAt .. Hibernate（@UpdateTimestamp）
 * - sortOrder .. TaskService（status が変わったときだけ採番し直す）
 *
 * メッセージを書いていない理由は TaskCreateRequest と同じ。400 の本文に
 * 文言は入らないので、画面に出す言葉はフロント側が自前で持つ。
 * 詳しくは docs/api-design.md 2.5。
 */
public record TaskUpdateRequest(

		/** 必須。100文字まで。F-03「タイトルを空にして保存しようとした場合は、保存せずにエラーを表示する」。 */
		@NotBlank
		@Size(max = 100)
		String title,

		/** 任意。消したいときは null を送る。 */
		String description,

		/** 任意。"2026-09-12" の形。 */
		LocalDate dueDate,

		/** 任意。@Pattern は null を検証しないので、未指定のままにもできる。 */
		@Pattern(regexp = "high|medium|low")
		String priority,

		/** 必須（上記の理由）。 */
		@NotBlank
		@Pattern(regexp = "todo|doing|done")
		String status) {
}
