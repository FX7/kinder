import hashlib

class GenreId:

    kodi_id = None
    tmdb_id = None

    def __init__(self, name: str, kodi_id: int|None = None, tmdb_id: int|None = None):
        self.id = hashlib.sha1(name.strip().lower().encode()).hexdigest()
        self.name = name
        self.kodi_id = kodi_id
        self.tmdb_id = tmdb_id

    def merge(self, other: 'GenreId'):
        if not self.__eq__(other):
            raise Exception(f"Tried to merge incompatible genre {self} with {other}!")
        if self.kodi_id is None and other.kodi_id is not None:
            self.kodi_id = other.kodi_id
        if self.tmdb_id is None and other.tmdb_id is not None:
            self.tmdb_id = other.tmdb_id
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "kodi_id": self.kodi_id,
            "tmdb_id": self.tmdb_id
        }

    def __repr__(self) -> str:
        return '<GenreId> : ' + self.__str__()

    def __str__(self) -> str:
        base = str(self.id) + '-' + self.name
        if self.kodi_id is not None:
            base += ' k:' + str(self.kodi_id)
        if self.tmdb_id is not None:
            base += ' t:' + str(self.tmdb_id)
        return base

    def __eq__(self, other):
        if isinstance(other, GenreId):
            return self.id == other.id
        return False
    
    def __hash__(self):
        return self.id