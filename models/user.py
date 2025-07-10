class User:
    def __init__(self, name: str, email: str, password: str):
        self.name = name
        self.email = email
        self.password = password

    def login(self):
        print(f"{self.name} がログインしました")

    def logout(self):
        print(f"{self.name} がログアウトしました")

    def edit_profile(self, name: str = None, email: str = None):
        if name:
            self.name = name
        if email:
            self.email = email
