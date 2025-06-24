from enum import Enum

class MovieSource(Enum):
    KODI = "kodi"

@staticmethod
def fromString(value: str) -> MovieSource:
    if value is None or value.upper() not in MovieSource.__members__:
      raise ValueError(f"{value} is not a valid value for MovieSource")
    else:
        try:
            return MovieSource[value.upper()]
        except:
            raise ValueError(f"{value} is not a valid value for MovieSource")