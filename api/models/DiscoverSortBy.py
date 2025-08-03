from enum import Enum

class DiscoverSortBy(Enum):
    ORIGINAL_TITLE = "original_title"
    POPULARITY = "popularity"
    REVENUE = "revenue"
    PRIMARY_RELEASE_DATE = "primary_release_date"
    TITLE = "title"
    VOTE_AVERAGE = "vote_average"
    VOTE_COUNT = "vote_count"

@staticmethod
def fromString(value: str) -> DiscoverSortBy:
    if value is None:
        raise ValueError(f"{value} is not a valid value for DiscoverSortBy")

    upper = value.upper()
    if upper in DiscoverSortBy.__members__:
        try:
            return DiscoverSortBy[upper]
        except: # this shouldnt happen, because we checked before
            raise ValueError(f"{value} is not a valid value for DiscoverSortBy")

    lower = value.lower()
    for member in DiscoverSortBy:
        if member.value == lower:
            return member
        
    raise ValueError(f"{value} is not a valid value for DiscoverSortBy")