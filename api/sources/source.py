from abc import ABC, abstractmethod

from api.models.GenreId import GenreId
from api.models.Movie import Movie
from api.models.MovieId import MovieId

class Source(ABC):

    @abstractmethod
    def isApiDisabled(self):
        pass

    @abstractmethod
    def getMovieIdByTitleYear(self, titles: set[str|None], year: int) -> int|str|None:
        pass

    @abstractmethod
    def getMovieById(self, id) -> Movie|None:
        pass

    @abstractmethod
    def listMovieIds(self) -> list[MovieId]:
        pass

    @abstractmethod
    def listGenres(self) -> list[GenreId]:
        pass
