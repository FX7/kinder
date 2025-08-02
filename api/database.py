from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text, inspect

db = SQLAlchemy()

def init_db(app):
    # Initialisiere die SQLAlchemy-Erweiterung
    db.init_app(app)
    with app.app_context():
        # Alle Modelle bekannt machenm, damit diese angelegt werden
        from api.models import User, Overlays, MovieVote, VotingSession, GenreSelection, ProviderSelection, Vote, MovieSource, MovieProvider
        db.create_all()

def select(query, parameters={}):
    query = db.session.execute(text(query), parameters)
    return query.fetchall()

def check_db(app):
    """
    Checks if the database table structure matches the models.
    Raises an Exception with an error message if differences are found.
    Ignores case and normalizes types for string and enum.
    """
    with app.app_context():
        from api.models.User import User
        from api.models.Overlays import Overlays
        from api.models.MovieVote import MovieVote
        from api.models.VotingSession import VotingSession
        from api.models.GenreSelection import GenreSelection
        from api.models.ProviderSelection import ProviderSelection
        models = [User, Overlays, MovieVote, VotingSession, GenreSelection, ProviderSelection]
        inspector = inspect(db.engine)
        errors = []
        for model in models:
            table_name = model.__tablename__
            if not inspector.has_table(table_name):
                errors.append(f"Missing table: {table_name}")
                continue
            db_columns = inspector.get_columns(table_name)
            db_col_dict = {col['name']: _normalize_type(col['type'].__class__.__name__) for col in db_columns}
            model_col_dict = {col.name: _normalize_type(col.type.__class__.__name__) for col in model.__table__.columns}
            missing = set(model_col_dict.keys()) - set(db_col_dict.keys())
            extra = set(db_col_dict.keys()) - set(model_col_dict.keys())
            type_mismatches = [col for col in model_col_dict if col in db_col_dict and model_col_dict[col] != db_col_dict[col]]
            if missing:
                errors.append(f"Missing columns in table {table_name}: {', '.join(missing)}")
            if extra:
                errors.append(f"Unexpected columns in table {table_name}: {', '.join(extra)}")
            if type_mismatches:
                for col in type_mismatches:
                    errors.append(f"Type mismatch in table {table_name}, column {col}: expected {model_col_dict[col]}, found {db_col_dict[col]}")
        if errors:
            raise Exception("DB structure does not match models:\n" + "\n".join(errors))
        
def _normalize_type(type_name):
    type_name = type_name.lower()
    if type_name in ["varchar", "string", "text"]:
        return "string"
    if "enum" in type_name:
        return "string"
    return type_name