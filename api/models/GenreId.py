import hashlib
from typing import List

from .MovieSource import MovieSource

class GenreId:

    kodi_id = None
    tmdb_id = None
    emby_id = None
    jellyfin_id = None
    plex_id = None

    def __init__(
            self, name: str,
            kodi_id: int|None = None,
            tmdb_id: int|None = None,
            emby_id: int|None = None,
            jellyfin_id: str|None = None,
            plex_id: str|None = None):
        self.id = hashlib.sha1(name.strip().lower().encode()).hexdigest()
        self.name = name
        self.kodi_id = kodi_id
        self.tmdb_id = tmdb_id
        self.emby_id = emby_id
        self.jellyfin_id = jellyfin_id
        self.plex_id = plex_id

    def merge(self, other: 'GenreId'):
        if not self.__eq__(other):
            raise Exception(f"Tried to merge incompatible genre {self} with {other}!")
        if self.kodi_id is None and other.kodi_id is not None:
            self.kodi_id = other.kodi_id
        if self.tmdb_id is None and other.tmdb_id is not None:
            self.tmdb_id = other.tmdb_id
        if self.emby_id is None and other.emby_id is not None:
            self.emby_id = other.emby_id
        if self.jellyfin_id is None and other.jellyfin_id is not None:
            self.jellyfin_id = other.jellyfin_id
        if self.plex_id is None and other.plex_id is not None:
            self.plex_id = other.plex_id
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "kodi_id": self.kodi_id,
            "tmdb_id": self.tmdb_id,
            "emby_id": self.emby_id,
            "jellyfin_id": self.jellyfin_id,
            "plex_id": self.plex_id,
            "sources": self._ids_to_sources()
        }

    def _ids_to_sources(self) -> List[str]:
        sources = []
        if self.kodi_id is not None:
            sources.append(MovieSource.KODI.name.lower())
        if self.emby_id is not None:
            sources.append(MovieSource.EMBY.name.lower())
        if self.tmdb_id is not None:
            sources.append(MovieSource.TMDB.name.lower())
        if self.jellyfin_id is not None:
            sources.append(MovieSource.JELLYFIN.name.lower())
        if self.plex_id is not None:
            sources.append(MovieSource.PLEX.name.lower())
        return sources

    def __repr__(self) -> str:
        return '<GenreId> : ' + self.__str__()

    def __str__(self) -> str:
        base = str(self.id) + '-' + self.name
        if self.kodi_id is not None:
            base += ' k:' + str(self.kodi_id)
        if self.tmdb_id is not None:
            base += ' t:' + str(self.tmdb_id)
        if self.emby_id is not None:
            base += ' e:' + str(self.emby_id)
        if self.jellyfin_id is not None:
            base += ' j:' + str(self.jellyfin_id)
        if self.plex_id is not None:
            base += ' p:' + str(self.plex_id)
        return base

    def __eq__(self, other):
        if isinstance(other, GenreId):
            return self.id == other.id
        return False
    
    def __hash__(self):
        return self.id