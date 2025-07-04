import os
from typing import List
from .MovieProvider import MovieProvider
from .GenreId import GenreId
from .MovieId import MovieId

_OVERLAY_TITLE = eval(os.environ.get('KT_OVERLAY_TITLE', 'True'))
_OVERLAY_RUNTIME = eval(os.environ.get('KT_OVERLAY_DURATION', 'False'))
_OVERLAY_GENRES = eval(os.environ.get('KT_OVERLAY_GENRES', 'True'))
_OVERLAY_WATCHED = eval(os.environ.get('KT_OVERLAY_WATCHED', 'False'))
_OVERLAY_AGE = eval(os.environ.get('KT_OVERLAY_AGE', 'False'))

class Movie:
    def __init__(self, movie_id: MovieId, title: str, plot: str, year: int, genre: List[GenreId], runtime: int, age: int|None = None, playcount: int = -1) -> None:
        self.movie_id = movie_id
        self.title = title
        self.plot = plot
        self.year = year
        self.genre = genre
        self.runtime = runtime
        self.age = age
        self.playcount = playcount
        self.uniqueid = {}
        self.overlay = {}
        if _OVERLAY_TITLE:
            self.overlay['title'] = title
        if _OVERLAY_RUNTIME:
            self.overlay['runtime'] = runtime
        if _OVERLAY_GENRES:
            self.overlay['genre'] = self._extract_genre_names()
        if _OVERLAY_WATCHED:
            self.overlay['watched'] = playcount
        if _OVERLAY_AGE:
            self.overlay['age'] = age
        self.thumbnail_src = {}
        self.thumbnail = None
        self.provider = []

    def add_providers(self, providers: List[MovieProvider]):
        for provider in providers:
            self.add_provider(provider)

    def add_provider(self, provider: MovieProvider):
        self.provider.append(provider)

    def set_tmdbid(self, tmdbid: int):
       self.uniqueid['tmdb'] = tmdbid

    def set_imdbid(self, imdbid: int): # TODO int richtig?
       self.uniqueid['imdb'] = imdbid

    def add_thumbnail_src(self, kind: str, src: str):
        self.thumbnail_src[kind] = src

    def set_thumbnail(self, thumbnail: str|None):
        self.thumbnail = thumbnail

    def to_dict(self):
        return {
            "movie_id": self.movie_id.to_dict(),
            "title": self.title,
            "plot": self.plot,
            "year": self.year,
            "runtime": self.runtime,
            "age": self.age,
            "playcount": self.playcount,
            "uniqueid": self.uniqueid,
            "thumbnail": self.thumbnail,
            "overlay" : self.overlay,
            "provider": self._extract_provider_names()
        }

    def __repr__(self) -> str:
        return '<Movie> : ' + self.__str__()

    def __str__(self) -> str:
        return str(self.movie_id) + ' : ' + self.title + ' (' + str(self.year) + ')'

    def __eq__(self, other):
        if isinstance(other, Movie):
            return self.movie_id == other.movie_id
        return False
    
    def __hash__(self):
        return self.movie_id.__hash__()
    
    def _extract_genre_names(self):
        names = []
        for g in self.genre:
            names.append(g.name)
        return names
    
    def _extract_provider_names(self):
        names = []
        for p in self.provider:
            names.append(p.name)
        return names