package com.taskmanagement;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

/**
 * HTTP リクエストの受付。
 *
 * @RestController が付いたクラスの戻り値は、Spring が自動で JSON に変換して返す。
 * ここでは Service だけを呼び、Repository には触らない。
 *
 * 仕様は docs/api-design.md を参照。
 */
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

	private final TaskService taskService;

	TaskController(TaskService taskService) {
		this.taskService = taskService;
	}

	/** GET /api/tasks — 全件 */
	@GetMapping
	public List<Task> getAll() {
		return taskService.findAll();
	}

	/**
	 * GET /api/tasks/{id} — 1件。
	 * 見つからない場合は本文なしの 404 を返す。存在しない ID を
	 * 空の JSON で返すと、呼び出し側が「無かった」と「空だった」を区別できない。
	 */
	@GetMapping("/{id}")
	public ResponseEntity<Task> getById(@PathVariable Long id) {
		return taskService.findById(id)
				.map(ResponseEntity::ok)
				.orElseGet(() -> ResponseEntity.notFound().build());
	}

	/**
	 * GET /api/tasks/status/{status} — 指定した status のものだけ。
	 * 該当が無い場合は空の配列を返す（404 にはしない。0件であることは正常な結果）。
	 */
	@GetMapping("/status/{status}")
	public List<Task> getByStatus(@PathVariable String status) {
		return taskService.findByStatus(status);
	}

	/**
	 * POST /api/tasks — 1件登録する。
	 *
	 * 成功したときは 200 ではなく 201 Created を返す。「要求を処理した」だけでなく
	 * 「新しいものが増えた」ことを状態コードで区別するため。
	 * 本文には作成された Task を返す。id と並び順はサーバー側が決めるので、
	 * 送った側は返ってきた本文を見るまでその値を知らない。
	 *
	 * @Valid が TaskCreateRequest の制約（タイトル必須など）を検査する。
	 * 引っかかると、このメソッドの中は一度も実行されないまま 400 が返る。
	 * データベースに触る前に弾かれるので、不正な行が残ることはない。
	 */
	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public Task create(@Valid @RequestBody TaskCreateRequest request) {
		return taskService.create(request);
	}

	/**
	 * PUT /api/tasks/{id} — 1件の内容を丸ごと書き換える（F-03 カードの編集）。
	 *
	 * PUT は「この URL の中身をこれにする」という意味の操作なので、送られてこなかった項目は
	 * 空になる。説明文を消したいときは null を送れば消える。
	 *
	 * 見つからなければ本文なしの 404。GET /api/tasks/{id} と同じ扱いにしてある。
	 * 「更新しようとしたが対象が無かった」を 200 で返すと、呼び出した側は
	 * 書き換わったものと勘違いする。
	 */
	@PutMapping("/{id}")
	public ResponseEntity<Task> update(@PathVariable Long id, @Valid @RequestBody TaskUpdateRequest request) {
		return taskService.update(id, request)
				.map(ResponseEntity::ok)
				.orElseGet(() -> ResponseEntity.notFound().build());
	}

	/**
	 * PATCH /api/tasks/{id}/status — 状態だけを変える（F-05 カードの移動）。
	 *
	 * PUT と違って、送るのは status ひとつだけ。カードを別の列にドラッグしたときに呼ばれる。
	 * 移動先での並び順はサーバーが決めるので、送る項目には入っていない。
	 *
	 * PUT ではなく PATCH なのは、書き換えるのが一部だけだからである。
	 * URL も /status を足して分けてある。同じ /api/tasks/{id} に PATCH を当てると
	 * 「一部だけ更新する汎用の入口」になり、何が送られてくるか呼ばれる側から分からなくなる。
	 */
	@PatchMapping("/{id}/status")
	public ResponseEntity<Task> updateStatus(@PathVariable Long id,
			@Valid @RequestBody TaskStatusUpdateRequest request) {
		return taskService.updateStatus(id, request.status())
				.map(ResponseEntity::ok)
				.orElseGet(() -> ResponseEntity.notFound().build());
	}

	/**
	 * DELETE /api/tasks/{id} — 1件を削除する（F-04 カードの削除）。
	 *
	 * 消せたときは本文の無い **204 No Content**。削除したあとに返す中身が存在しないためで、
	 * 200 に空の本文を付けるのではなく、本文が無いこと自体を状態コードに語らせる。
	 *
	 * 対象が無いときは **404**。PUT / PATCH と揃えてある。
	 *
	 * **ここは HTTP の一般的な流儀とは違う。** DELETE は何度呼んでも結果が同じ（冪等）なので、
	 * 既に無い場合も「結果として無いのだから成功」と見なして 204 を返す作りもある。
	 * それでも 404 にしたのは、画面側が 404 用の案内文を既に持っているからである
	 * （「この画面を開いたあとに、そのタスクが無くなった可能性があります」）。
	 * 別のブラウザで先に消されていた場合に、黙って成功として扱わずに済む。
	 */
	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(@PathVariable Long id) {
		return taskService.delete(id)
				? ResponseEntity.noContent().build()
				: ResponseEntity.notFound().build();
	}
}
