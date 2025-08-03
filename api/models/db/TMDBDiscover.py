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
    release_year_start: int = db.Column(db.Integer, nullable=False)
    release_year_end: int|None = db.Column(db.Integer, nullable=True)
    vote_average: float|None = db.Column(db.Float, nullable=True)
    vote_count: int|None = db.Column(db.Integer, nullable=True)
    total: int = db.Column(db.Integer, nullable=False)
    chunks: int = db.Column(db.Integer, nullable=False)
    distribution: float = db.Column(db.Integer, nullable=False)

    def __init__(self, sort_by: DiscoverSortBy, sort_order: DiscoverSortOrder, release_year_start: int, release_year_end: int|None, vote_average: float|None, vote_count: int|None, total: int, chunks: int, distribution: float):
        self.sort_by = sort_by
        self.sort_order = sort_order
        self.release_year_start = release_year_start
        self.release_year_end = release_year_end
        self.vote_average = vote_average
        self.vote_count = vote_count
        self.total = total
        self.chunks = chunks
        self.distribution = distribution

    def __repr__(self):
        return f'<TMDBDiscover id: {self.id}, {self.to_dict()} >'

    def to_dict(self):
        return {
            "sort_by": self.sort_by.value,
            "sort_order": self.sort_order.value,
            "release_year_start": self.release_year_start,
            "release_year_end": self.release_year_end,
            "vote_average": self.vote_average,
            "vote_count": self.vote_count,
            "total": self.total,
            "chunks": self.chunks,
            "distribution": self.distribution
        }

    def getStartDate(self) -> date:
        return date(self.release_year_start, 1, 1)
    
    def getEndDate(self) -> date:
        if self.release_year_end and self.release_year_end < date.today().year:
            return date(self.release_year_end, 12, 31)
        else:
            return date.today()

    def getTotal(self) -> int:
        return min(self.total, 1000)

    # def chunked(self) -> list[TMDBChunk]:
    #     start_year = self.release_year_start
    #     end_year = self.release_year_end if self.release_year_end else date.today().year
    #     chunk_years = math.floor((end_year - start_year) // self.chunks)
    #     chunk_total = self.total // self.chunks
    #     chunk_start_year = start_year
    #     chunks = []
    #     for c in range(self.chunks):
    #         chunk_end_year = chunk_start_year + chunk_years
    #         chunk_start_date = date(chunk_start_year, 1, 1)
    #         if chunk_end_year >= date.today().year:
    #             chunk_end_date = date.today()
    #         else:
    #             chunk_end_date = date(chunk_end_year, 12, 31)
    #         chunks.append(TMDBChunk(chunk_start_date, chunk_end_date, chunk_total))
    #         chunk_start_year = chunk_end_year + 1
    #     return chunks

    @staticmethod
    def create(sort_by: DiscoverSortBy, sort_order: DiscoverSortOrder, release_year_start: int, release_year_end: int|None, vote_average: float|None, vote_count: int|None, total: int, chunks: int, distribution: float) -> 'TMDBDiscover':
        new_discover = TMDBDiscover(
            sort_by=sort_by,
            sort_order=sort_order,
            release_year_start=release_year_start,
            release_year_end=release_year_end,
            vote_average=vote_average,
            vote_count=vote_count,
            total=total,
            chunks=chunks,
            distribution=distribution
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