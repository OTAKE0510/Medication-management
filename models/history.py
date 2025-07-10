class MedicationHistory:
    def __init__(self, timestamp, taken: bool, medicine_name: str, note: str = ""):
        self.timestamp = timestamp
        self.taken = taken
        self.medicine_name = medicine_name
        self.note = note

    def record(self):
        print(f"{self.medicine_name} の服薬履歴を記録しました")

    def display(self):
        return {
            "日時": self.timestamp,
            "服薬済み": self.taken,
            "薬名": self.medicine_name,
            "メモ": self.note
        }
