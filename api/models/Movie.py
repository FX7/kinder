import os
from typing import List

from .MovieProvider import MovieProvider
from api.models.MovieProvider import providerToDict
from .GenreId import GenreId
from .MovieId import MovieId

class Movie:
    def __init__(self, movie_id: MovieId, title: str, plot: str, year: int, genres: List[GenreId], runtime: int, age: int|None = None, playcount: int = -1) -> None:
        self.movie_id = movie_id
        self.title = title
        self.plot = plot
        self.year = year
        self.genres = genres
        self.runtime = runtime
        self.age = age
        self.playcount = playcount
        self.uniqueid = {}
        self.thumbnail_sources = []
        self.thumbnail = None
        self.provider = []
        self.original_title = None
        self.add_provider(movie_id.source.toMovieProvider())

    def set_original_title(self, original_title: str):
        self.original_title = original_title

    def add_providers(self, providers: List[MovieProvider]):
        for provider in providers:
            self.add_provider(provider)

    def add_provider(self, provider: MovieProvider|None):
        if provider is not None:
            self.provider.append(provider)

    def getFilteredProvider(self, wanted: List[MovieProvider]) -> List[MovieProvider]:
        if len(self.provider) <= 0:
            return []

        result = []
        for p in self.provider:
            if p in wanted:
                result.append(p)
        return result

    def set_tmdbid(self, tmdbid: int):
       self.uniqueid['tmdb'] = tmdbid

    def set_imdbid(self, imdbid: int): # TODO int richtig?
       self.uniqueid['imdb'] = imdbid

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
            "genres": self._genres_toJson(),
            "provider": self._providers_toJson(),
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
    
    def _genres_toJson(self):
        json = []
        for g in self.genres:
            json.append(g.to_dict())
        return json
    
    def _providers_toJson(self):
        json = []
        for p in self.provider:
            json.append(providerToDict(p))
        return json