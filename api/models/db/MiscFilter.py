from datetime import date
import logging

from api.database import db

logger = logging.getLogger(__name__)

class MiscFilter(db.Model):
    __tablename__ = 'misc_filter'

    id: int  = db.Column(db.Integer, primary_key=True, autoincrement=True)
    max_age: int = db.Column(db.Integer, nullable=False)
    max_duration: int = db.Column(db.Integer, nullable=False)
    min_year: int = db.Column(db.Integer, nullable=False)
    max_year: int = db.Column(db.Integer, nullable=False)
    include_watched: bool = db.Column(db.Boolean, nullable=False)
    vote_average: float|None = db.Column(db.Float, nullable=True)
    vote_count: int|None = db.Column(db.Integer, nullable=True)

    def __init__(self, max_age: int, max_duration: int, min_year: int, max_year: int, include_watched: bool, vote_average: float|None = None, vote_count: int|None = None):
        self.max_age = max_age
        self.max_duration = max_duration
        self.min_year = min_year
        self.max_year = max_year
        self.include_watched = include_watched
        self.vote_average = vote_average
        self.vote_count = vote_count

    def __repr__(self):
        return f'<MiscFilter id: {self.id}, {self.to_dict()} >'

    def to_dict(self):
        return {
            "max_age": self.max_age,
            "max_duration": self.max_duration,
            "min_year": self.min_year,
            "vote_average": self.vote_average,
            "vote_count": self.vote_count,
            "max_year": self.max_year,
            "include_watched": self.include_watched,
        }

    def getMinDate(self) -> date:
        return date(self.min_year, 1, 1)
    
    def getMaxDate(self) -> date:
        if self.max_year < date.today().year:
            return date(self.max_year, 12, 31)
        else:
            return date.today()

    @staticmethod
    def create(max_age: int, max_duration: int, min_year: int, max_year: int, include_watched: bool, vote_average: float|None = None, vote_count: int|None = None) -> 'MiscFilter':
        miscFilter = MiscFilter(
            max_age=max_age,
            max_duration=max_duration,
            min_year=min_year,
            max_year=max_year,
            include_watched=include_watched,
            vote_average=vote_average,
            vote_count=vote_count
        )
        db.session.add(miscFilter)
        db.session.commit()
        return miscFilter

    @staticmethod
    def get(id: int):
        return MiscFilter.query.get(id)

    @staticmethod
    def delete(id: int):
        miscFilter = MiscFilter.get(id)
        if miscFilter:
            db.session.delete(miscFilter)
            db.session.commit()
        return miscFilter