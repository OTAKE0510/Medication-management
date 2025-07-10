from models.user import User
from models.medicine import Medicine
from models.reminder import Reminder
from models.history import MedicationHistory
from services.notification_service import NotificationService
from services.storage import DataStorage

if __name__ == "__main__":
    user = User("太郎", "taro@example.com", "password123")
    user.login()

    med = Medicine("ビタミンC", "サプリ", "1錠", "毎日", "2025-07-01", "2025-07-31", "免疫強化", "なし", 30)
    med.register()

    reminder = Reminder("08:00", "毎日")
    reminder.notify()

    history = MedicationHistory("2025-07-10 08:01", True, "ビタミンC")
    history.record()

    storage = DataStorage()
    storage.save("サンプルデータ")
