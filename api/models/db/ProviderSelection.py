import logging
from typing import List
from api.database import db
from sqlalchemy import Enum as ForeignKey

from api.models.MovieProvider import MovieProvider

logger = logging.getLogger(__name__)

class ProviderSelection(db.Model):
    __tablename__ = 'provider_selection'

    session_id: int = db.Column(db.Integer, ForeignKey('voting_session.id', ondelete='CASCADE'), primary_key=True)
    provider: MovieProvider = db.Column(db.Enum(MovieProvider), nullable=False, primary_key=True)

    # session = relationship("VotingSession", backref="movie_votes")

    def __init__(self, session_id: int, provider: MovieProvider):
        self.session_id = session_id
        self.provider = provider

    def __repr__(self):
        return f'<ProviderSelection session_id={self.session_id}, source={self.provider}>'

    def to_dict(self):
        return {
            "session_id": self.session_id,
            "provider": self.provider.name.lower()
        }

    @staticmethod
    def create(session_id: int, provider: MovieProvider) -> 'ProviderSelection':
        new_provider = ProviderSelection(session_id=session_id, provider=provider)
        db.session.add(new_provider)
        db.session.commit()
        return new_provider
   
    @staticmethod
    def list(session_id: int) -> List['ProviderSelection']:
        return ProviderSelection.query.filter_by(session_id = session_id).all()