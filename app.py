from flask import Flask
from config import Config
from routes import main, auth

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Registriere Blueprints
    app.register_blueprint(main.bp)
    app.register_blueprint(auth.bp)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
