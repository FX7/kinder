from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text

db = SQLAlchemy()

def init_db(app):
    # Initialisiere die SQLAlchemy-Erweiterung
    db.init_app(app)
    with app.app_context():
        # Alle Modelle bekannt machenm, damit diese angelegt werden
        from api.models import User, MovieVote, VotingSession, GenreSelection, Vote
        db.create_all()

def select(query, parameters={}):
    query = db.session.execute(text(query), parameters)
    return query.fetchall()