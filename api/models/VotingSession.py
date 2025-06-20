from datetime import datetime
import logging

from sqlalchemy import func
from api.database import db
from api.models.GenreSelection import GenreSelection
from api.models.Vote import Vote

logger = logging.getLogger(__name__)

class VotingSession(db.Model):
    __tablename__ = 'voting_session'

    id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name: str = db.Column(db.String(80), nullable=False, unique=True)
    seed: int = db.Column(db.Integer, nullable=False)
    start_date: datetime = db.Column(db.DateTime, default=datetime.utcnow)
    max_age: int = db.Column(db.Integer, nullable=False)
    max_duration: int = db.Column(db.Integer, nullable=False)
    include_watched: bool = db.Column(db.Boolean, nullable=False)

    forced_genre_ids = None
    disabled_genre_ids = None

    def __init__(self, name: str, seed: int, max_age: int, max_duration: int, include_watched: bool):
        self.name = name
        self.seed = seed
        self.max_age = max_age
        self.max_duration = max_duration
        self.include_watched = include_watched

    def __repr__(self):
        return f'<VotingSession {self.name}>'

    def to_dict(self):
        return {
            "session_id": self.id,
            "name": self.name,
            "seed": self.seed,
            "start_date": self.start_date,
            "disabled_genre_ids" : self.getDisabledGenres(),
            "must_genre_ids" : self.getMustGenres(),
            "max_age": self.max_age,
            "max_duration": self.max_duration,
            "include_watched": self.include_watched
        }

    def getDisabledGenres(self):
        if self.disabled_genre_ids is None:
            disabled_genres = GenreSelection.list(self.id)
            genre_ids = []
            for genre in disabled_genres:
                if genre.vote == Vote.CONTRA:
                    genre_ids.append(genre.genre_id)
            self.disabled_genre_ids = genre_ids
        return self.disabled_genre_ids
    
    def getMustGenres(self):
        if self.forced_genre_ids is None:
            forced_genres = GenreSelection.list(self.id)
            genre_ids = []
            for genre in forced_genres:
                if genre.vote == Vote.PRO:
                    genre_ids.append(genre.genre_id)
            self.forced_genre_ids = genre_ids
        return self.forced_genre_ids

    @staticmethod
    def create(name: str, seed: int, max_age: int, max_duration: int, include_watched: bool):
        new_session = VotingSession(name=name, seed=seed, max_age=max_age, max_duration=max_duration, include_watched=include_watched)
        db.session.add(new_session)
        db.session.commit()
        return new_session

    @staticmethod
    def get(sessionIdOrName: int|str):
        if isinstance(sessionIdOrName, int):
            return VotingSession.query.get(sessionIdOrName)
        elif isinstance(sessionIdOrName, str):
            return VotingSession.query.filter(func.lower(VotingSession.name) == str(sessionIdOrName).lower()).first()
        raise Exception('sessionIdOrName must be int (id) or str (name)!')

    @staticmethod
    def list():
        return VotingSession.query.all()

    @staticmethod
    def delete(session_id: int):
        session = VotingSession.get(session_id)
        if session:
            db.session.delete(session)
            db.session.commit()
        return session