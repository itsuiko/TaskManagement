package com.taskmanagement;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 中身は空でよい。
 * JpaRepository を継承しているので、保存・全件取得・ID検索・削除・件数といった操作は
 * Spring Data JPA が起動時に実装を生成して用意する。
 * 独自の検索条件が必要になったら、ここにメソッドを1行足す。
 */
public interface TaskRepository extends JpaRepository<Task, Long> {
}
