from enum import Enum

from .MovieMonetarization import MovieMonetarization

class MovieProvider(Enum):
    KODI = "kodi"
    NETFLIX = "netflix"
    AMAZON_PRIME = "amazon prime video"
    AMAZON_VIDEO = "amazon video"
    DISNEY_PLUS = "disney plus"
    PARAMOUNT_PLUS = "paramount plus"

    def useTmdbAsSource(self) -> bool:
        return self != MovieProvider.KODI
    
    def getMonetarization(self) -> MovieMonetarization:
        if self == MovieProvider.AMAZON_VIDEO:
            return MovieMonetarization.RENT
        return MovieMonetarization.FLATRATE

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