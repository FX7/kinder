from datetime import datetime
import logging

from sqlalchemy import func
from api.database import db

logger = logging.getLogger(__name__)

class Overlays(db.Model):
    __tablename__ = 'overlays'

    id: int  = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title: bool = db.Column(db.Boolean, nullable=False)
    duration: bool = db.Column(db.Boolean, nullable=False)
    genres: bool = db.Column(db.Boolean, nullable=False)
    watched: bool = db.Column(db.Boolean, nullable=False)
    age: bool = db.Column(db.Boolean, nullable=False)

    def __init__(self, title: bool, duration: bool, genres: bool, watched: bool, age: bool):
        self.title = title
        self.duration = duration
        self.genres = genres
        self.watched = watched
        self.age = age

    def __repr__(self):
        return f'<Overlays id: {self.id}, {self.to_dict()} >'

    def to_dict(self):
        return {
            "title": self.title,
            "duration": self.duration,
            "genres": self.genres,
            "watched": self.watched,
            "age": self.age
        }

    @staticmethod
    def create(title: bool, duration: bool, genres: bool, watched: bool, age: bool):
        new_overlay = Overlays(
            title=title,
            duration=duration,
            genres=genres,
            watched=watched,
            age=age
        )
        db.session.add(new_overlay)
        db.session.commit()
        return new_overlay

    @staticmethod
    def get(id: int):
        return Overlays.query.get(id)

    @staticmethod
    def delete(id: int):
        overlays = Overlays.get(id)
        if overlays:
            db.session.delete(overlays)
            db.session.commit()
        return overlays