package com.taskmanagement;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * アプリが起動できることの確認。
 *
 * @ActiveProfiles("test") を付けると、application.properties に加えて
 * application-test.properties（src/test/resources）が読まれ、
 * そこに書いた項目だけが上書きされる。
 *
 * これが無いと、テストが本番と同じデータベースに繋いだまま data.sql を実行し、
 * DELETE FROM tasks で登録済みのタスクを消してしまう。
 */
@SpringBootTest
@ActiveProfiles("test")
class TaskManagementApplicationTests {

	@Test
	void contextLoads() {
	}

}
