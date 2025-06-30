import os
from typing import List
from api.models.GenreId import GenreId
from api.models.MovieId import MovieId

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
            self.overlay['genre'] = genre # TODO
        if _OVERLAY_WATCHED:
            self.overlay['watched'] = playcount
        if _OVERLAY_AGE:
            self.overlay['age'] = age
        self.thumbnail_src = []

    def set_tmbdid(self, tmbdid: int):
       self.uniqueid['tmdb'] = tmbdid

    def set_imdbid(self, imdbid: int): # TODO int richtig?
       self.uniqueid['imdb'] = imdbid

    def add_thumbnail_src(self, src: str):
        self.thumbnail_src.append(src)

    def set_thumbnail(self, thumbnail: str|None):
        self.thumbnail = thumbnail

    def to_dict(self):
        return {
            "movie_id": self.movie_id.to_dict(),
            "title": self.title,
            "plot": self.plot,
            "year": self.year,
            "genre": self.genre, # TODO
            "runtime": self.runtime,
            "age": self.age,
            "playcount": self.playcount,
            "uniqueid": self.uniqueid,
            "thumbnail": self.thumbnail,
            "overlay" : self.overlay
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