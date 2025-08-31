from .MovieSource import MovieSource

class MovieId:

    def __init__(self, source: MovieSource, id, language: str):
        self.source = source
        self.id = id
        self.language = language

    def to_dict(self):
        return {
            "source": self.source.value,
            "id": self.id,
            "language": self.language
        }

    def __repr__(self) -> str:
        return '<MovieId> : ' + self.__str__()

    def __str__(self) -> str:
        return str(self.source.name) + ':' + str(self.id) + ':' + str(self.language)

    def __eq__(self, other):
        if isinstance(other, MovieId):
            return self.source == other.source and str(self.id) == str(other.id) and self.language == other.language
        return False
    
    def __hash__(self):
        return hash((self.source, str(self.id), self.language))