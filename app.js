// --- リポジトリ (データ操作) ---
const MedicineRepository = {
    get: () => JSON.parse(localStorage.getItem("medicines")) || [],
    save: (data) => localStorage.setItem("medicines", JSON.stringify(data))
};
// ★★★ 追加: 過去の薬用のリポジトリ ★★★
const PastMedicineRepository = {
    get: () => JSON.parse(localStorage.getItem("pastMedicines")) || [],
    save: (data) => localStorage.setItem("pastMedicines", JSON.stringify(data))
};


// --- アプリケーションのメイン処理 ---
document.addEventListener("DOMContentLoaded", () => {
    // --- 要素の取得 ---
    const form = document.getElementById("medicine-form");
    const list = document.getElementById("medicine-list");
    const historyList = document.getElementById("history-list"); // 履歴リストの要素を取得
    const scheduleList = document.getElementById('schedule-list');
    const addScheduleBtn = document.getElementById('add-schedule-btn');
    const intervalTypeSelect = document.getElementById('interval-type');
    const regularSection = document.getElementById('regular-section');
    const stockInput = document.getElementById('stock');
    const startDateInput = document.getElementById('start-date');
    const durationInput = document.getElementById('duration');
    const endDateInput = document.getElementById('end-date');

    // --- データの読み込み ---
    let medicines = MedicineRepository.get();
    let pastMedicines = PastMedicineRepository.get(); // 過去の薬データを読み込む

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
            const scheduleText = (item.schedule || []).map(sch => `${sch.timing} ${sch.dosage}錠`).join(' / ');
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
                    <button class="delete-btn sub-btn">削除</button>
                </div>
            `;
            list.appendChild(li);
        });
    }

    /** ★★★ 追加: 過去の薬リストを描画する関数 ★★★ */
    function renderHistoryList() {
        historyList.innerHTML = "";
        pastMedicines.forEach(item => {
            const li = document.createElement("li");
            const periodText = item.startDate && item.endDate 
                ? `${item.startDate.replace(/-/g, '/')} 〜 ${item.endDate.replace(/-/g, '/')}` 
                : '服用期間データなし';
            
            li.innerHTML = `
                <div>
                    <strong>${item.name}</strong><br>
                    <small>服用期間: ${periodText}</small>
                </div>
            `;
            historyList.appendChild(li);
        });
    }


    /** スケジュール入力行を1つ追加 */
    function addScheduleRow() {
        const row = document.createElement('div');
        row.className = 'schedule-row';
        row.innerHTML = `
            <input type="text" name="timing-text" placeholder="例：朝食後" required>
            <input type="number" name="dosage-amount" min="1" value="1" required style="width: 80px; flex: 0 1 auto;">
            <span>錠</span>
            <button type="button" class="remove-schedule-btn">×</button>
        `;
        scheduleList.appendChild(row);
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
    intervalTypeSelect.addEventListener('change', () => {
        updateFormUI();
        calculateEndDateRealtime();
    });

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

    list.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-btn")) {
            const li = e.target.closest("li");
            // 削除時に履歴へ移動させる
            archiveMedicine(li.dataset.id);
            renderList();
            renderHistoryList();
        }
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();

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

        const newMedicine = {
            id: Date.now().toString(),
            name: form.name.value,
            stock: totalStock,
            notes: form.notes.value,
            startDate: isTonpuku ? null : startDateInput.value,
            endDate: isTonpuku ? null : finalEndDate,
            isTonpuku: isTonpuku,
            schedule: schedule
        };

        medicines.push(newMedicine);
        MedicineRepository.save(medicines);

        renderList();
        form.reset();
        updateFormUI();
        scheduleList.innerHTML = "";
        addScheduleRow();
        endDateInput.value = "";
    });

    // --- 初期化処理 ---
    updateFormUI();
    addScheduleRow();
    renderList();
    renderHistoryList(); // ★★★ 追加: ページ読み込み時に履歴も描画
});