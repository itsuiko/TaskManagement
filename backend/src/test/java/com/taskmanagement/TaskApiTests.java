package com.taskmanagement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * API の振る舞いの確認（第15回の品質チェックで追加）。
 *
 * それまで自動テストは「起動できるか」の1本だけで、API 7本の振る舞いは curl と画面で
 * 人が確かめていた。人が確かめたことは、次にコードを直したときにもう一度確かめないと
 * 分からない。ここに書いたものは gradlew test のたびに機械が確かめ直す。
 *
 * ■ @Transactional — テストが書いたものを毎回取り消す
 *
 * **テストは本番と同じ task_management データベースに繋いでいる**（docs/tech-stack.md 6章）。
 * 何もしなければ、テストが登録した行が画面に出てくる。テストクラスに @Transactional を付けると、
 * Spring が各テストの終わりに書き込みを全部取り消す（ロールバック）ので、行は残らない。
 * 取り消されないのは id の採番だけで、テストのたびに番号が進む（シーケンスは戻らない）。
 *
 * ■ 件数や番号を「いくつ」と決め打ちしない
 *
 * 同じ理由で、テーブルには利用者が登録したタスクが入っている。「todo は3件のはず」のような
 * 書き方をすると、タスクを1件足しただけでテストが落ちる。**直前の状態と比べて**確かめる。
 *
 * ■ MockMvc — サーバーを立てずに Controller を呼ぶ
 *
 * 実際の通信はしないが、URL の振り分け・JSON の読み取り・@Valid の検査・状態コードの決定は
 * 本物と同じ経路を通る。8080 を使わないので、bootRun を動かしたままでも実行できる。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TaskApiTests {

	/** 存在しないことが確実な id。 */
	private static final long MISSING_ID = 999_999_999L;

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private TaskRepository taskRepository;

	/** F-02「作成されたカードはその列の末尾に追加される」。 */
	@Test
	void postは201を返し列の末尾に置く() throws Exception {
		int lastBefore = lastSortOrder("doing");

		mockMvc.perform(post("/api/tasks")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"quality-check post\",\"status\":\"doing\"}"))
				.andExpect(status().isCreated());

		Task created = last("doing");
		assertThat(created.getTitle()).isEqualTo("quality-check post");
		assertThat(created.getSortOrder()).isEqualTo(lastBefore + 1);
	}

	/** 状態を省略したら未着手になる（TaskService の判断）。 */
	@Test
	void postで状態を省略すると未着手になる() throws Exception {
		mockMvc.perform(post("/api/tasks")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"quality-check default status\"}"))
				.andExpect(status().isCreated());

		assertThat(last("todo").getTitle()).isEqualTo("quality-check default status");
	}

	/** F-02「タイトルが空のまま作成しようとした場合は、作成せずにエラーを表示する」。 */
	@Test
	void postはタイトルが空なら400を返し何も登録しない() throws Exception {
		long countBefore = taskRepository.count();

		mockMvc.perform(post("/api/tasks")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"   \"}"))
				.andExpect(status().isBadRequest());

		assertThat(taskRepository.count()).isEqualTo(countBefore);
	}

	/** 3列のどれにも現れないカードを作らせない（TaskCreateRequest の @Pattern）。 */
	@Test
	void postは知らない状態なら400を返す() throws Exception {
		mockMvc.perform(post("/api/tasks")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"quality-check\",\"status\":\"foo\"}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void putは対象が無ければ404を返す() throws Exception {
		mockMvc.perform(put("/api/tasks/" + MISSING_ID)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"quality-check\",\"status\":\"todo\"}"))
				.andExpect(status().isNotFound());
	}

	/** 状態を変えずに内容だけ直したとき、カードが列の末尾へ飛ばないこと。 */
	@Test
	void putで状態が同じなら並び順は変わらない() throws Exception {
		Task task = createVia("todo");
		int sortOrderBefore = task.getSortOrder();

		mockMvc.perform(put("/api/tasks/" + task.getId())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"quality-check renamed\",\"status\":\"todo\"}"))
				.andExpect(status().isOk());

		Task updated = taskRepository.findById(task.getId()).orElseThrow();
		assertThat(updated.getTitle()).isEqualTo("quality-check renamed");
		assertThat(updated.getSortOrder()).isEqualTo(sortOrderBefore);
	}

	/**
	 * F-05 カードの移動。**移動先の末尾 = 移動先の最大値 + 1** になること。
	 *
	 * 第13回に実際に踏んだ誤りの再発防止。status を先に書き換えると、Hibernate の自動フラッシュで
	 * 移動中のカード自身が「移動先の最大値」として数えられ、番号が移動元から引き継がれた
	 * （done の最大が 1 なのに 2 ではなく 4 が付いた）。TaskService.applyStatus の順番を
	 * 入れ替えると、このテストが落ちる。
	 */
	@Test
	void patchは移動先の列の末尾に置く() throws Exception {
		// 移動元の番号を移動先より十分大きくしておく。誤った実装だとこの大きい番号が引き継がれる。
		createVia("todo");
		createVia("todo");
		Task task = createVia("todo");
		int lastOfDoneBefore = lastSortOrder("done");

		mockMvc.perform(patch("/api/tasks/" + task.getId() + "/status")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"status\":\"done\"}"))
				.andExpect(status().isOk());

		Task moved = taskRepository.findById(task.getId()).orElseThrow();
		assertThat(moved.getStatus()).isEqualTo("done");
		assertThat(moved.getSortOrder()).isEqualTo(lastOfDoneBefore + 1);
	}

	@Test
	void patchは対象が無ければ404を返す() throws Exception {
		mockMvc.perform(patch("/api/tasks/" + MISSING_ID + "/status")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"status\":\"done\"}"))
				.andExpect(status().isNotFound());
	}

	/**
	 * F-04 カードの削除。消せたら 204、同じ id にもう一度投げたら 404。
	 *
	 * deleteById は存在しない id を渡しても黙って終わる（第14回に実測）。TaskService が
	 * existsById を挟むのをやめると、2回目も 204 になってこのテストが落ちる。
	 */
	@Test
	void deleteは204を返し2回目は404を返す() throws Exception {
		Task task = createVia("todo");

		mockMvc.perform(delete("/api/tasks/" + task.getId()))
				.andExpect(status().isNoContent());
		assertThat(taskRepository.existsById(task.getId())).isFalse();

		mockMvc.perform(delete("/api/tasks/" + task.getId()))
				.andExpect(status().isNotFound());
	}

	/** API 経由で1件作り、作られたもの（その列の末尾）を返す。 */
	private Task createVia(String status) throws Exception {
		mockMvc.perform(post("/api/tasks")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"quality-check\",\"status\":\"" + status + "\"}"))
				.andExpect(status().isCreated());
		return last(status);
	}

	/** その列の末尾の1件。 */
	private Task last(String status) {
		return taskRepository.findFirstByStatusOrderBySortOrderDesc(status).orElseThrow();
	}

	/** その列の最大の並び順。空の列なら 0（次に入るカードが 1 になる）。 */
	private int lastSortOrder(String status) {
		return taskRepository.findFirstByStatusOrderBySortOrderDesc(status)
				.map(Task::getSortOrder)
				.orElse(0);
	}
}
