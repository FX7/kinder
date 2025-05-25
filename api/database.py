from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def init_db(app):
    global db
    # Initialisiere die SQLAlchemy-Erweiterung
    db = SQLAlchemy(app)
    with app.app_context():
        # Alle Modelle bekannt machenm, damit diese angelegt werden
        from api.models import User, MovieVote, VotingSession
        db.create_all()