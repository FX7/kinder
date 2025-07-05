from enum import Enum

class MovieMonetarization(Enum):
    FLATRATE = "flatrate"
    RENT = "rent"
    BUY = "buy"

@staticmethod
def fromString(value: str) -> MovieMonetarization:
    if value is None:
        raise ValueError(f"{value} is not a valid value for MovieMonetarization")

    upper = value.upper()
    if upper in MovieMonetarization.__members__:
        try:
            return MovieMonetarization[upper]
        except: # this shouldnt happen, because we checked before
            raise ValueError(f"{value} is not a valid value for MovieMonetarization")

    lower = value.lower()
    for member in MovieMonetarization:
        if member.value == lower:
            return member
        
    raise ValueError(f"{value} is not a valid value for MovieMonetarization")