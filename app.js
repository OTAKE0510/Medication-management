
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("medicine-form");
    const list = document.getElementById("medicine-list");

    // データ取得
    let medicines = JSON.parse(localStorage.getItem("medicines")) || [];
    let history = JSON.parse(localStorage.getItem("history")) || [];

    function saveMedicines() {
        localStorage.setItem("medicines", JSON.stringify(medicines));
    }
    function saveHistory() {
        localStorage.setItem("history", JSON.stringify(history));
    }

    // 通知許可
    if ("Notification" in window) {
        Notification.requestPermission();
    }

    // 今日服用済み判定
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
                    <strong>${item.name}</strong> (${item.category}) - ${item.dosage}単位<br>
                    ${item.startDate} 〜 ${item.endDate}<br>
                    ${item.notes ? item.notes + "<br>" : ""}
                    <small>服薬間隔: ${item.schedule?.intervalType === "day" ? `${item.schedule.dayInterval}日ごと` : ""}
                        ${item.schedule?.intervalType === "week" ? `${item.schedule.weekInterval}週間ごと (${item.schedule.weekdays?.join("・")})` : ""}
                        ${item.schedule?.intervalType === "month" ? `毎月${item.schedule.monthDay}日` : ""}
                        ${item.schedule?.intervalType === "year" ? `毎年${item.schedule.yearMonth}/${item.schedule.yearDay}` : ""}
                    </small><br>
                    <small>タイミング: ${item.schedule?.timing ? item.schedule.timing.join("・") : ""}</small><br>
                </div>
                <button class="delete-btn">削除</button>
                <button class="take-btn" ${isTakenToday(item.id) ? "disabled" : ""}>
                    ${isTakenToday(item.id) ? "服用済み" : "服用した"}
                </button>
            `;
            list.appendChild(li);
        });
    }

    // イベント委任
    list.addEventListener("click", (e) => {
        const li = e.target.closest("li");
        if (!li) return;
        const medId = li.dataset.id;
        const medIndex = medicines.findIndex(m => m.id === medId);

        if (e.target.classList.contains("delete-btn")) {
            medicines.splice(medIndex, 1);
            saveMedicines();
            renderList();
        }
        if (e.target.classList.contains("take-btn") && !e.target.disabled) {
            history.push({
                medicineId: medId,
                date: new Date().toISOString()
            });
            saveHistory();
            renderList();
            // Web通知
            if (Notification.permission === "granted") {
                new Notification(`「${medicines[medIndex].name}」を服用しました`, {
                    body: `記録日時: ${new Date().toLocaleString()}`
                });
            }
        }
    });

    // フォーム送信
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        // scheduleオブジェクトの構築例（必要に応じて拡張）
        const intervalType = form["interval-type"]?.value || "day";
        const schedule = {
            intervalType,
            dayInterval: intervalType === "day" ? Number(form["interval-day-count"]?.value || 1) : undefined,
            weekInterval: intervalType === "week" ? Number(form["interval-week-count"]?.value || 1) : undefined,
            weekdays: intervalType === "week" ? Array.from(form.querySelectorAll('input[name="weekday"]:checked')).map(cb => cb.value) : [],
            monthDay: intervalType === "month" ? Number(form["interval-month-day"]?.value || 1) : undefined,
            yearMonth: intervalType === "year" ? Number(form["interval-year-month"]?.value || 1) : undefined,
            yearDay: intervalType === "year" ? Number(form["interval-year-day"]?.value || 1) : undefined,
            timing: Array.from(form.querySelectorAll('input[name="timing"]:checked')).map(cb => cb.value)
        };

        const medicine = {
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            name: form.name.value,
            category: form.category.value,
            dosage: form.dosage.value,
            startDate: form["start-date"]?.value || "",
            endDate: form["end-date"]?.value || "",
            notes: form.notes?.value || "",
            schedule
        };
        medicines.push(medicine);
        saveMedicines();
        renderList();
        form.reset();
    });

    renderList();
});
