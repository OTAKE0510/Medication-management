# Medication-management

## 概要
Medication-managementは、服薬管理をサポートするシンプルなWebアプリです。複数の薬の在庫・服用スケジュール・飲み忘れ履歴などを記録・管理できます。

## 主な機能
- 薬の追加・編集・削除
- 服用タイミング（例：朝食後、夕食後など）の複数登録
- 在庫数・服用期間の自動計算
- 飲み忘れカウンターによる服用期間自動延長
- 頓服薬（必要時のみ服用）の管理
- 服用履歴・過去の薬の履歴管理

## 使い方
1. 「薬を追加」ボタンを押して、薬名・在庫数・服用タイミング・服用期間・メモなどを入力します。
    - 服用タイミングは「朝食後」「夕食後」など自由に追加できます。追加時は空欄で表示されるので、必要なタイミングを入力してください。
    - 服用タイミングは複数追加可能です。不要な行は「×」ボタンで削除できます。

2. 在庫数や服用期間を入力すると、1日分の服用量から自動的に期間や必要在庫数が計算されます。
    - 在庫が不足している場合は警告が表示されます。

3. 薬リストには、登録した薬の名前・在庫・服用タイミング・期間・メモが表示されます。
    - 「服用」ボタンを押すと、該当タイミング分の在庫が減り、履歴に記録されます。
    - 「飲み忘れ」ボタンを押すと、飲み忘れ履歴が記録され、累積で1日分忘れると服用期間が1日延長されます。

4. 編集したい場合は「編集」ボタンを押すと、フォームに内容が反映されます。修正後は「保存」で更新されます。

5. 服用が終了した薬は「服用終了」ボタンで過去の履歴に移動します。

6. 過去の薬履歴は「完全に削除」ボタンで削除できます（元に戻せません）。

7. 頓服薬（必要時のみ服用）は「頓服薬」として登録できます。服用時は「服用する」ボタンで在庫が減ります。

## データ保存について
本アプリのデータ（薬情報・履歴など）は、すべてご利用のブラウザの「ローカルストレージ」に保存されます。サーバーや外部サービスには送信されません。

- 薬の情報：localStorageの「medicines」キー
- 服用履歴：localStorageの「history」キー
- 過去の薬履歴：localStorageの「pastMedicines」キー

そのため、同じPC・同じブラウザでのみデータが保持されます。ブラウザのキャッシュクリアや別端末ではデータが消失しますのでご注意ください。

## ファイル構成
- `app.js` : メインロジック
- `index.html` : 画面UI
- `style.css` : スタイル
- `README.md` : この説明書

## ライセンス
MIT License

## 作者
3019　岡田健寿
