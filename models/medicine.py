class Medicine:
    def __init__(self, name: str, category: str, dosage: str, frequency: str,
                 start_date, end_date, effect: str, side_effect: str, quantity: int):
        self.name = name
        self.category = category  # サプリ、処方薬、常備薬
        self.dosage = dosage
        self.frequency = frequency
        self.start_date = start_date
        self.end_date = end_date
        self.effect = effect
        self.side_effect = side_effect
        self.quantity = quantity

    def register(self):
        print(f"{self.name} を登録しました")

    def edit(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    def delete(self):
        print(f"{self.name} を削除しました")
