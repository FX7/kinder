from datetime import date
import logging
#import math

from api.database import db
from api.models.DiscoverSortBy import DiscoverSortBy
from api.models.DiscoverSortOrder import DiscoverSortOrder
#from api.models.TMDBChunk import TMDBChunk

logger = logging.getLogger(__name__)

class TMDBDiscover(db.Model):
    __tablename__ = 'tmdb_discover'

    id: int  = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sort_by: DiscoverSortBy = db.Column(db.Enum(DiscoverSortBy), nullable=False)
    sort_order: DiscoverSortOrder = db.Column(db.Enum(DiscoverSortOrder), nullable=False)
    vote_average: float|None = db.Column(db.Float, nullable=True)
    vote_count: int|None = db.Column(db.Integer, nullable=True)
    total: int = db.Column(db.Integer, nullable=False)
    region: str|None = db.Column(db.String(10), nullable=True)
    language: str|None = db.Column(db.String(10), nullable=True)

    def __init__(self, sort_by: DiscoverSortBy, sort_order: DiscoverSortOrder, vote_average: float|None, vote_count: int|None, total: int, region: str|None, language: str|None):
        self.sort_by = sort_by
        self.sort_order = sort_order
        self.vote_average = vote_average
        self.vote_count = vote_count
        self.total = total
        self.region = region
        self.language = language

    def __repr__(self):
        return f'<TMDBDiscover id: {self.id}, {self.to_dict()} >'

    def to_dict(self):
        return {
            "sort_by": self.sort_by.value,
            "sort_order": self.sort_order.value,
            "vote_average": self.vote_average,
            "vote_count": self.vote_count,
            "total": self.total
        }

    def getTotal(self) -> int:
        return min(self.total, 1000)

    @staticmethod
    def create(sort_by: DiscoverSortBy,
               sort_order: DiscoverSortOrder,
               vote_average: float|None,
               vote_count: int|None,
               total: int,
               region: str|None,
               language: str|None) -> 'TMDBDiscover':
        new_discover = TMDBDiscover(
            sort_by=sort_by,
            sort_order=sort_order,
            vote_average=vote_average,
            vote_count=vote_count,
            total=total,
            region=region,
            language=language
        )
        db.session.add(new_discover)
        db.session.commit()
        return new_discover

    @staticmethod
    def get(id: int):
        return TMDBDiscover.query.get(id)

    @staticmethod
    def delete(id: int):
        discover = TMDBDiscover.get(id)
        if discover:
            db.session.delete(discover)
            db.session.commit()
        return discover