from enum import Enum

class DiscoverSortOrder(Enum):
    ASC = "asc"
    DESC = "desc"

@staticmethod
def fromString(value: str) -> DiscoverSortOrder:
    if value is None:
        raise ValueError(f"{value} is not a valid value for DiscoverSortOrder")

    upper = value.upper()
    if upper in DiscoverSortOrder.__members__:
        try:
            return DiscoverSortOrder[upper]
        except: # this shouldnt happen, because we checked before
            raise ValueError(f"{value} is not a valid value for DiscoverSortOrder")

    lower = value.lower()
    for member in DiscoverSortOrder:
        if member.value == lower:
            return member
        
    raise ValueError(f"{value} is not a valid value for DiscoverSortOrder")