from abc import ABC, abstractmethod
from typing import List, Set

from api.models.GenreId import GenreId
from api.models.Movie import Movie
from api.models.MovieId import MovieId

class Source(ABC):

    @abstractmethod
    def isApiDisabled(self):
        pass

    @abstractmethod
    def getMovieIdByTitleYear(self, titles: Set[str|None], year: int) -> str|None:
        pass

    @abstractmethod
    def getMovieById(self, id) -> Movie|None:
        pass

    @abstractmethod
    def listMovieIds(self) -> List[MovieId]:
        pass

    @abstractmethod
    def listGenres(self) -> List[GenreId]:
        pass
