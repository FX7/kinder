import os
from flask import Flask
from config import Config
from api.database import init_db
from api.routes import movie, user, vote
from api.routes import session as votingsession
from web.routes import main
from flasgger import Swagger

def create_app():
    dir_path = os.path.dirname(os.path.realpath(__file__))
    template_folder = os.path.join(dir_path, "web/templates")
    static_folder = os.path.join(dir_path, "web/static")
    app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
    app.config.from_object(Config)

    scripts = [
        'bootstrap/bootstrap.bundle.min.js',
        'js/Fetcher.js',
        'js/Login.js',
        'js/Voter.js',
        'js/SessionStatus.js',
        'js/index.js',
    ]

    styles = [
        'bootstrap/bootstrap.min.css',
        'bootstrap/bootstrap-icons.min.css',
        'css/style.css',
    ]

    @app.context_processor
    def inject_scripts():
        return dict(scripts=scripts, styles=styles)

    init_db(app)

    # public apidocs under http://<IP>:<PORT>/apidocs/ verfügbar
    if eval(os.environ.get('KT_SERVER_SWAGGER', 'False')):
        Swagger(app)

    # Register Blueprints ApiRoutes
    app.register_blueprint(user.bp)
    app.register_blueprint(votingsession.bp)
    app.register_blueprint(vote.bp)
    app.register_blueprint(movie.bp)

    # Register Blueprints WebRoutes
    app.register_blueprint(main.bp)

    # Register Blueprints KodiDummy
    if eval(os.environ.get('KT_KODI_ENABLE_DEMO_API', 'False')):
        from api.routes import kodi_dummy as dummy
        app.register_blueprint(dummy.bp)

    return app

if __name__ == "__main__":
    app = create_app()
    debug = eval(os.environ.get('KT_SERVER_DEBUG', 'False'))
    host = os.environ.get('KT_SERVER_HOST', '0.0.0.0')
    app.run(host=host, port=5000, debug=debug)
