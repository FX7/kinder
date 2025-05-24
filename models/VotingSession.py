from datetime import datetime
from database import db

class VotingSession(db.Model):
    __tablename__ = 'voting_session'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False, unique=True)
    seed = db.Column(db.Integer, nullable=False)
    start_date = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<VotingSession {self.name}>'
