# 制作アプリリスト

制作済み・制作中・今後作りたいアプリをブラウザだけで管理するWebアプリです。

## 使い方

`index.html` をブラウザで開いてください。入力内容はブラウザの LocalStorage に保存されます。

## 主な機能

- アプリ情報の登録・編集・削除
- Firebase / Googleログインによるスマホ・PC間のリアルタイム同期
- 制作状況、ジャンル、優先度による絞り込み
- アプリ名、概要、備考のキーワード検索
- 更新日、作成日、優先度、制作状況、アプリ名での並び替え
- 状況別の件数表示
- CSVエクスポート
- 初回起動時のサンプルデータ
- スマートフォン、タブレット、PC対応

Firebaseを設定しない場合も、従来どおりLocalStorageだけで利用できます。

## スマホ・PC同期の設定

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成します。
2. 「プロジェクトの設定」からWebアプリを追加し、表示された設定値を `firebase-config.js` に入力します。
3. Authentication のログイン方法で「Google」を有効にします。
4. Firestore Databaseを作成します。リージョンは利用場所に近いものを選びます。
5. Firestoreの「ルール」に `firestore.rules` の内容を貼り付けて公開します。
6. Authenticationの「設定」→「承認済みドメイン」に `pimu0602.github.io` を追加します。
7. GitHub Pagesでアプリを公開し、スマホとPCで同じGoogleアカウントへログインします。

クラウド側が空の状態で最初にログインすると、その端末のLocalStorageデータをFirestoreへ移行します。以後の登録・編集・削除はリアルタイムで同期されます。
