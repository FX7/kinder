from database import db
from sqlalchemy.orm import relationship
from sqlalchemy import Enum as ForeignKey

from models import User, VotingSession
from models.Vote import Vote

class MovieVote(db.Model):
    __tablename__ = 'movie_vote'

    user_id: int = db.Column(db.Integer, ForeignKey('user.id', ondelete='CASCADE'), primary_key=True)
    movie_id: int  = db.Column(db.Integer, nullable=False, primary_key=True)
    session_id: int = db.Column(db.Integer, ForeignKey('voting_session.id', ondelete='CASCADE'), primary_key=True)
    vote: Vote = db.Column(db.Enum(Vote), nullable=False)

    user = relationship(User.__name__, backref=__tablename__)
    session = relationship(VotingSession.__name__, backref=__tablename__)

    def __init__(self, user: User, movie_id: int, session: VotingSession, vote: Vote):
        self.user_id = user.id
        self.movie_id = movie_id
        self.session_id = session.id
        self.vote = vote

    def __repr__(self):
        return f'<MovieVote user_id={self.user_id}, movie_id={self.movie_id}, session_id={self.session_id}>'


    @staticmethod
    def create(user: User, movie_id: int, session: VotingSession, vote: Vote):
        new_vote = MovieVote(user=user, movie_id=movie_id, session=session, vote=vote)
        db.session.add(new_vote)
        db.session.commit()
        return new_vote

    @staticmethod
    def delete(user: User, movie_id: int, session: VotingSession):
        vote = MovieVote.query.get((user.id, movie_id, session.id))
        # vote = MovieVote.query.get({"user_id": user.id, "movie_id":movie_id, "session_id": session.id})
        if vote:
            db.session.delete(vote)
            db.session.commit()
        return user