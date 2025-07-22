from .MovieSource import MovieSource

class MovieId:

    def __init__(self, source: MovieSource, id):
        self.source = source
        self.id = id

    def to_dict(self):
        return {
            "source": self.source.value,
            "id": self.id,
        }

    def __repr__(self) -> str:
        return '<MovieId> : ' + str(self.source.name) + '-' + str(self.id)

    def __str__(self) -> str:
        return str(self.source.name) + '-' + str(self.id)

    def __eq__(self, other):
        if isinstance(other, MovieId):
            return self.source == other.source and str(self.id) == str(other.id)
        return False
    
    def __hash__(self):
        return hash((self.source, str(self.id)))