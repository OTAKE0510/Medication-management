// --- リポジトリ (データ操作) ---
const MedicineRepository = {
    get: () => JSON.parse(localStorage.getItem("medicines")) || [],
    save: (data) => localStorage.setItem("medicines", JSON.stringify(data))
};
const HistoryRepository = {
    get: () => JSON.parse(localStorage.getItem("history")) || [],
    save: (data) => localStorage.setItem("history", JSON.stringify(data))
};

// --- アプリケーションのメイン処理 ---
document.addEventListener("DOMContentLoaded", () => {
    // --- 要素の取得 ---
    const form = document.getElementById("medicine-form");
    const list = document.getElementById("medicine-list");
    const scheduleList = document.getElementById('schedule-list');
    const addScheduleBtn = document.getElementById('add-schedule-btn');
    const intervalTypeSelect = document.getElementById('interval-type');
    const tonpukuSection = document.getElementById('tonpuku-section');
    const regularSection = document.getElementById('regular-section');

    // --- データの読み込み ---
    let medicines = MedicineRepository.get();
    let history = HistoryRepository.get();

    // --- UI更新関数 ---

    /** 薬リストを描画 */
    function renderList() {
        list.innerHTML = "";
        medicines.forEach((item) => {
            const li = document.createElement("li");
            li.dataset.id = item.id;

            let scheduleText = '';
            let actionButtons = ''; // アクションボタンを初期化

            if (item.isTonpuku) {
                scheduleText = `頓服薬 (1回 ${item.tonpukuDosage}錠)`;
                // 頓服薬用の「服用」ボタンを追加
                actionButtons = `<button class="take-tonpuku-btn main-btn" ${item.stock <= 0 ? "disabled" : ""}>服用</button>`;
            } else {
                scheduleText = (item.schedule || []).map(sch => `${sch.timing} ${sch.dosage}錠`).join(' / ');
            }

            const periodText = item.startDate && item.endDate ? `${item.startDate.replace(/-/g, '/')} 〜 ${item.endDate.replace(/-/g, '/')}` : '期間未設定';
            const notesText = item.notes ? `<p class="notes" style="font-size: 0.8em; color: #555; margin-top: 5px;">メモ: ${item.notes}</p>` : '';

            li.innerHTML = `
                <div>
                    <strong>${item.name}</strong><br>
                    在庫: ${item.stock}錠<br>
                    <small>${scheduleText}</small><br>
                    <small>${item.isTonpuku ? '' : `服用期間: ${periodText}`}</small>
                    ${notesText}
                </div>
                <div class="actions" style="display:flex; flex-direction:column; gap: 5px;">
                    ${actionButtons}
                    <button class="delete-btn sub-btn">削除</button>
                </div>
            `;
            list.appendChild(li);
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
    }
    
    /** 服用間隔の変更でUIと入力必須項目を切り替え */
    function updateFormUI() {
        const isTonpuku = intervalTypeSelect.value === 'tonpuku';
        
        tonpukuSection.style.display = isTonpuku ? 'block' : 'none';
        regularSection.style.display = isTonpuku ? 'none' : 'block';

        document.getElementById('start-date').required = !isTonpuku;
        scheduleList.querySelectorAll('input').forEach(input => {
            input.required = !isTonpuku;
        });
    }

    // --- イベントリスナー設定 ---
    intervalTypeSelect.addEventListener('change', () => {
        updateFormUI();
        scheduleList.innerHTML = '';
        if (intervalTypeSelect.value !== 'tonpuku') {
            addScheduleRow();
        }
    });

    addScheduleBtn.addEventListener('click', addScheduleRow);

    scheduleList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-schedule-btn')) {
            e.target.closest('.schedule-row').remove();
        }
    });

    list.addEventListener("click", (e) => {
        const li = e.target.closest("li");
        if (!li) return;
        
        const medId = li.dataset.id;
        const medIndex = medicines.findIndex(m => m.id === medId);
        
        // 削除ボタンの処理
        if (e.target.classList.contains("delete-btn")) {
            medicines.splice(medIndex, 1);
            MedicineRepository.save(medicines);
            renderList();
        }

        // 頓服薬の「服用」ボタンの処理
        if (e.target.classList.contains("take-tonpuku-btn")) {
            if (medIndex === -1) return;
            const med = medicines[medIndex];

            // 1. 在庫を減らす
            med.stock = Math.max(0, med.stock - med.tonpukuDosage);
            
            // 2. 服用履歴を保存
            history.push({ 
                medicineId: medId, 
                date: new Date().toISOString(), 
                dosage: med.tonpukuDosage, 
                timing: '症状時' 
            });
            HistoryRepository.save(history);

            // 3. 在庫が0になったかチェック
            if (med.stock <= 0) {
                // 在庫が0なら薬のリストから削除
                medicines.splice(medIndex, 1);
            }
            
            // 4. 薬のリストを保存し、表示を更新
            MedicineRepository.save(medicines);
            renderList();
        }
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const isTonpuku = intervalTypeSelect.value === 'tonpuku';
        const schedule = [];
        let dailyDosage = 0;

        if (!isTonpuku) {
            const scheduleRows = form.querySelectorAll('.schedule-row');
            if (scheduleRows.length === 0) {
                alert("服用タイミングを少なくとも1つ入力してください。");
                return;
            }
            scheduleRows.forEach(row => {
                const timing = row.querySelector('input[name="timing-text"]').value;
                const dosage = row.querySelector('input[name="dosage-amount"]').value;
                if (timing && dosage) {
                    const dosageNum = Number(dosage);
                    schedule.push({ timing, dosage: dosageNum });
                    dailyDosage += dosageNum;
                }
            });
        }

        const totalStock = Number(form.stock.value);
        const startDateValue = form["start-date"].value;
        let endDateValue = "";

        if (!isTonpuku && dailyDosage > 0 && totalStock > 0 && startDateValue) {
            const durationInDays = Math.floor(totalStock / dailyDosage);
            const startDate = new Date(startDateValue + 'T00:00:00');
            startDate.setDate(startDate.getDate() + durationInDays - 1);
            endDateValue = startDate.toISOString().slice(0, 10);
            form["end-date"].value = endDateValue;
        }

        const newMedicine = {
            id: Date.now().toString(),
            name: form.name.value,
            stock: totalStock,
            notes: form.notes.value,
            startDate: isTonpuku ? null : startDateValue,
            endDate: isTonpuku ? null : endDateValue,
            isTonpuku: isTonpuku,
            tonpukuDosage: isTonpuku ? Number(form['tonpuku-dosage'].value) : undefined,
            schedule: isTonpuku ? [] : schedule
        };

        medicines.push(newMedicine);
        MedicineRepository.save(medicines);

        renderList();
        form.reset();
        updateFormUI();
        if (!isTonpuku) {
            addScheduleRow();
        }
    });

    // --- 初期化処理 ---
    updateFormUI();
    if (intervalTypeSelect.value !== 'tonpuku') {
        addScheduleRow();
    }
    renderList();
});