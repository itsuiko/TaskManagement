package com.taskmanagement;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * データベースとの境界。
 * JpaRepository を継承しているので、保存・全件取得・ID検索・削除・件数といった操作は
 * Spring Data JPA が起動時に実装を生成して用意する。findAll や findById を
 * ここに書いていないのに使えるのはそのため。
 *
 * 独自の並び順や検索条件が要るときだけ、メソッドの宣言を1行足す。
 * 実装は書かない。メソッド名を解析して SQL が組み立てられる。
 */
public interface TaskRepository extends JpaRepository<Task, Long> {

	/**
	 * 全件を status ごとにまとめ、同じ status の中では sort_order の昇順で返す。
	 * status は文字列なので並びはアルファベット順（doing → done → todo）になり、
	 * ボードの表示順（未着手 → 作業中 → 完了）とは一致しない。
	 * 画面側が status ごとに振り分けるため、ここでは揃えていない。
	 */
	List<Task> findAllByOrderByStatusAscSortOrderAsc();

	/** 指定した status のものだけを sort_order の昇順で返す。 */
	List<Task> findByStatusOrderBySortOrderAsc(String status);
}
