import logging
from typing import List
from api.database import db
from sqlalchemy import Enum as ForeignKey, func

from .Vote import Vote

logger = logging.getLogger(__name__)

class GenreSelection(db.Model):
    __tablename__ = 'genre_selection'

    genre_id: int  = db.Column(db.Integer, nullable=False, primary_key=True)
    session_id: int = db.Column(db.Integer, ForeignKey('voting_session.id', ondelete='CASCADE'), primary_key=True)
    vote: Vote = db.Column(db.Enum(Vote), nullable=False)

    # session = relationship("VotingSession", backref="movie_votes")

    def __init__(self, genre_id: int, session_id: int, vote: Vote):
        self.genre_id = genre_id
        self.session_id = session_id
        self.vote = vote

    def __repr__(self):
        return f'<GenreSelection genre_id={self.genre_id}, session_id={self.session_id}, vote={self.vote}>'

    def to_dict(self):
        return {
            "genre_id": self.genre_id,
            "session_id": self.session_id,
            "vote": self.vote.name.lower()
        }

    @staticmethod
    def create(genre_id: int, session_id: int, vote: Vote) -> 'GenreSelection':
        new_selection = GenreSelection(genre_id=genre_id, session_id=session_id, vote=vote)
        db.session.add(new_selection)
        db.session.commit()
        return new_selection
   
    @staticmethod
    def list(session_id: int) -> List['GenreSelection']:
        return GenreSelection.query.filter_by(session_id = session_id).all()