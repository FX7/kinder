import logging
import os
import platform
from flask import Flask
from api.sources.tmdb import Tmdb
from config import Config
from api.database import check_db, init_db
from api.routes import movie, user, vote
from api.routes import session as votingsession
from web.routes import main

def create_app():
    dir_path = os.path.dirname(os.path.realpath(__file__))
    template_folder = os.path.join(dir_path, "web/templates")
    static_folder = os.path.join(dir_path, "web/static")
    app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
    app.config.from_object(Config)

    scripts = [
        'bootstrap/bootstrap.bundle.min.js',
    ]

    modules = [
        'js/index.js',
    ]

    styles = [
        'bootstrap/bootstrap.min.css',
        'bootstrap/bootstrap-icons.min.css',
        'css/style.css',
    ]

    @app.context_processor
    def inject_scripts():
        return dict(scripts=scripts, modules=modules, styles=styles)

    init_db(app)
    check_db(app)

    # public apidocs under http://<IP>:<PORT>/apidocs/ verfügbar
    if eval(os.environ.get('KT_SERVER_SWAGGER', 'False')):
        if platform.machine() != 'armv7l':
            from flasgger import Swagger
            Swagger(app)
        else:
            logger = logging.getLogger(__name__)
            logger.error(f"Package 'flasgger' not available on 'armv7l => no Swagger could be activated!")

    # Register Blueprints ApiRoutes
    app.register_blueprint(user.bp)
    app.register_blueprint(votingsession.bp)
    app.register_blueprint(vote.bp)
    app.register_blueprint(movie.bp)

    # Register Blueprints WebRoutes
    app.register_blueprint(main.bp)

    @app.before_request
    def init_caches():
        app.before_request_funcs[None].remove(init_caches)
        # Prefetching and caching all genres and providers
        # and by that, also check reachability of all apis
        movie.list_genres()
        Tmdb.getInstance().listProviders()

    return app

if __name__ == "__main__":
    app = create_app()
    debug = eval(os.environ.get('KT_SERVER_DEBUG', 'False'))
    host = os.environ.get('KT_SERVER_HOST', '0.0.0.0')
    app.run(host=host, port=5000, debug=debug, use_reloader=debug)
