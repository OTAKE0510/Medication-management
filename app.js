// --- リポジトリ (データ操作) ---
const MedicineRepository = {
    get: () => JSON.parse(localStorage.getItem("medicines")) || [],
    save: (data) => localStorage.setItem("medicines", JSON.stringify(data))
};

// --- アプリケーションのメイン処理 ---
document.addEventListener("DOMContentLoaded", () => {
    // --- 要素の取得 ---
    const form = document.getElementById("medicine-form");
    const list = document.getElementById("medicine-list");
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

    // --- UI更新・計算関数 ---

    /** 薬リストを描画 */
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
        // 行が追加されたらリアルタイム計算を実行
        row.querySelectorAll('input').forEach(input => input.addEventListener('input', calculateEndDateRealtime));
    }
    
    /** 終了日をリアルタイムで計算・表示する関数 */
    function calculateEndDateRealtime() {
        const totalStock = Number(stockInput.value);
        const startDateValue = startDateInput.value;
        const duration = Number(durationInput.value);
        let dailyDosage = 0;
        
        form.querySelectorAll('.schedule-row').forEach(row => {
            const dosage = row.querySelector('input[name="dosage-amount"]').value;
            dailyDosage += Number(dosage) || 0;
        });

        if (intervalTypeSelect.value === 'tonpuku' || !startDateValue || dailyDosage <= 0) {
            endDateInput.value = "";
            return;
        }

        let endDate = new Date(startDateValue + 'T00:00:00');
        
        if (duration > 0) {
            // 期間指定がある場合
            endDate.setDate(endDate.getDate() + duration - 1);
        } else if (totalStock > 0) {
            // 在庫から計算する場合
            const durationFromStock = Math.floor(totalStock / dailyDosage);
            if (durationFromStock <= 0) {
                endDateInput.value = "";
                return;
            }
            endDate.setDate(endDate.getDate() + durationFromStock - 1);
        } else {
            endDateInput.value = "";
            return;
        }
        endDateInput.value = endDate.toISOString().slice(0, 10);
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
            calculateEndDateRealtime(); // 行が削除されたら再計算
        }
    });

    // リアルタイム計算用のイベントリスナー
    [stockInput, startDateInput, durationInput].forEach(input => {
        input.addEventListener('input', calculateEndDateRealtime);
    });

    list.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-btn")) {
            const li = e.target.closest("li");
            medicines = medicines.filter(m => m.id !== li.dataset.id);
            MedicineRepository.save(medicines);
            renderList();
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

        // 在庫チェック (期間指定がある場合のみ)
        if (!isTonpuku && duration > 0 && dailyDosage > 0) {
            const requiredStock = dailyDosage * duration;
            if (totalStock < requiredStock) {
                alert(`在庫が不足しています。この期間には${requiredStock}錠必要ですが、在庫は${totalStock}錠です。`);
                return;
            }
        }
        
        // 最終的な終了日を確定
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
        scheduleList.innerHTML = ""; // フォームのスケジュール行をクリア
        addScheduleRow(); // 最初の行を追加
        endDateInput.value = ""; // 終了日表示をクリア
    });

    // --- 初期化処理 ---
    updateFormUI();
    addScheduleRow();
    renderList();
});