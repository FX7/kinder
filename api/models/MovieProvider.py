from enum import Enum

from .MovieMonetarization import MovieMonetarization

class MovieProvider(Enum):
    KODI = "kodi"
    EMBY = "emby"
    JELLYFIN = "jellyfin"
    NETFLIX = "netflix"
    AMAZON_PRIME = "amazon prime video"
    AMAZON_VIDEO = "amazon video"
    ARD_MEDIATHEK = "ard mediathek"
    ZDF = "zdf"
    DISNEY_PLUS = "disney plus"
    PARAMOUNT_PLUS = "paramount plus"
    APPLE_TV_PLUS = "apple tv+"

    def useTmdbAsSource(self) -> bool:
        return self != MovieProvider.KODI and self != MovieProvider.EMBY and self != MovieProvider.JELLYFIN
    
    def getMonetarization(self) -> MovieMonetarization:
        # KODI, EMBY, JELLYFIN are kind of free, but this mapping is just important for tmbd querys
        if self == MovieProvider.AMAZON_VIDEO:
            return MovieMonetarization.RENT
        elif self == MovieProvider.ARD_MEDIATHEK or self == MovieProvider.ZDF:
            return MovieMonetarization.FREE
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

@staticmethod
def providerToString(provider: MovieProvider) -> str:
    return provider.name.lower()


@staticmethod
def providerToDict(provider: MovieProvider):
    source = 'tmdb'
    if not provider.useTmdbAsSource():
        source = provider.name.lower()
    return {
        'name': provider.name.lower(),
        'source': source
    }