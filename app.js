    // 服用タイミング追加ボタンのイベントリスナー（index.htmlから移植）
    const scheduleList = document.getElementById('schedule-list');
    const addScheduleBtn = document.getElementById('add-schedule-btn');
    function addScheduleRow() {
        const isTonpuku = document.getElementById('interval-type')?.value === 'tonpuku';
        const row = document.createElement('div');
        row.className = 'schedule-row';
        row.innerHTML = `<input type="text" name="timing-text" placeholder="例：朝、昼、夕、晩、食前、食後など自由記入"><input type="number" name="dosage-amount" min="1" value="1" style="width:60px"> 錠 ${isTonpuku ? '' : '<input type="time" name="notify-time" min="00:00" max="23:59">'} <button type="button" class="remove-schedule-btn">削除</button>`;
        scheduleList.appendChild(row);
    }
    // interval-type変更時にタイミング行をリセットし、頓服薬なら時間入力欄を消す
    const intervalType = document.getElementById('interval-type');
    if (intervalType) {
        intervalType.addEventListener('change', function() {
            scheduleList.innerHTML = '';
            if (intervalType.value !== 'tonpuku') addScheduleRow();
        });
    }
    // 通知予約関数（Service Workerへメッセージ送信）
    function scheduleNextNotification(medicine, sch) {
        // 通知時刻（HH:mm）をDateオブジェクトに変換
        const today = new Date();
        const [hh, mm] = sch.notifyTime.split(":");
        let notifyDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), Number(hh), Number(mm), 0, 0);
        // 開始日・終了日チェック
        if (medicine.startDate) {
            const start = new Date(medicine.startDate);
            if (notifyDate < start) notifyDate = start;
        }
        if (medicine.endDate) {
            const end = new Date(medicine.endDate);
            if (notifyDate > end) return; // 終了日以降は通知しない
        }
        // 未来時刻のみ通知
        if (notifyDate.getTime() > Date.now()) {
            navigator.serviceWorker.controller.postMessage({
                type: "scheduleNotification",
                payload: {
                    title: `服薬リマインダー: ${medicine.name}`,
                    body: `${sch.timing}に${sch.dosage}錠を服用してください`,
                    time: notifyDate.getTime()
                }
            });
        }
    }
    if (addScheduleBtn) {
        addScheduleBtn.addEventListener('click', addScheduleRow);
    }
    scheduleList.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-schedule-btn')) {
            e.target.parentElement.remove();
        }
    });


// --- enum定義例 ---
const CATEGORY = ["サプリ", "処方薬", "常備薬", "頓服薬"];
const TIMING = ["朝食後", "昼食後", "夕食後", "晩", "食前", "食後", "毎食後", "就寝前", "症状時"];

// --- リポジトリ ---
const MedicineRepository = {
    get: () => JSON.parse(localStorage.getItem("medicines")) || [],
    save: (data) => localStorage.setItem("medicines", JSON.stringify(data))
};
const HistoryRepository = {
    get: () => JSON.parse(localStorage.getItem("history")) || [],
    save: (data) => localStorage.setItem("history", JSON.stringify(data))
};
const ConditionMemoRepository = {
    get: () => JSON.parse(localStorage.getItem("conditionMemos")) || [],
    save: (data) => localStorage.setItem("conditionMemos", JSON.stringify(data))
};

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("medicine-form");
    const list = document.getElementById("medicine-list");
    const memoForm = document.getElementById("condition-memo-form");
    const memoList = document.getElementById("condition-memo-list");

    let medicines = MedicineRepository.get();
    let history = HistoryRepository.get();
    let conditionMemos = ConditionMemoRepository.get();

    // 通知許可
    if ("Notification" in window) {
        Notification.requestPermission();
    }

    // 在庫警告
    function checkStockWarning(med) {
        if (med.stockWarningThreshold !== undefined && med.stock <= med.stockWarningThreshold) {
            if (Notification.permission === "granted") {
                new Notification(`「${med.name}」の在庫がまもなくなくなります`, {
                    body: `残量: ${med.stock}錠`
                });
            }
        }
    }

    // 今日服用済み判定（定期薬・タイミングごと）
    function isTakenToday(medId, timing) {
        const today = new Date().toISOString().slice(0, 10);
        return history.some(h => h.medicineId === medId && h.date.startsWith(today) && (!timing || h.timing === timing));
    }

    // リスト描画
    function renderList() {
        list.innerHTML = "";
        medicines.forEach((item) => {
            const li = document.createElement("li");
            li.dataset.id = item.id;
            let scheduleBtns = "";
            if (item.schedule && item.schedule.length > 0 && !item.isTonpuku) {
                scheduleBtns = item.schedule.map((sch, idx) => {
                    return `<button class="take-schedule-btn" data-idx="${idx}" ${isTakenToday(item.id, sch.timing) ? "disabled" : ""}>${sch.timing}の分を服用</button>`;
                }).join(" ");
            }
            li.innerHTML = `
                <div>
                    <strong>${item.name}</strong> (${item.category})<br>
                    総量: ${item.stock}錠<br>
                    ${item.startDate} 〜 ${item.endDate}<br>
                    ${item.notes ? item.notes + "<br>" : ""}
                    <small>服薬間隔: ${item.schedule?.map(sch => `${sch.timing}に${sch.dosage}錠`).join("・") || ""}</small><br>
                    <small>頓服: ${item.isTonpuku ? "○" : "×"}</small><br>
                    <small>在庫警告しきい値: ${item.stockWarningThreshold ?? "未設定"}</small><br>
                </div>
                <button class="delete-btn">削除</button>
                ${item.isTonpuku
                    ? `<button class="take-btn">頓服薬を飲む</button>`
                    : scheduleBtns}
                <button class="memo-btn">体調メモ追加</button>
            `;
            list.appendChild(li);
        });
    }

    // 体調メモ描画
    function renderMemoList() {
        memoList.innerHTML = "";
        conditionMemos.forEach(memo => {
            const med = medicines.find(m => m.id === memo.medicineId);
            const li = document.createElement("li");
            li.innerHTML = `<strong>${med ? med.name : "(削除済み)"}</strong> [${memo.date}]<br>${memo.memo}`;
            memoList.appendChild(li);
        });
    }

    // イベント委任
    list.addEventListener("click", (e) => {
        const li = e.target.closest("li");
        if (!li) return;
        const medId = li.dataset.id;
        const medIndex = medicines.findIndex(m => m.id === medId);
        const med = medicines[medIndex];

        if (e.target.classList.contains("delete-btn")) {
            medicines.splice(medIndex, 1);
            MedicineRepository.save(medicines);
            renderList();
        }
        // タイミングごとの服用ボタン
        if (e.target.classList.contains("take-schedule-btn") && !e.target.disabled) {
            const idx = Number(e.target.dataset.idx);
            const sch = med.schedule[idx];
            let takeDosage = sch.dosage || 1;
            med.stock = Math.max(0, (med.stock || 0) - takeDosage);
            checkStockWarning(med);
            MedicineRepository.save(medicines);
            history.push({
                medicineId: medId,
                date: new Date().toISOString(),
                dosage: takeDosage,
                timing: sch.timing
            });
            HistoryRepository.save(history);
            renderList();
            if (Notification.permission === "granted") {
                new Notification(`「${med.name}」${sch.timing}分を服用しました`, {
                    body: `記録日時: ${new Date().toLocaleString()} / 服用量: ${takeDosage}錠`
                });
            }
        }
        // 頓服薬ボタン
        if (e.target.classList.contains("take-btn") && !e.target.disabled) {
            let takeDosage = 1;
            if (med.schedule && med.schedule.length > 0 && !med.isTonpuku) {
                takeDosage = med.schedule[0].dosage || 1;
            }
            med.stock = Math.max(0, (med.stock || 0) - takeDosage);
            checkStockWarning(med);
            MedicineRepository.save(medicines);
            history.push({
                medicineId: medId,
                date: new Date().toISOString(),
                dosage: takeDosage
            });
            HistoryRepository.save(history);
            renderList();
            if (Notification.permission === "granted") {
                new Notification(`「${med.name}」を服用しました`, {
                    body: `記録日時: ${new Date().toLocaleString()} / 服用量: ${takeDosage}錠`
                });
            }
        }
        if (e.target.classList.contains("memo-btn")) {
            // dialog要素を使った体調メモ入力
            let dialog = document.getElementById("memo-dialog");
            if (!dialog) {
                dialog = document.createElement("dialog");
                dialog.id = "memo-dialog";
                dialog.innerHTML = `
                  <form method="dialog" id="memo-dialog-form">
                    <h3>体調・副作用メモ</h3>
                    <textarea id="memo-dialog-text" rows="4" style="width:100%" placeholder="体調・副作用などを記録してください"></textarea><br>
                    <button id="memo-dialog-save" type="submit">保存</button>
                    <button id="memo-dialog-cancel" type="button">キャンセル</button>
                  </form>
                `;
                document.body.appendChild(dialog);
            }
            dialog.showModal();
            const form = dialog.querySelector("#memo-dialog-form");
            const saveBtn = dialog.querySelector("#memo-dialog-save");
            const cancelBtn = dialog.querySelector("#memo-dialog-cancel");
            cancelBtn.onclick = () => dialog.close();
            form.onsubmit = (ev) => {
                ev.preventDefault();
                const memoText = dialog.querySelector("#memo-dialog-text").value.trim();
                if (memoText) {
                    conditionMemos.push({
                        id: Date.now().toString() + Math.random().toString(36).slice(2),
                        medicineId: medId,
                        date: new Date().toLocaleString(),
                        memo: memoText
                    });
                    ConditionMemoRepository.save(conditionMemos);
                    renderMemoList();
                }
                dialog.close();
            };
        }
    });

    // フォーム送信（新ロジック）
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const scheduleRows = form.querySelectorAll('.schedule-row');
        const schedule = [];
        let isScheduleValid = true;

        scheduleRows.forEach(row => {
            const timingInput = row.querySelector('input[name="timing-text"]');
            const dosageInput = row.querySelector('input[name="dosage-amount"]');
            const notifyTimeInput = row.querySelector('input[name="notify-time"]');
            const isTonpuku = form['interval-type'].value === 'tonpuku';
            // 必須項目が入力されているかチェック
            if (timingInput.value && dosageInput.value && (isTonpuku || notifyTimeInput?.value)) {
                const sch = {
                    timing: timingInput.value,
                    dosage: Number(dosageInput.value)
                };
                if (!isTonpuku) sch.notifyTime = notifyTimeInput.value;
                schedule.push(sch);
            } else if (!isTonpuku) {
                // 頓服でなければスケジュールは必須
                isScheduleValid = false;
            }
        });

        if (!isScheduleValid) {
            alert("すべての服用タイミング、服用量、通知時刻を入力してください。");
            return;
        }
        // isTonpukuの判定を`interval-type`から行う
        const isTonpuku = form['interval-type'].value === 'tonpuku';

        const medicine = {
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            name: form.name.value,
            category: form.category.value,
            startDate: form["start-date"]?.value || "",
            endDate: form["end-date"]?.value || "",
            notes: form.notes?.value || "",
            stock: Number(form.stock?.value || 0),
            stockWarningThreshold: Number(form.stockWarningThreshold?.value || 0),
            isTonpuku: isTonpuku,
            tonpukuDosage: isTonpuku ? Number(form['tonpuku-dosage']?.value || 1) : undefined,
            schedule: isTonpuku ? [] : schedule
        };

        medicines.push(medicine);
        MedicineRepository.save(medicines);

        // 通知をスケジュール（頓服薬の場合は通知しない）
        if (!isTonpuku && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
            schedule.forEach(sch => {
                scheduleNextNotification(medicine, sch);
            });
        }

        renderList();
        form.reset();
    });

    // 体調メモフォーム送信（もしフォームUIがある場合）
    if (memoForm) {
        memoForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const medId = memoForm.medicineId.value;
            const memoText = memoForm.memo.value;
            if (medId && memoText) {
                conditionMemos.push({
                    id: Date.now().toString() + Math.random().toString(36).slice(2),
                    medicineId: medId,
                    date: new Date().toLocaleString(),
                    memo: memoText
                });
                ConditionMemoRepository.save(conditionMemos);
                renderMemoList();
                memoForm.reset();
            }
        });
    }

    renderList();
    renderMemoList();
});
