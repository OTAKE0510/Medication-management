class Reminder:
    def __init__(self, time, interval: str, enabled: bool = True):
        self.time = time
        self.interval = interval
        self.enabled = enabled

    def notify(self):
        if self.enabled:
            print("通知送信中...")

    def set_schedule(self, time, interval):
        self.time = time
        self.interval = interval

    def snooze(self):
        print("スヌーズ設定中...")
