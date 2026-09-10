package com.taskmanagement;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
}
