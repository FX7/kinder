from datetime import datetime
import logging
from api.database import db
from sqlalchemy import Enum as ForeignKey

from .User import User
from .VotingSession import VotingSession
from ..Vote import Vote
from ..MovieSource import MovieSource

logger = logging.getLogger(__name__)

class MovieEntry(db.Model):
    __tablename__ = 'movie_entry'

    id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
    session_id: int = db.Column(db.Integer, ForeignKey('voting_session.id', ondelete='CASCADE'))
    movie_source: MovieSource = db.Column(db.Enum(MovieSource), nullable=False)
    movie_id: str  = db.Column(db.String(64), nullable=False)

    # session = relationship("VotingSession", backref="movie_votes")

    def __init__(self, session: VotingSession, movie_source: MovieSource, movie_id: str):
        self.session_id = session.id
        self.movie_source = movie_source
        self.movie_id = movie_id

    def __repr__(self):
        return f'<MovieEntry id={self.id}, session_id={self.session_id}, movie_source={self.movie_source}, movie_id={self.movie_id}'

    @staticmethod
    def create(session: VotingSession, movie_source: MovieSource, movie_id: str) -> 'MovieEntry':
        new_entry = MovieEntry(session=session, movie_id=movie_id, movie_source=movie_source)
        db.session.add(new_entry)
        db.session.commit()
        return new_entry
    
    @staticmethod
    def list(session_id: int) -> list['MovieEntry']:
        return MovieEntry.query.filter_by(session_id = session_id).all()