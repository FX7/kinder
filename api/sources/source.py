from abc import ABC, abstractmethod

from api.models.GenreId import GenreId
from api.models.Movie import Movie
from api.models.MovieId import MovieId
from api.models.db.VotingSession import VotingSession

class Source(ABC):

    @abstractmethod
    def isApiDisabled(self, forceReCheck = False) -> bool:
        pass

    @abstractmethod
    def getMovieIdByTitleYear(self, titles: set[str|None], year: int) -> int|str|None:
        pass

    @abstractmethod
    def getMovieById(self, id, language: str) -> Movie|None:
        pass

    @abstractmethod
    def listMovieIds(self, votingSession: VotingSession) -> list[MovieId]:
        pass

    @abstractmethod
    def listGenres(self, language: str) -> list[GenreId]:
        pass

    @staticmethod
    def apisDisabled(forceReCheck = False):
        for subclass in Source.__subclasses__():
            instance = subclass()
            instance.isApiDisabled(forceReCheck)