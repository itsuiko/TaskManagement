package com.taskmanagement;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * PATCH /api/tasks/{id}/status が受け取る内容。
 *
 * カードを別の列にドラッグしたときに送られる。**項目は status ひとつだけ。**
 *
 * 同じことは PUT でもできる（status を書き換えて全項目を送る）が、そうすると
 * カードを1枚動かすたびにタイトルも説明文も期限も一緒に送ることになる。
 * 画面上の位置が決めているのは status だけなので、送る先も status だけにしてある。
 *
 * 移動先での並び順（sortOrder）は送らない。TaskService が移動先の列の末尾に採番する。
 * 詳しくは docs/api-design.md 2.6。
 */
public record TaskStatusUpdateRequest(

		@NotBlank
		@Pattern(regexp = "todo|doing|done")
		String status) {
}
