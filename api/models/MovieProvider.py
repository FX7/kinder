from enum import Enum

class MovieProvider(Enum):
    KODI = "kodi"
    NETFLIX = "netflix"
    AMAZON_PRIME = "amazon prime video"
    AMAZON_VIDEO = "amazon video"
#    AMAZON_RENT = "amz_rent"

    def useTmdbAsSource(self) -> bool:
        return self != MovieProvider.KODI

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