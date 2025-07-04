from enum import Enum

from .MovieSource import MovieSource

class MovieProvider(Enum):
    KODI = "kodi"
    NETFLIX = "netflix"
#    AMAZON_FLATRATE = "amz_flat"
#    AMAZON_RENT = "amz_rent"


    def getSource(self) -> MovieSource:
        if self._name_ == 'NETFLIX':
            return MovieSource.TMDB
        return MovieSource.KODI

    def isExternal(self) -> bool:
        return self.getSource() != MovieSource.KODI


@staticmethod
def fromString(value: str) -> MovieProvider:
    if value is None:
        raise ValueError(f"{value} is not a valid value for MovieProvider")

    upper = value.upper()
    if upper in MovieProvider.__members__:
        try:
            return MovieProvider[upper]
        except: # this shouldnt happen, because we checked before
            raise ValueError(f"{value} is not a valid value for MovieProvider")

    lower = value.lower()
    for member in MovieProvider:
        if member.value == lower:
            return member
        
    raise ValueError(f"{value} is not a valid value for MovieProvider")