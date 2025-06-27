class GenreId:

    def __init__(self, name: str):
        self.id = hash(name.lower())
        self.name = name

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
        }

    def __repr__(self) -> str:
        return '<GenreId> : ' + str(self.id) + ' - ' + self.name

    def __str__(self) -> str:
        return str(self.id) + '-' + self.name

    def __eq__(self, other):
        if isinstance(other, GenreId):
            return self.id == other.id
        return False
    
    def __hash__(self):
        return self.id