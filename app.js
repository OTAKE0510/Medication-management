

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

    // 今日服用済み判定（定期薬のみ）
    function isTakenToday(medId) {
        const today = new Date().toISOString().slice(0, 10);
        return history.some(h => h.medicineId === medId && h.date.startsWith(today));
    }

    // リスト描画
    function renderList() {
        list.innerHTML = "";
        medicines.forEach((item) => {
            const li = document.createElement("li");
            li.dataset.id = item.id;
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
                <button class="take-btn" ${item.isTonpuku ? "" : (isTakenToday(item.id) ? "disabled" : "")}>
                    ${item.isTonpuku ? "頓服薬を飲む" : (isTakenToday(item.id) ? "服用済み" : "服用した")}
                </button>
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
        if (e.target.classList.contains("take-btn") && !e.target.disabled) {
            // 服用量取得（定期薬は最初のスケジュール、頓服は1錠）
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
            // Web通知
            if (Notification.permission === "granted") {
                new Notification(`「${med.name}」を服用しました`, {
                    body: `記録日時: ${new Date().toLocaleString()} / 服用量: ${takeDosage}錠`
                });
            }
        }
        if (e.target.classList.contains("memo-btn")) {
            const memoText = prompt("体調・副作用などを記録してください");
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
        }
    });

    // フォーム送信
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        // 複数スケジュール対応例（UIに合わせて拡張）
        const schedule = [];
        TIMING.forEach(timing => {
            const timingChecked = form.querySelector(`input[name="timing"][value="${timing}"]`);
            if (timingChecked && timingChecked.checked) {
                const dosageInput = form.querySelector(`input[name="dosage-${timing}"]`);
                schedule.push({ timing, dosage: Number(dosageInput?.value || form.dosage.value || 1) });
            }
        });
        const medicine = {
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            name: form.name.value,
            category: form.category.value,
            startDate: form["start-date"]?.value || "",
            endDate: form["end-date"]?.value || "",
            notes: form.notes?.value || "",
            stock: Number(form.stock?.value || 0),
            stockWarningThreshold: Number(form.stockWarningThreshold?.value || 0),
            isTonpuku: !!form.isTonpuku?.checked,
            schedule
        };
        medicines.push(medicine);
        MedicineRepository.save(medicines);
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
