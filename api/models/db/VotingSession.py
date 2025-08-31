from datetime import datetime, timedelta
import logging
import os
from typing import List

from sqlalchemy import func
from api.database import db
from api.models.db.MiscFilter import MiscFilter
from api.models.db.Overlays import Overlays
from api.models.db.EndConditions import EndConditions
from api.models.db.TMDBDiscover import TMDBDiscover
from api.models.db.User import User
from api.models.db.GenreSelection import GenreSelection
from api.models.MovieProvider import MovieProvider
from api.models.db.ProviderSelection import ProviderSelection
from api.models.Vote import Vote
from api.models.MovieProvider import providerToString

logger = logging.getLogger(__name__)

class VotingSession(db.Model):
    __tablename__ = 'voting_session'

    id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name: str = db.Column(db.String(80), nullable=False, unique=True)
    hash: str = db.Column(db.String(64), nullable=False, unique=True)
    creator_id: int = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'))
    seed: int = db.Column(db.Integer, nullable=False)
    start_date: datetime = db.Column(db.DateTime, default=datetime.utcnow)
    misc_filter_id: int|None = db.Column(db.Integer, db.ForeignKey('misc_filter.id', ondelete='SET NULL'), nullable=True)
    end_conditions_id: int|None = db.Column(db.Integer, db.ForeignKey('end_conditions.id', ondelete='SET NULL'), nullable=True)
    overlays_id: int|None = db.Column(db.Integer, db.ForeignKey('overlays.id', ondelete='SET NULL'), nullable=True)
    tmdb_discover_id: int|None = db.Column(db.Integer, db.ForeignKey('tmdb_discover.id', ondelete='SET NULL'), nullable=True)

    forced_genre_ids = None
    disabled_genre_ids = None
    movie_provider = None
    misc_filter = None
    overlays = None
    end_conditions = None
    tmdb_discover = None

    def __init__(self,
                 name: str,
                 creator_id: int,
                 seed: int, 
                 misc_filter_id: int|None,
                 end_conditions_id: int|None,
                 overlays_id: int|None,
                 tmdb_discover_id: int|None):
        self.name = name
        self.hash = name.encode("utf-8").hex()
        self.creator_id = creator_id
        self.seed = seed
        self.misc_filter_id = misc_filter_id
        self.end_conditions_id = end_conditions_id
        self.overlays_id = overlays_id
        self.tmdb_discover_id = tmdb_discover_id

    def __repr__(self):
        return f'<VotingSession {self.name}>'
    
    def to_dict(self):
        miscFilter = self.getMiscFilter()
        overlays = self.getOverlays()
        endConditions = self.getEndConditions()
        discover = self.getTmdbDiscover()

        return {
            "session_id": self.id,
            "name": self.name,
            "hash": self.hash,
            "creator_id": self.creator_id,
            "seed": self.seed,
            "start_date": self.start_date,
            "disabled_genre_ids" : self.getDisabledGenres(),
            "must_genre_ids" : self.getMustGenres(),
            "movie_provider" : list(map(providerToString, self.getMovieProvider())),
            "misc_filter": miscFilter.to_dict() if miscFilter is not None else None,
            "end_conditions": endConditions.to_dict() if endConditions is not None else None,
            "overlays": overlays.to_dict() if overlays is not None else None,
            "tmdb_discover": discover.to_dict() if discover is not None else None,
        }

    def maxTimeReached(self) -> bool:
        endConditions = self.getEndConditions()
        if endConditions is None or endConditions.max_minutes <= 0:
            return False
        
        return datetime.now() - self.start_date > timedelta(minutes=endConditions.max_minutes)

    def getDisabledGenres(self) -> List[int]:
        if self.disabled_genre_ids is None:
            disabled_genres = GenreSelection.list(self.id)
            genre_ids = []
            for genre in disabled_genres:
                if genre.vote == Vote.CONTRA:
                    genre_ids.append(genre.genre_id)
            self.disabled_genre_ids = genre_ids
        return self.disabled_genre_ids
    
    def getMustGenres(self) -> List[int]:
        if self.forced_genre_ids is None:
            forced_genres = GenreSelection.list(self.id)
            genre_ids = []
            for genre in forced_genres:
                if genre.vote == Vote.PRO:
                    genre_ids.append(genre.genre_id)
            self.forced_genre_ids = genre_ids
        return self.forced_genre_ids

    def getMovieProvider(self) -> List[MovieProvider]:
        if self.movie_provider is None:
            providers = ProviderSelection.list(self.id)
            provider_list = []
            for provider in providers:
                provider_list.append(provider.provider)
            self.movie_provider = provider_list
        return self.movie_provider

    def getMiscFilter(self) -> MiscFilter|None:
        if self.misc_filter is None and self.misc_filter_id is not None:
            self.misc_filter = MiscFilter.get(self.misc_filter_id)
        return self.misc_filter

    def getOverlays(self) -> Overlays|None:
        if self.overlays is None and self.overlays_id is not None:
            self.overlays = Overlays.get(self.overlays_id)
        return self.overlays
    
    def getEndConditions(self) -> EndConditions|None:
        if self.end_conditions is None and self.end_conditions_id is not None:
            self.end_conditions = EndConditions.get(self.end_conditions_id)
        return self.end_conditions

    def getTmdbDiscover(self) -> TMDBDiscover|None:
        if self.tmdb_discover is None and self.tmdb_discover_id is not None:
            self.tmdb_discover = TMDBDiscover.get(self.tmdb_discover_id)
        return self.tmdb_discover

    def getLanguage(self) -> str:
        discover = self.getTmdbDiscover()
        return discover.language if discover and discover.language is not None else os.getenv('KT_TMDB_API_LANGUAGE', 'de-DE')

    @staticmethod
    def create(name: str,
               user: User,
               seed: int,
               misc_filter: MiscFilter|None,
               end_conditions: EndConditions|None,
               overlays: Overlays|None,
               discover: TMDBDiscover|None
            ) -> 'VotingSession':
        new_session = VotingSession(name=name,
                                    seed=seed,
                                    creator_id=user.id,
                                    misc_filter_id=misc_filter.id if misc_filter else None,
                                    end_conditions_id=end_conditions.id if end_conditions else None,
                                    overlays_id=overlays.id if overlays else None,
                                    tmdb_discover_id= discover.id if discover else None)
        db.session.add(new_session)
        db.session.commit()
        return new_session

    @staticmethod
    def get(sessionIdOrName: int|str) -> 'VotingSession|None':
        if isinstance(sessionIdOrName, int):
            return VotingSession.query.get(sessionIdOrName)
        elif isinstance(sessionIdOrName, str):
            return VotingSession.query.filter(func.lower(VotingSession.name) == str(sessionIdOrName).lower()).first()
        raise Exception('sessionIdOrName must be int (id) or str (name)!')

    @staticmethod
    def list() -> List['VotingSession']:
        return VotingSession.query.all()

    @staticmethod
    def delete(session_id: int) -> 'VotingSession|None':
        session = VotingSession.get(session_id)
        if session:
            overlays = session.getOverlays()
            if overlays:
                Overlays.delete(overlays.id)
            end_conditions = session.getEndConditions()
            if end_conditions:
                EndConditions.delete(end_conditions.id)
            db.session.delete(session)
            db.session.commit()
        return session