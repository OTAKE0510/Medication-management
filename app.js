document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("medicine-form");
    const list = document.getElementById("medicine-list");

    // ローカルストレージから読み込む
    let medicines = JSON.parse(localStorage.getItem("medicines")) || [];

    function saveData() {
        localStorage.setItem("medicines", JSON.stringify(medicines));
    }

    function renderList() {
        list.innerHTML = "";
        medicines.forEach((item, index) => {
            const li = document.createElement("li");
            li.innerHTML = `
                <div>
                    <strong>${item.name}</strong> (${item.category}) - ${item.dosage}単位<br>
                    ${item.startDate} 〜 ${item.endDate}<br>
                    ${item.notes}<br>
                    通知時間：${item.time}
                </div>
                <button onclick="deleteMedicine(${index})">削除</button>
            `;
            list.appendChild(li);
        });
    }

    window.deleteMedicine = function(index) {
        medicines.splice(index, 1);
        saveData();
        renderList();
    }

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const medicine = {
            name: form.name.value,
            category: form.category.value,
            dosage: form.dosage.value,
            startDate: form["start-date"].value,
            endDate: form["end-date"].value,
            notes: form.notes.value,
            time: form.time.value
        };
        medicines.push(medicine);
        saveData();
        renderList();
        form.reset();
    });

    renderList();

    // 通知機能（簡易版）
    setInterval(() => {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        medicines.forEach(med => {
            if (med.time === currentTime) {
                alert(`「${med.name}」の服薬時間です！`);
            }
        });
    }, 60000); // 毎分チェック
});
