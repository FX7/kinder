from flask_sqlalchemy import SQLAlchemy

db : SQLAlchemy

def init_db(app):
    global db
    # Initialisiere die SQLAlchemy-Erweiterung
    db = SQLAlchemy(app)
    with app.app_context():
        # Alle Modelle bekannt machenm, damit diese angelegt werden
        from models import User, MovieVote, VotingSession
        db.create_all()

#from models import User, MovieVote, VotingSession, Vote  # Importiere die Modelle aus dem models-Paket