import os
from flask import Flask
from config import Config
from api.database import init_db
from api.routes import user
from web.routes import main, auth
from flasgger import Swagger

def create_app():
    dir_path = os.path.dirname(os.path.realpath(__file__))
    template_folder = os.path.join(dir_path, "web/templates")
    static_folder=os.path.join(dir_path, "web/static")
    app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
    app.config.from_object(Config)
    init_db(app)

    # Macht die apidocs unter http://<IP>:<PORT>/apidocs/ verfügbar
    if eval(os.environ.get('KT_SERVER_SWAGGER', 'True')):
        Swagger(app)

    # Registriere Blueprints ApiRoutes
    app.register_blueprint(user.bp)

    # Registriere Blueprints WebRoutes
    app.register_blueprint(main.bp)
    app.register_blueprint(auth.bp)

    return app

if __name__ == "__main__":
    app = create_app()
    debug = eval(os.environ.get('KT_SERVER_DEBUG', 'True'))
    app.run(host='0.0.0.0', port=5000, debug=debug)
