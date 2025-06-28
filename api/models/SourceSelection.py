import logging
from typing import List
from api.database import db
from sqlalchemy import Enum as ForeignKey, func

from api.models.MovieSource import MovieSource

logger = logging.getLogger(__name__)

class SourceSelection(db.Model):
    __tablename__ = 'source_selection'

    session_id: int = db.Column(db.Integer, ForeignKey('voting_session.id', ondelete='CASCADE'), primary_key=True)
    source: MovieSource = db.Column(db.Enum(MovieSource), nullable=False, primary_key=True)

    # session = relationship("VotingSession", backref="movie_votes")

    def __init__(self, session_id: int, source: MovieSource):
        self.session_id = session_id
        self.source = source

    def __repr__(self):
        return f'<SourceSelection session_id={self.session_id}, source={self.source}>'

    def to_dict(self):
        return {
            "session_id": self.session_id,
            "source": self.source.name.lower()
        }

    @staticmethod
    def create(session_id: int, source: MovieSource) -> 'SourceSelection':
        new_source = SourceSelection(session_id=session_id, source=source)
        db.session.add(new_source)
        db.session.commit()
        return new_source
   
    @staticmethod
    def list(session_id: int) -> List['SourceSelection']:
        return SourceSelection.query.filter_by(session_id = session_id).all()