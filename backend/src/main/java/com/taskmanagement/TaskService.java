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
 *
 * 更新（update / updateStatus）にも「列をまたいだら並び順を採番し直す」という判断が入る。
 * 登録と更新で同じ規則（その列の末尾）を使うので、規則そのものは nextSortOrder に1つだけ置く。
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
	 * 内容を丸ごと書き換える（F-03 カードの編集）。
	 *
	 * 見つからないことがあるので Optional で返す。404 にするかどうかは HTTP の都合なので
	 * Controller に決めさせる（findById と同じ形）。
	 *
	 * 「読んでから書く」2手なので @Transactional を付けている（create と同じ理由）。
	 */
	@Transactional
	public Optional<Task> update(Long id, TaskUpdateRequest request) {
		return taskRepository.findById(id).map(task -> {
			task.setTitle(request.title());
			task.setDescription(request.description());
			task.setDueDate(request.dueDate());
			task.setPriority(request.priority());
			applyStatus(task, request.status());
			return taskRepository.save(task);
		});
	}

	/**
	 * 状態だけを変える（F-05 カードの移動）。カードを別の列にドラッグしたときに呼ばれる。
	 *
	 * update との違いは、書き換える項目が status ひとつだけであること。
	 * タイトルや期限は画面上の位置と関係がないので、送られてこないし触らない。
	 */
	@Transactional
	public Optional<Task> updateStatus(Long id, String status) {
		return taskRepository.findById(id).map(task -> {
			applyStatus(task, status);
			return taskRepository.save(task);
		});
	}

	/**
	 * 1件を削除する（F-04 カードの削除）。**行ごと消す物理削除**なので元には戻せない。
	 * なぜ消したことにする（論理削除）形を採らなかったかは docs/data-design.md 7章。
	 *
	 * 消せたら true、対象が無ければ false。204 と 404 のどちらを返すかは HTTP の都合なので
	 * Controller に決めさせる（findById と同じ形）。
	 *
	 * **先に existsById で確かめているのは、deleteById が「無かった」ことを教えてくれないため。**
	 * 実測（第14回）：存在しない id を deleteById に渡しても例外は飛ばず、何事もなかったように終わる。
	 * この確認を挟まないと、**消せた場合と元から無かった場合が呼び出し側から区別できない。**
	 *
	 * 「在るか調べる」→「消す」の2手なので @Transactional を付けている（create と同じ理由）。
	 *
	 * **sort_order の穴は詰めない。** 1・2・3 の真ん中を消すと 1・3 が残るが、画面は
	 * sort_order の昇順に並べるだけなので表示は変わらない（実測で確認済み）。詰め直すのは
	 * 列の中の複数件を書き換える操作で、F-06（同じ列の中での並び替え）と同じ形になる。
	 */
	@Transactional
	public boolean delete(Long id) {
		if (!taskRepository.existsById(id)) {
			return false;
		}
		taskRepository.deleteById(id);
		return true;
	}

	/**
	 * 状態を変え、変わった場合は並び順を移動先の列の末尾に採番し直す。
	 *
	 * sort_order は「同じ status の中での並び順」なので、列をまたぐと意味が変わる。
	 * 未着手で3番だったカードをそのまま作業中に移すと、作業中の3番の位置に割り込むことになり、
	 * 同じ番号のカードが2枚並ぶこともある。移動先の末尾に置き直すことでこれを避ける。
	 *
	 * **落とした位置は反映しない。** 列のどこにドロップしても末尾に入る。位置を反映するには
	 * 移動先の列の他のカードの並び順も詰め直す必要があり、それは F-06（同じ列の中での並び替え）の
	 * 仕事になる（docs/api-design.md 6章）。
	 *
	 * 状態が変わっていなければ何もしない。タイトルだけ直して保存するたびにカードが列の末尾へ
	 * 飛ぶと、直した本人が驚く。
	 */
	private void applyStatus(Task task, String status) {
		if (status.equals(task.getStatus())) {
			return;
		}
		// ⚠️ 採番を先に済ませてから status を書き換える。**この順番でなければ正しく採番されない。**
		//
		// 逆にすると、移動中のカード自身を「移動先の列にいるカード」として数えてしまう。
		// Hibernate は問い合わせの直前に、まだ書き込んでいない変更をデータベースへ送る
		// （自動フラッシュ）。status を先に書き換えると、その変更が送られた後で
		// nextSortOrder の検索が走るため、自分自身が移動先の列の最大値として返ってくる。
		//
		// 実測（第13回）：sort_order 3 の todo のカードを done へ PATCH したところ、
		// done には sort_order 1 のカードが1枚しかないのに **4** が付いた（3 + 1 = 自分 + 1）。
		// 並び順そのものは末尾で正しいが、番号が移動元から引き継がれ、列の中に穴が空く。
		int sortOrder = nextSortOrder(status);
		task.setStatus(status);
		task.setSortOrder(sortOrder);
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
