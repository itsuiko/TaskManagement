package com.taskmanagement;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

/**
 * 業務上の処理を書く層。
 *
 * 今回は読み取りだけなので、Repository から受け取ったものをそのまま返すだけになり、
 * この層は実質何もしていない。それでも挟むのは、Controller がデータベースに
 * 直接触れる形にしないため。
 *
 * 「期限切れだけを抽出する」「完了したタスクを30日後に消す」のような判断が
 * 入ってきたときに書く場所がここになる。Controller に書くと、
 * 画面から呼ばれる経路以外（バッチ処理など）から同じ判断を使えなくなる。
 */
@Service
public class TaskService {

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
}
