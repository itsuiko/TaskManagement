package com.taskmanagement;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 業務上の処理を書く層。
 *
 * Controller がデータベースに直接触れる形にしないために挟んでいる。
 * 読み取りの3つは Repository の結果をそのまま返すだけだが、
 * 登録（create）には「その列の末尾に置く」「状態を省略されたら未着手にする」という
 * 判断が入っている。これが Controller に書かれていると、画面から呼ばれる経路以外
 * （バッチ処理など）から同じ判断を使えなくなる。
 */
@Service
public class TaskService {

	/** 状態を省略して登録されたときの既定値。Task.java のフィールド初期値と揃えてある。 */
	private static final String DEFAULT_STATUS = "todo";

	/** その列にまだ1件も無いときの sort_order。data.sql の並びに合わせて 0 ではなく 1 から始める。 */
	private static final int FIRST_SORT_ORDER = 1;

	private final TaskRepository taskRepository;

	TaskService(TaskRepository taskRepository) {
		this.taskRepository = taskRepository;
	}

	/** 全件。 */
	public List<Task> findAll() {
		return taskRepository.findAllByOrderByStatusAscSortOrderAsc();
	}

	/** ID で1件。見つからないことがあるので Optional で返し、404 にするかは Controller が決める。 */
	public Optional<Task> findById(Long id) {
		return taskRepository.findById(id);
	}

	/** 指定した status のものだけ。 */
	public List<Task> findByStatus(String status) {
		return taskRepository.findByStatusOrderBySortOrderAsc(status);
	}

	/**
	 * 新しいタスクを登録する。
	 *
	 * 受け取った内容に加えて、id はデータベースが、作成日時と更新日時は Hibernate が、
	 * 並び順はこのメソッドが決める。呼び出し側から渡せる値ではない。
	 *
	 * 「いまの最大値を読む」→「その次の番号で書く」の2手なので、間に別の登録が
	 * 割り込むと同じ番号が2枚に付く。利用者1名のアプリでまず起きないが、
	 * 2手をひとまとまりの処理として扱わせるために @Transactional を付けている。
	 */
	@Transactional
	public Task create(TaskCreateRequest request) {
		String status = request.status() != null ? request.status() : DEFAULT_STATUS;

		Task task = new Task();
		task.setTitle(request.title());
		task.setDescription(request.description());
		task.setDueDate(request.dueDate());
		task.setPriority(request.priority());
		task.setStatus(status);
		task.setSortOrder(nextSortOrder(status));

		return taskRepository.save(task);
	}

	/**
	 * 指定した列の末尾になる並び順を求める（F-02「作成されたカードはその列の末尾に追加される」）。
	 * その列がまだ空なら 1。
	 */
	private int nextSortOrder(String status) {
		return taskRepository.findFirstByStatusOrderBySortOrderDesc(status)
				.map(last -> last.getSortOrder() + 1)
				.orElse(FIRST_SORT_ORDER);
	}
}
