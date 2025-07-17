// --- リポジトリ (データ操作) ---
const MedicineRepository = {
    get: () => JSON.parse(localStorage.getItem("medicines")) || [],
    save: (data) => localStorage.setItem("medicines", JSON.stringify(data))
};
const HistoryRepository = {
    get: () => JSON.parse(localStorage.getItem("history")) || [],
    save: (data) => localStorage.setItem("history", JSON.stringify(data))
};
const PastMedicineRepository = {
    get: () => JSON.parse(localStorage.getItem("pastMedicines")) || [],
    save: (data) => localStorage.setItem("pastMedicines", JSON.stringify(data))
};

// --- アプリケーションのメイン処理 ---
document.addEventListener("DOMContentLoaded", () => {
    // --- 要素の取得 ---
    const form = document.getElementById("medicine-form");
    const list = document.getElementById("medicine-list");
    const historyList = document.getElementById("history-list");
    const scheduleList = document.getElementById('schedule-list');
    const addScheduleBtn = document.getElementById('add-schedule-btn');
    const intervalTypeSelect = document.getElementById('interval-type');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editIdInput = document.getElementById('edit-id');

    // --- データの読み込み ---
    let medicines = MedicineRepository.get();
    let history = HistoryRepository.get();
    let pastMedicines = PastMedicineRepository.get();

    // --- ヘルパー関数 ---
    
    /** 薬を過去の履歴へ移動させる */
    function archiveMedicine(medicineId) {
        const medIndex = medicines.findIndex(m => m.id === medicineId);
        if (medIndex === -1) return;
        
        const [medicineToArchive] = medicines.splice(medIndex, 1);
        pastMedicines.push(medicineToArchive);

        MedicineRepository.save(medicines);
        PastMedicineRepository.save(pastMedicines);
    }

    // --- UI更新・計算関数 ---

    /** 現在の薬リストを描画 */
    function renderList() {
        list.innerHTML = "";
        medicines.forEach((item) => {
            const li = document.createElement("li");
            li.dataset.id = item.id;
            let scheduleText = '';
            let actionButtons = '';

            if (item.isTonpuku) {
                scheduleText = (item.schedule || []).map(sch => `${sch.timing} ${sch.dosage}錠`).join(' / ');
                actionButtons = `<button class="take-tonpuku-btn main-btn" data-id="${item.id}" ${item.stock <= 0 ? "disabled" : ""}>服用する</button>`;
            } else {
                scheduleText = (item.schedule || []).map(sch => `${sch.timing} ${sch.dosage}錠`).join(' / ');
                actionButtons = (item.schedule || []).map(sch => `
                    <div class="daily-action">
                        <span>${sch.timing}:</span>
                        <button class="take-daily-btn sub-btn" data-id="${item.id}" data-timing="${sch.timing}">服用</button>
                        <button class="forgot-daily-btn sub-btn" data-id="${item.id}" data-timing="${sch.timing}">飲み忘れ</button>
                    </div>
                `).join("");
            }

            const notesText = item.notes ? `<p class="notes" style="font-size: 0.8em; color: #555; margin-top: 5px;">メモ: ${item.notes}</p>` : '';
            li.innerHTML = `
                <div>
                    <strong>${item.name}</strong><br>
                    在庫: ${item.stock}錠<br>
                    <small>${scheduleText}</small>
                    ${notesText}
                </div>
                <div class="actions">
                    ${actionButtons}
                    <hr style="margin: 8px 0; border: 1px solid #eee;">
                    <button class="edit-btn sub-btn" data-id="${item.id}">編集</button>
                    <button class="delete-btn sub-btn" data-id="${item.id}">削除</button>
                </div>
            `;
            list.appendChild(li);
        });
    }

    /** 過去の薬リストを描画 */
    function renderHistoryList() {
        historyList.innerHTML = "";
        pastMedicines.forEach(item => {
            const li = document.createElement("li");
            const periodText = item.startDate && item.endDate ? `${item.startDate.replace(/-/g, '/')} 〜 ${item.endDate.replace(/-/g, '/')}` : '服用期間データなし';
            li.innerHTML = `
                <div>
                    <strong>${item.name}</strong><br>
                    <small>${periodText}</small>
                </div>`;
            historyList.appendChild(li);
        });
    }

    /** 編集のためにフォームに薬のデータを反映させる */
    function populateFormForEdit(medicineId) {
        const med = medicines.find(m => m.id === medicineId);
        if (!med) return;

        editIdInput.value = med.id;
        form.name.value = med.name;
        form.stock.value = med.stock;
        form.notes.value = med.notes;
        form['interval-type'].value = med.isTonpuku ? 'tonpuku' : 'day';
        
        scheduleList.innerHTML = '';
        (med.schedule || []).forEach(sch => addScheduleRow(sch));
        
        cancelEditBtn.style.display = 'block';
        window.scrollTo(0, 0); // ページ上部のフォームへスクロール
    }

    /** スケジュール入力行を1つ追加 */
    function addScheduleRow(scheduleData = { timing: '', dosage: 1 }) {
        const row = document.createElement('div');
        row.className = 'schedule-row';
        row.innerHTML = `
            <input type="text" name="timing-text" placeholder="例：朝食後" required value="${scheduleData.timing}">
            <input type="number" name="dosage-amount" min="1" value="${scheduleData.dosage}" required style="width: 80px; flex: 0 1 auto;">
            <span>錠</span>
            <button type="button" class="remove-schedule-btn">×</button>
        `;
        scheduleList.appendChild(row);
    }
    
    // --- イベントリスナー設定 ---
    addScheduleBtn.addEventListener('click', () => addScheduleRow());
    scheduleList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-schedule-btn')) {
            e.target.closest('.schedule-row').remove();
        }
    });

    list.addEventListener("click", (e) => {
        const target = e.target;
        const medicineId = target.dataset.id;
        if (!medicineId) return;

        // 削除ボタン
        if (target.classList.contains("delete-btn")) {
            archiveMedicine(medicineId);
            renderList();
            renderHistoryList();
        }

        // 編集ボタン
        if (target.classList.contains("edit-btn")) {
            populateFormForEdit(medicineId);
        }
        
        const medIndex = medicines.findIndex(m => m.id === medicineId);
        if (medIndex === -1) return;
        const med = medicines[medIndex];
        
        // 服用・飲み忘れ共通処理
        function handleDoseAction(timing, dosage, status) {
            if (status === 'taken') {
                med.stock = Math.max(0, med.stock - dosage);
            }
            history.push({ medicineId, date: new Date().toISOString(), dosage, timing, status });
            HistoryRepository.save(history);

            if (med.stock <= 0) {
                archiveMedicine(medicineId);
            } else {
                MedicineRepository.save(medicines);
            }
            renderList();
            renderHistoryList();
        }

        // 毎日の薬 - 服用
        if (target.classList.contains("take-daily-btn")) {
            const timing = target.dataset.timing;
            const sch = med.schedule.find(s => s.timing === timing);
            if(sch) handleDoseAction(timing, sch.dosage, 'taken');
        }
        
        // 毎日の薬 - 飲み忘れ
        if (target.classList.contains("forgot-daily-btn")) {
            const timing = target.dataset.timing;
            const sch = med.schedule.find(s => s.timing === timing);
            if(sch) handleDoseAction(timing, sch.dosage, 'forgotten');
            
            const todayStr = new Date().toISOString().slice(0, 10);
            const forgottenCountToday = history.filter(h => h.medicineId === med.id && h.date.startsWith(todayStr) && h.status === 'forgotten').length;
            
            if (forgottenCountToday >= med.schedule.length) {
                const currentEndDate = new Date(med.endDate + 'T00:00:00');
                currentEndDate.setDate(currentEndDate.getDate() + 1);
                med.endDate = currentEndDate.toISOString().slice(0, 10);
                MedicineRepository.save(medicines);
                renderList();
            }
        }
        
        // 頓服薬 - 服用
        if (target.classList.contains("take-tonpuku-btn")) {
            const sch = med.schedule[0] || { timing: '症状時', dosage: 1};
            handleDoseAction(sch.timing, sch.dosage, 'taken');
        }
    });

    cancelEditBtn.addEventListener('click', () => {
        form.reset();
        editIdInput.value = '';
        cancelEditBtn.style.display = 'none';
        scheduleList.innerHTML = "";
        addScheduleRow();
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const editId = editIdInput.value;
        const schedule = [];
        form.querySelectorAll('.schedule-row').forEach(row => {
            const timing = row.querySelector('input[name="timing-text"]').value;
            const dosage = row.querySelector('input[name="dosage-amount"]').value;
            if (timing && dosage) {
                schedule.push({ timing, dosage: Number(dosage) });
            }
        });

        const medicineData = {
            id: editId || Date.now().toString(),
            name: form.name.value,
            stock: Number(form.stock.value),
            notes: form.notes.value,
            isTonpuku: form['interval-type'].value === 'tonpuku',
            schedule: schedule,
        };

        if (editId) {
            const index = medicines.findIndex(m => m.id === editId);
            medicines[index] = { ...medicines[index], ...medicineData };
        } else {
            medicines.push(medicineData);
        }
        
        MedicineRepository.save(medicines);
        renderList();
        form.reset();
        editIdInput.value = '';
        cancelEditBtn.style.display = 'none';
        scheduleList.innerHTML = "";
        addScheduleRow();
    });

    // --- 初期化処理 ---
    addScheduleRow();
    renderList();
    renderHistoryList();
});