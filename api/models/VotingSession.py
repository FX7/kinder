from datetime import datetime
from api.database import db

class VotingSession(db.Model):
    __tablename__ = 'voting_session'

    id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name: str = db.Column(db.String(80), nullable=False, unique=True)
    seed: int = db.Column(db.Integer, nullable=False)
    start_date: datetime = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, name: str, seed: int):
        self.name = name
        self.seed = seed

    def __repr__(self):
        return f'<VotingSession {self.name}>'


    @staticmethod
    def create(name: str, seed: int):
        new_session = VotingSession(name=name, seed=seed)
        db.session.add(new_session)
        db.session.commit()
        return new_session

    @staticmethod
    def get(session_id: int):
        return VotingSession.query.get(session_id)

    @staticmethod
    def delete(session_id: int):
        user = VotingSession.get(session_id)
        if user:
            db.session.delete(user)
            db.session.commit()
        return user