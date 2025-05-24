from datetime import datetime
from database import db

class User(db.Model):
    __tablename__ = 'user'

    id: int  = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name: str = db.Column(db.String(80), nullable=False, unique=True)
    create_date: datetime = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, name: str):
        self.name = name

    def __repr__(self):
        return f'<User {self.name}>'


    @staticmethod
    def create(name: str):
        new_user = User(name=name)
        db.session.add(new_user)
        db.session.commit()
        return new_user

    @staticmethod
    def get(user_id: int):
        return User.query.get(user_id)

    @staticmethod
    def delete(user_id: int):
        user = User.get(user_id)
        if user:
            db.session.delete(user)
            db.session.commit()
        return user