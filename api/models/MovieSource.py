from enum import Enum

class MovieSource(Enum):
    KODI = "kodi"
    TMDB = "tmdb"

@staticmethod
def fromString(value: str) -> MovieSource:
    if value is None:
        raise ValueError(f"{value} is not a valid value for MovieSource")

    upper = value.upper()
    if upper in MovieSource.__members__:
        try:
            return MovieSource[upper]
        except: # this shouldnt happen, because we checked before
            raise ValueError(f"{value} is not a valid value for MovieSource")

    lower = value.lower()
    for member in MovieSource:
        if member.value == lower:
            return member
        
    raise ValueError(f"{value} is not a valid value for MovieSource")