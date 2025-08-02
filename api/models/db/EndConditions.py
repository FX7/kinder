import logging

from api.database import db

logger = logging.getLogger(__name__)

class EndConditions(db.Model):
    __tablename__ = 'end_conditions'

    id: int  = db.Column(db.Integer, primary_key=True, autoincrement=True)
    max_minutes: int = db.Column(db.Integer, nullable=False)
    max_votes: int = db.Column(db.Integer, nullable=False)
    max_matches: int = db.Column(db.Integer, nullable=False)

    def __init__(self, max_minutes: int, max_votes: int, max_matches: int):
        self.max_minutes = max_minutes
        self.max_votes = max_votes
        self.max_matches = max_matches

    def __repr__(self):
        return f'<EndConditions id: {self.id}, {self.to_dict()} >'

    def to_dict(self):
        return {
            "max_minutes": self.max_minutes,
            "max_votes": self.max_votes,
            "max_matches": self.max_matches
        }

    @staticmethod
    def create(max_minutes: int, max_votes: int, max_matches: int):
        new_end_conditions = EndConditions(
            max_matches=max_matches,
            max_minutes=max_minutes,
            max_votes=max_votes
        )
        db.session.add(new_end_conditions)
        db.session.commit()
        return new_end_conditions

    @staticmethod
    def get(id: int):
        return EndConditions.query.get(id)

    @staticmethod
    def delete(id: int):
        endConditions = EndConditions.get(id)
        if endConditions:
            db.session.delete(endConditions)
            db.session.commit()
        return endConditions