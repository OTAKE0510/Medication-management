// --- リポジトリ (データ操作) ---
const MedicineRepository = {
    get: () => { try { return JSON.parse(localStorage.getItem("medicines")) || [] } catch (e) { return [] } },
    save: (data) => localStorage.setItem("medicines", JSON.stringify(data))
};
const HistoryRepository = {
    get: () => { try { return JSON.parse(localStorage.getItem("history")) || [] } catch (e) { return [] } },
    save: (data) => localStorage.setItem("history", JSON.stringify(data))
};
const PastMedicineRepository = {
    get: () => { try { return JSON.parse(localStorage.getItem("pastMedicines")) || [] } catch (e) { return [] } },
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
    const regularSection = document.getElementById('regular-section');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editIdInput = document.getElementById('edit-id');
    const stockInput = document.getElementById('stock');
    const startDateInput = document.getElementById('start-date');
    const durationInput = document.getElementById('duration');
    const endDateInput = document.getElementById('end-date');

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
    }

    // --- UI更新・計算関数 ---

    /** 現在の薬リストを描画 */
    function renderList() {
        list.innerHTML = "";
        medicines.forEach((item) => {
            const li = document.createElement("li");
            li.dataset.id = item.id;
            let scheduleText = (item.schedule || []).map(sch => `${sch.timing} ${sch.dosage}錠`).join(' / ');
            let actionButtons = '';

            if (item.isTonpuku) {
                actionButtons = `<button class="take-tonpuku-btn main-btn" data-id="${item.id}" ${item.stock <= 0 ? "disabled" : ""}>服用する</button>`;
            } else {
                actionButtons = (item.schedule || []).map(sch => `
                    <div class="daily-action">
                        <span>${sch.timing}:</span>
                        <button class="take-daily-btn sub-btn" data-id="${item.id}" data-timing="${sch.timing}">服用</button>
                        <button class="forgot-daily-btn sub-btn" data-id="${item.id}" data-timing="${sch.timing}">飲み忘れ</button>
                    </div>
                `).join("");
            }

            const periodText = item.startDate && item.endDate ? `${item.startDate.replace(/-/g, '/')} 〜 ${item.endDate.replace(/-/g, '/')}` : '';
            const notesText = item.notes ? `<p class="notes" style="font-size: 0.8em; color: #555; margin-top: 5px;">メモ: ${item.notes}</p>` : '';
            li.innerHTML = `
                <div>
                    <strong>${item.name}</strong><br>
                    在庫: ${item.stock}錠<br>
                    <small>${scheduleText}</small><br>
                    <small>${item.isTonpuku ? '頓服薬' : `服用期間: ${periodText}`}</small>
                    ${notesText}
                </div>
                <div class="actions">
                    ${actionButtons}
                    <hr style="margin: 8px 0; border: 1px solid #eee;">
                    <button class="edit-btn sub-btn" data-id="${item.id}">編集</button>
                    <button class="delete-btn sub-btn" data-id="${item.id}">服用終了</button>
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
                    <small>服用期間: ${periodText}</small>
                </div>
                <div class="actions">
                    <button class="delete-history-btn sub-btn" data-id="${item.id}">完全に削除</button>
                </div>
            `;
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
        
        updateFormUI();

        scheduleList.innerHTML = '';
        (med.schedule || []).forEach(sch => addScheduleRow(sch.timing, sch.dosage));
        
        if (!med.isTonpuku) {
            form['start-date'].value = med.startDate;
            if (med.startDate && med.endDate) {
                const start = new Date(med.startDate);
                const end = new Date(med.endDate);
                const duration = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
                form.duration.value = duration;
            } else {
                form.duration.value = '';
            }
        }
        
        calculateEndDateRealtime();
        cancelEditBtn.style.display = 'block';
        window.scrollTo(0, 0);
    }

     function addScheduleRow(timing = '', dosage = 1) { // 引数を直接の値に変更
        const row = document.createElement('div');
        row.className = 'schedule-row';
    
        row.innerHTML = `
            <input type="text" name="timing-text" placeholder="例：朝食後" required value="${timing}">
            <input type="number" name="dosage-amount" min="1" value="${dosage}" required style="width: 80px; flex: 0 1 auto;">
            <span>錠</span>
            <button type="button" class="remove-schedule-btn">×</button>
        `;
        scheduleList.appendChild(row);
        // 新しく追加した行の入力欄にも、リアルタイム計算用のイベントリスナーを設定
        row.querySelectorAll('input').forEach(input => input.addEventListener('input', calculateEndDateRealtime));
    }

    /** 終了日をリアルタイムで計算・表示する関数 */
    function calculateEndDateRealtime() {
        if (intervalTypeSelect.value === 'tonpuku') {
            endDateInput.value = "";
            return;
        }

        const totalStock = Number(stockInput.value);
        const startDateValue = startDateInput.value;
        const duration = Number(durationInput.value);
        let dailyDosage = 0;
        
        form.querySelectorAll('.schedule-row').forEach(row => {
            const dosage = row.querySelector('input[name="dosage-amount"]').value;
            dailyDosage += Number(dosage) || 0;
        });

        if (!startDateValue || dailyDosage <= 0) {
            endDateInput.value = "";
            return;
        }

        const startDate = new Date(startDateValue + 'T00:00:00');
        let endDate = new Date(startDate);
        
        if (duration > 0) {
            endDate.setDate(startDate.getDate() + duration - 1);
        } else if (totalStock > 0) {
            const durationFromStock = Math.floor(totalStock / dailyDosage);
            if (durationFromStock <= 0) {
                endDateInput.value = "";
                return;
            }
            endDate.setDate(startDate.getDate() + durationFromStock - 1);
        } else {
            endDateInput.value = "";
            return;
        }
        
        const year = endDate.getFullYear();
        const month = String(endDate.getMonth() + 1).padStart(2, '0');
        const day = String(endDate.getDate()).padStart(2, '0');
        
        endDateInput.value = `${year}-${month}-${day}`;
    }

    /** 服用間隔の変更でUIを切り替え */
    function updateFormUI() {
        const isTonpuku = intervalTypeSelect.value === 'tonpuku';
        regularSection.style.display = isTonpuku ? 'none' : 'block';
        startDateInput.required = !isTonpuku;
    }
    
    // --- イベントリスナー設定 ---
    intervalTypeSelect.addEventListener('change', updateFormUI);
    addScheduleBtn.addEventListener('click', addScheduleRow);

    scheduleList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-schedule-btn')) {
            e.target.closest('.schedule-row').remove();
            calculateEndDateRealtime();
        }
    });

    [stockInput, startDateInput, durationInput].forEach(input => {
        input.addEventListener('input', calculateEndDateRealtime);
    });

    // ★ 修正: listイベントリスナー全体を見直し
    list.addEventListener("click", (e) => {
        const target = e.target;
        const medicineId = target.dataset.id;
        if (!medicineId) return;

        const medIndex = medicines.findIndex(m => m.id === medicineId);
        if (medIndex === -1) return;
        
        let medicineDataChanged = false;
        let historyDataChanged = false;
        
        // --- アクションごとの処理 ---
        if (target.classList.contains("delete-btn")) {
            archiveMedicine(medicineId);
            medicineDataChanged = true;
        }
        
        else if (target.classList.contains("edit-btn")) {
            populateFormForEdit(medicineId);
        }
        
        else if (target.classList.contains("take-daily-btn")) {
            const timing = target.dataset.timing;
            const med = medicines[medIndex];
            const sch = med.schedule.find(s => s.timing === timing);
            if (sch) {
                med.stock = Math.max(0, med.stock - sch.dosage);
                history.push({ medicineId, date: new Date().toISOString(), dosage: sch.dosage, timing, status: 'taken' });
                medicineDataChanged = true;
                historyDataChanged = true;
                if (med.stock <= 0) {
                    archiveMedicine(medicineId);
                }
            }
        }
        
        else if (target.classList.contains("take-tonpuku-btn")) {
            const med = medicines[medIndex];
            const sch = med.schedule[0] || { timing: '症状時', dosage: 1 };
            med.stock = Math.max(0, med.stock - sch.dosage);
            history.push({ medicineId, date: new Date().toISOString(), dosage: sch.dosage, timing: sch.timing, status: 'taken' });
            medicineDataChanged = true;
            historyDataChanged = true;
            if (med.stock <= 0) {
                archiveMedicine(medicineId);
            }
        }
        
        else if (target.classList.contains("forgot-daily-btn")) {
            const timing = target.dataset.timing;
            const med = medicines[medIndex];
            const sch = med.schedule.find(s => s.timing === timing);
            if (sch) {
                history.push({ medicineId, date: new Date().toISOString(), dosage: sch.dosage, timing, status: 'forgotten' });
                historyDataChanged = true;
                
                const todayStr = new Date().toISOString().slice(0, 10);
                const forgottenCountToday = history.filter(h => h.medicineId === med.id && h.date.startsWith(todayStr) && h.status === 'forgotten').length;
                
                if (forgottenCountToday >= med.schedule.length && med.endDate) {
                    const currentEndDate = new Date(med.endDate + 'T00:00:00');
                    currentEndDate.setDate(currentEndDate.getDate() + 1);
                    
                    const year = currentEndDate.getFullYear();
                    const month = String(currentEndDate.getMonth() + 1).padStart(2, '0');
                    const day = String(currentEndDate.getDate()).padStart(2, '0');
                    med.endDate = `${year}-${month}-${day}`;
                    
                    medicineDataChanged = true;
                    alert(`「${med.name}」は1日分飲み忘れたため、終了日が1日延長されました。`);
                }
            }
        }

        // --- 変更があった場合のみ、保存と再描画を行う ---
        if (medicineDataChanged) {
            MedicineRepository.save(medicines);
            renderList();
            renderHistoryList();
        }
        if (historyDataChanged) {
            HistoryRepository.save(history);
        }
    });

    historyList.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-history-btn")) {
            const medicineId = e.target.dataset.id;
            const medicine = pastMedicines.find(m => m.id === medicineId);
            if (confirm(`「${medicine.name}」の履歴を完全に削除しますか？この操作は元に戻せません。`)) {
                pastMedicines = pastMedicines.filter(m => m.id !== medicineId);
                PastMedicineRepository.save(pastMedicines);
                renderHistoryList();
            }
        }
    });

    cancelEditBtn.addEventListener('click', () => {
        form.reset();
        editIdInput.value = '';
        cancelEditBtn.style.display = 'none';
        updateFormUI();
        scheduleList.innerHTML = "";
        addScheduleRow();
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const editId = editIdInput.value;
        const isTonpuku = intervalTypeSelect.value === 'tonpuku';
        const schedule = [];
        let dailyDosage = 0;

        form.querySelectorAll('.schedule-row').forEach(row => {
            const timing = row.querySelector('input[name="timing-text"]').value;
            const dosage = row.querySelector('input[name="dosage-amount"]').value;
            if (timing && dosage) {
                const dosageNum = Number(dosage);
                schedule.push({ timing, dosage: dosageNum });
                if (!isTonpuku) dailyDosage += dosageNum;
            }
        });

        if (schedule.length === 0) {
            alert("服用タイミングを少なくとも1つ入力してください。");
            return;
        }

        const totalStock = Number(stockInput.value);
        const duration = Number(durationInput.value);

        if (!isTonpuku && duration > 0 && dailyDosage > 0) {
            const requiredStock = dailyDosage * duration;
            if (totalStock < requiredStock) {
                alert(`在庫が不足しています。この期間には${requiredStock}錠必要ですが、在庫は${totalStock}錠です。`);
                return;
            }
        }
        
        calculateEndDateRealtime();
        const finalEndDate = endDateInput.value;

        const medicineData = {
            id: editId || Date.now().toString(),
            name: form.name.value,
            stock: totalStock,
            notes: form.notes.value,
            isTonpuku: isTonpuku,
            schedule: schedule,
            startDate: isTonpuku ? null : startDateInput.value,
            endDate: isTonpuku ? null : finalEndDate,
        };

        if (editId) {
            const index = medicines.findIndex(m => m.id === editId);
            medicines[index] = medicineData;
        } else {
            medicines.push(medicineData);
        }
        
        MedicineRepository.save(medicines);
        renderList();
        
        form.reset();
        editIdInput.value = '';
        cancelEditBtn.style.display = 'none';
        updateFormUI();
        scheduleList.innerHTML = "";
        addScheduleRow();
    });

    // --- 初期化処理 ---
    updateFormUI();
    addScheduleRow();
    renderList();
    renderHistoryList();
});
