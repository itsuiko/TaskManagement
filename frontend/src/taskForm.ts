import type { Priority } from './types'

/**
 * 作成・編集モーダルの入力欄が扱う値。画面の中だけで使う形なので、サーバーに送る形
 * （`TaskCreateInput` / `TaskUpdateInput`）とは別に持つ。
 *
 * **未入力は空文字で持つ。** `<input>` の値は空文字でしか「何も入っていない」を表せないため。
 * `null` に直すのは送る直前（`toRequestFields`）で、「空文字が入力された」と
 * 「入力されなかった」の区別はそこで付ける。
 */
export type TaskFormValues = {
  title: string
  description: string
  dueDate: string
  priority: Priority | ''
}

/**
 * 入力された値を、サーバーに送れる形に直す。
 *
 * **未入力は `null` で送る。** 空文字で送ると「空文字が入力された」ことになり、
 * 「入力されなかった」と区別がつかない。タイトルだけは前後の空白を落とす
 * （サーバー側の `@NotBlank` と揃えてある）。
 *
 * 作成と編集の両方から呼ぶ。1 か所に置いておかないと、「空文字か null か」の判断が
 * 2 か所に分かれて片方だけ直る。
 *
 * **入力欄（TaskFormFields.tsx）ではなくこのファイルに置いている。** コンポーネントを
 * 書き出すファイルから関数も書き出すと、開発中の画面の差し替え（Fast Refresh）が効かなくなり、
 * 1 文字直すたびに入力内容が消える。lint（oxlint の `react(only-export-components)`）が
 * 実際に警告した。
 */
export function toRequestFields(values: TaskFormValues) {
  return {
    title: values.title.trim(),
    description: values.description.trim() === '' ? null : values.description,
    dueDate: values.dueDate === '' ? null : values.dueDate,
    priority: values.priority === '' ? null : values.priority,
  }
}
