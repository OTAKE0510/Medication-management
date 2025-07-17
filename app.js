// app.js (完成版)

// --- 定数定義 ---
const CATEGORY = ["サプリ", "処方薬", "常備薬", "頓服薬"];
const TIMING = ["朝食後", "昼食後", "夕食後", "晩", "食前", "食後", "毎食後", "就寝前", "症状時"];

// --- リポジトリ (データ操作) ---
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

// --- アプリケーションのメイン処理 ---
document.addEventListener("DOMContentLoaded", () => {
    // --- 要素の取得 ---
    const form = document.getElementById("medicine-form");
    const list = document.getElementById("medicine-list");
    const memoList = document.getElementById("condition-memo-list");
    const scheduleList = document.getElementById('schedule-list');
    const addScheduleBtn = document.getElementById('add-schedule-btn');
    const intervalTypeSelect = document.getElementById('interval-type');
    const tonpukuSection = document.getElementById('tonpuku-section');
    const scheduleSection = document.getElementById('schedule-section');


    // --- データの読み込み ---
    let medicines = MedicineRepository.get();
    let history = HistoryRepository.get();
    let conditionMemos = ConditionMemoRepository.get();

    // --- Service Worker & 通知 ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered:', reg))
            .catch(err => console.error('Service Worker registration failed:', err));
    }
    if ("Notification" in window) {
        Notification.requestPermission();
    }

    /**
     * Service Workerに通知予約を依頼する
     * @param {object} medicine - 薬オブジェクト
     * @param {object} schedule - スケジュールオブジェクト
     */
    function scheduleNextNotification(medicine, schedule) {
        if (!navigator.serviceWorker.controller) return;

        const [hh, mm] = schedule.notifyTime.split(":");
        let notifyDate = new Date();
        notifyDate.setHours(Number(hh), Number(mm), 0, 0);

        // すでに時刻を過ぎていたら明日の同じ時刻に設定
        if (notifyDate < new Date()) {
            notifyDate.setDate(notifyDate.getDate() + 1);
        }

        // 開始日・終了日を考慮
        const startDate = medicine.startDate ? new Date(medicine.startDate) : null;
        const endDate = medicine.endDate ? new Date(medicine.endDate) : null;
        if ((startDate && notifyDate < startDate) || (endDate && notifyDate > endDate)) {
            return; // 期間外なら通知しない
        }

        navigator.serviceWorker.controller.postMessage({
            type: "scheduleNotification",
            payload: {
                id: `${medicine.id}-${schedule.timing}-${schedule.notifyTime}`, // ユニークなID
                title: `服薬時間です！`,
                body: `「${medicine.name}」(${schedule.timing}) を ${schedule.dosage}錠 飲む時間です。`,
                time: notifyDate.getTime()
            }
        });
    }


    // --- UI更新関数 ---

    /** 在庫警告をチェックして通知 */
    function checkStockWarning(med) {
        if (med.stockWarningThreshold && med.stock <= med.stockWarningThreshold) {
            if (Notification.permission === "granted") {
                new Notification(`在庫警告: 「${med.name}」`, {
                    body: `残量が ${med.stock}錠 です。補充してください。`
                });
            }
        }
    }

    /** 指定した薬・タイミングで今日服用済みか判定 */
    function isTakenToday(medId, timing) {
        const todayStr = new Date().toISOString().slice(0, 10);
        return history.some(h => h.medicineId === medId && h.date.startsWith(todayStr) && h.timing === timing);
    }

    /** 薬リストを描画 */
    function renderList() {
        list.innerHTML = "";
        medicines.forEach((item) => {
            const li = document.createElement("li");
            li.dataset.id = item.id;

            let actionButtons = '';
            if (item.isTonpuku) {
                actionButtons = `<button class="take-btn">頓服薬を飲む</button>`;
            } else {
                actionButtons = (item.schedule || []).map((sch, idx) =>
                    `<button class="take-schedule-btn" data-timing="${sch.timing}" ${isTakenToday(item.id, sch.timing) ? "disabled" : ""}>
                        ${sch.timing}の分を服用
                    </button>`
                ).join(" ");
            }

            li.innerHTML = `
                <div>
                    <strong>${item.name}</strong> (${item.category})<br>
                    在庫: ${item.stock}錠<br>
                    <small>
                        ${item.isTonpuku
                            ? `頓服薬 (1回 ${item.tonpukuDosage}錠)`
                            : (item.schedule || []).map(sch => `${sch.timing} ${sch.dosage}錠`).join(' / ')
                        }
                    </small>
                </div>
                <div class="actions">
                    <button class="memo-btn">体調メモ</button>
                    ${actionButtons}
                    <button class="delete-btn">削除</button>
                </div>
            `;
            list.appendChild(li);
        });
    }

    /** 体調メモリストを描画 */
    function renderMemoList() {
        memoList.innerHTML = "";
        conditionMemos.forEach(memo => {
            const med = medicines.find(m => m.id === memo.medicineId);
            const li = document.createElement("li");
            li.innerHTML = `<strong>${med ? med.name : "(削除済み)"}</strong> [${memo.date}]<br>${memo.memo}`;
            memoList.appendChild(li);
        });
    }

    /** スケジュール入力行を1つ追加 */
    function addScheduleRow() {
        const row = document.createElement('div');
        row.className = 'schedule-row';
        row.innerHTML = `
            <input type="text" name="timing-text" placeholder="例：朝食後" required>
            <input type="number" name="dosage-amount" min="1" value="1" required> 錠
            <input type="time" name="notify-time" required>
            <button type="button" class="remove-schedule-btn">×</button>
        `;
        scheduleList.appendChild(row);
    }


    // --- イベントリスナー設定 ---

    /** 服用間隔の変更でUIを切り替え */
    intervalTypeSelect.addEventListener('change', () => {
        const isTonpuku = intervalTypeSelect.value === 'tonpuku';
        tonpukuSection.style.display = isTonpuku ? '' : 'none';
        scheduleSection.style.display = isTonpuku ? 'none' : '';
        scheduleList.innerHTML = ''; // 行をリセット
        if (!isTonpuku) {
            addScheduleRow(); // 頓服でなければ最初の行を追加
        }
    });

    /** [+]ボタンでスケジュール行を追加 */
    addScheduleBtn.addEventListener('click', addScheduleRow);

    /** [×]ボタンでスケジュール行を削除 */
    scheduleList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-schedule-btn')) {
            e.target.closest('.schedule-row').remove();
        }
    });

    /** 薬リスト内のボタンクリック処理 */
    list.addEventListener("click", (e) => {
        const li = e.target.closest("li");
        if (!li) return;

        const medId = li.dataset.id;
        const medIndex = medicines.findIndex(m => m.id === medId);
        if (medIndex === -1) return;
        const med = medicines[medIndex];

        // 削除ボタン
        if (e.target.classList.contains("delete-btn")) {
            medicines.splice(medIndex, 1);
            MedicineRepository.save(medicines);
            renderList();
        }

        // スケジュールごとの服用ボタン
        if (e.target.classList.contains("take-schedule-btn")) {
            const timing = e.target.dataset.timing;
            const sch = med.schedule.find(s => s.timing === timing);
            if (!sch) return;

            med.stock = Math.max(0, med.stock - sch.dosage);
            checkStockWarning(med);
            MedicineRepository.save(medicines);

            history.push({ medicineId: medId, date: new Date().toISOString(), dosage: sch.dosage, timing: sch.timing });
            HistoryRepository.save(history);
            renderList();
        }

        // 頓服薬の服用ボタン
        if (e.target.classList.contains("take-btn")) {
            med.stock = Math.max(0, med.stock - med.tonpukuDosage);
            checkStockWarning(med);
            MedicineRepository.save(medicines);

            history.push({ medicineId: medId, date: new Date().toISOString(), dosage: med.tonpukuDosage, timing: '症状時' });
            HistoryRepository.save(history);
            renderList();
        }

        // 体調メモボタン
        if (e.target.classList.contains("memo-btn")) {
            // ここに<dialog>を使ったメモ入力UIを実装
        }
    });

    /** 薬登録フォームの送信処理 */
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const isTonpuku = intervalTypeSelect.value === 'tonpuku';
        const schedule = [];
        if (!isTonpuku) {
            const scheduleRows = form.querySelectorAll('.schedule-row');
            scheduleRows.forEach(row => {
                const timing = row.querySelector('input[name="timing-text"]').value;
                const dosage = row.querySelector('input[name="dosage-amount"]').value;
                const notifyTime = row.querySelector('input[name="notify-time"]').value;
                if (timing && dosage && notifyTime) {
                    schedule.push({ timing, dosage: Number(dosage), notifyTime });
                }
            });
            if (schedule.length === 0) {
                alert("服用タイミングを少なくとも1つ入力してください。");
                return;
            }
        }

        const newMedicine = {
            id: Date.now().toString(),
            name: form.name.value,
            category: form.category.value,
            stock: Number(form.stock.value),
            stockWarningThreshold: Number(form.stockWarningThreshold.value),
            startDate: form["start-date"].value,
            endDate: form["end-date"].value,
            isTonpuku: isTonpuku,
            tonpukuDosage: isTonpuku ? Number(form['tonpuku-dosage'].value) : undefined,
            schedule: isTonpuku ? [] : schedule
        };

        medicines.push(newMedicine);
        MedicineRepository.save(medicines);

        // 頓服薬でなければ通知を予約
        if (!isTonpuku) {
            newMedicine.schedule.forEach(sch => {
                scheduleNextNotification(newMedicine, sch);
            });
        }

        renderList();
        form.reset();
        intervalTypeSelect.dispatchEvent(new Event('change')); // フォームUIを初期状態に戻す
    });


    // --- 初期化処理 ---
    intervalTypeSelect.dispatchEvent(new Event('change')); // 起動時にUIを正しく設定
    renderList();
    renderMemoList();
});