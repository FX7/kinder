from database import db
from sqlalchemy.orm import relationship
from sqlalchemy import Enum as ForeignKey

from models.Vote import Vote

class MovieVote(db.Model):
    __tablename__ = 'movie_vote'

    user_id = db.Column(db.Integer, ForeignKey('user.id'), primary_key=True)
    movie_id = db.Column(db.Integer, nullable=False, primary_key=True)
    session_id = db.Column(db.Integer, ForeignKey('voting_session.id'), primary_key=True)
    vote = db.Column(db.Enum(Vote), nullable=False)

    user = relationship("User", backref="movie_votes")
    session = relationship("VotingSession", backref="movie_votes")

    def __repr__(self):
        return f'<MovieVote user_id={self.user_id}, movie_id={self.movie_id}, session_id={self.session_id}>'