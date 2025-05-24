import os
from flask import Flask
from config import Config
from database import init_db
from routes import main, auth

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    init_db(app)

    # Registriere Blueprints
    app.register_blueprint(main.bp)
    app.register_blueprint(auth.bp)

    return app

if __name__ == "__main__":
    app = create_app()
    debug = eval(os.environ.get('KT_SERVER_DEBUG', 'True'))
    app.run(host='0.0.0.0', port=5050, debug=debug)
