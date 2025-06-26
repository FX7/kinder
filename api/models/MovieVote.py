from datetime import datetime
import logging
from api.database import db
from sqlalchemy import Enum as ForeignKey

from .User import User
from .VotingSession import VotingSession
from .Vote import Vote
from .MovieSource import MovieSource

logger = logging.getLogger(__name__)

class MovieVote(db.Model):
    __tablename__ = 'movie_vote'

    user_id: int = db.Column(db.Integer, ForeignKey('user.id', ondelete='CASCADE'), primary_key=True)
    movie_source: MovieSource = db.Column(db.Enum(MovieSource), nullable=False, primary_key=True)
    movie_id: int  = db.Column(db.Integer, nullable=False, primary_key=True)
    session_id: int = db.Column(db.Integer, ForeignKey('voting_session.id', ondelete='CASCADE'), primary_key=True)
    vote: Vote = db.Column(db.Enum(Vote), nullable=False)
    vote_date: datetime = db.Column(db.DateTime, default=datetime.utcnow)

    # user = relationship("User", backref="movie_votes")
    # session = relationship("VotingSession", backref="movie_votes")

    def __init__(self, user: User,  movie_source: MovieSource, movie_id: int, session: VotingSession, vote: Vote):
        self.user_id = user.id
        self.movie_source = movie_source
        self.movie_id = movie_id
        self.session_id = session.id
        self.vote = vote

    def __repr__(self):
        return f'<MovieVote user_id={self.user_id}, movie_source={self.movie_source}, movie_id={self.movie_id}, session_id={self.session_id}, vote={self.vote}>'

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "movie_source": self.movie_source,
            "movie_id": self.movie_id,
            "session_id": self.session_id,
            "vote": self.vote.name.lower()
        }

    @staticmethod
    def create(user: User, movie_source: MovieSource, movie_id: int, session: VotingSession, vote: Vote) -> 'MovieVote':
        new_vote = MovieVote(user=user, movie_id=movie_id, movie_source=movie_source, session=session, vote=vote)
        db.session.add(new_vote)
        db.session.commit()
        return new_vote

    @staticmethod
    def delete(user: User, movie_source: MovieSource, movie_id: int, session: VotingSession) -> 'MovieVote|None':
        vote = MovieVote.query.get((user.id, movie_source, movie_id, session.id))
        # vote = MovieVote.query.get({"user_id": user.id, "movie_id":movie_id, "session_id": session.id})
        if vote:
            db.session.delete(vote)
            db.session.commit()
        return vote
    
    @staticmethod
    def get(user: User, movie_source: MovieSource, movie_id: int, session: VotingSession) -> 'MovieVote|None':
        return MovieVote.query.get((user.id, movie_source, movie_id, session.id, ))