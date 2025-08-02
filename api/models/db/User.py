from datetime import datetime
import logging

from sqlalchemy import func
from api.database import db

logger = logging.getLogger(__name__)

class User(db.Model):
    __tablename__ = 'user'

    id: int  = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name: str = db.Column(db.String(80), nullable=False, unique=True)
    create_date: datetime = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, name: str):
        self.name = name

    def __repr__(self):
        return f'<User id: {self.id}, name: {self.name} >'

    def to_dict(self):
        return {
            "user_id": self.id,
            "name": self.name,
            "create_date": self.create_date
        }

    @staticmethod
    def create(name: str):
        new_user = User(name=name)
        db.session.add(new_user)
        db.session.commit()
        return new_user

    @staticmethod
    def get(userIdOrName: int|str):
        if isinstance(userIdOrName, int):
            return User.query.get(userIdOrName)
        elif isinstance(userIdOrName, str):
            return User.query.filter(func.lower(User.name) == str(userIdOrName).lower()).first()
        raise Exception('userIdOrName must be int (id) or str (name)!')

    @staticmethod
    def delete(user_id: int):
        user = User.get(user_id)
        if user:
            db.session.delete(user)
            db.session.commit()
        return user
    
    @staticmethod
    def list():
        return User.query.all()