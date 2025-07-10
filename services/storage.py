class NotificationService:
    def send(self):
        print("リマインダーを送信しました")

    def check_delay(self):
        print("通知の遅延を確認中...")
class DataStorage:
    def __init__(self):
        self.offline_mode = True

    def save(self, data):
        print(f"{data} を保存しました")

    def load(self):
        print("データを読み込みました")

    def encrypt(self):
        print("データを暗号化しました")

    def decrypt(self):
        print("データを復号化しました")
