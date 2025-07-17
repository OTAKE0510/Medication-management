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
    const tonpukuSection = document.getElementById('tonpuku-section');
    const regularSection = document.getElementById('regular-section');

    // --- データの読み込み ---
    let medicines = MedicineRepository.get();

    // --- UI更新関数 ---

    /** 薬リストを描画 */
    function renderList() {
        list.innerHTML = "";
        medicines.forEach((item) => {
            const li = document.createElement("li");
            li.dataset.id = item.id;

            let scheduleText = '';
            if (item.isTonpuku) {
                scheduleText = `頓服薬 (1回 ${item.tonpukuDosage}錠)`;
            } else {
                scheduleText = (item.schedule || []).map(sch => `${sch.timing} ${sch.dosage}錠`).join(' / ');
            }

            const periodText = item.startDate && item.endDate ? `${item.startDate.replace(/-/g, '/')} 〜 ${item.endDate.replace(/-/g, '/')}` : '期間未設定';

            li.innerHTML = `
                <div>
                    <strong>${item.name}</strong><br>
                    在庫: ${item.stock}錠<br>
                    <small>${scheduleText}</small><br>
                    <small>${item.isTonpuku ? '' : `服用期間: ${periodText}`}</small>
                </div>
                <div class="actions">
                    <button class="delete-btn">削除</button>
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
    
    /** 服用間隔の変更でUIを切り替え */
    function updateFormUI() {
        const isTonpuku = intervalTypeSelect.value === 'tonpuku';
        tonpukuSection.style.display = isTonpuku ? 'block' : 'none';
        regularSection.style.display = isTonpuku ? 'none' : 'block';

        const startDateInput = document.getElementById('start-date');
        if (isTonpuku) {
            startDateInput.required = false;
        } else {
            startDateInput.required = true;
        }
    }

    // --- イベントリスナー設定 ---
    intervalTypeSelect.addEventListener('change', updateFormUI);
    addScheduleBtn.addEventListener('click', addScheduleRow);

    scheduleList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-schedule-btn')) {
            e.target.closest('.schedule-row').remove();
        }
    });

    list.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-btn")) {
            const li = e.target.closest("li");
            const medId = li.dataset.id;
            medicines = medicines.filter(m => m.id !== medId);
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

        // 終了日の自動計算 (毎日服用の場合のみ)
        if (!isTonpuku && dailyDosage > 0 && totalStock > 0 && startDateValue) {
            const durationInDays = Math.floor(totalStock / dailyDosage);
            const startDate = new Date(startDateValue + 'T00:00:00'); // タイムゾーン問題を避ける
            startDate.setDate(startDate.getDate() + durationInDays - 1);
            endDateValue = startDate.toISOString().slice(0, 10);
            form["end-date"].value = endDateValue; // フォームにも反映
        }

        const newMedicine = {
            id: Date.now().toString(),
            name: form.name.value,
            stock: totalStock,
            startDate: startDateValue,
            endDate: endDateValue,
            isTonpuku: isTonpuku,
            tonpukuDosage: isTonpuku ? Number(form['tonpuku-dosage'].value) : undefined,
            schedule: isTonpuku ? [] : schedule
        };

        medicines.push(newMedicine);
        MedicineRepository.save(medicines);

        renderList();
        form.reset();
        updateFormUI(); // フォームUIを初期状態に戻す
    });

    // --- 初期化処理 ---
    updateFormUI();
    addScheduleRow();
    renderList();
});