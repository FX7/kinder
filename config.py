import os
import logging
import platform

from datetime import datetime

class Config:
    if platform.machine() != 'armv7l':
        from dotenv import load_dotenv
        load_dotenv()
    else:
        print(f"Package 'python-dotenv' not available on 'armv7l!")

    LOG_DIR = os.environ.get('KT_LOG_FOLDER', '/log')
    DATE = datetime.now().strftime('%Y-%m-%d')    
    if not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR)

    levelString = os.environ.get('KT_LOG_LEVEL', 'INFO')
    levelParsed = False
    level = logging.getLevelName(levelString)
    if (level == 'Level ' + levelString):
        level = logging.INFO
        levelParsed = False
    else:
        levelParsed = True

    logging.basicConfig(level=level, # Setze das Logging-Level
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', # Format der Log-Nachricht
        datefmt='%Y-%m-%d %H:%M:%S', # Datumsformat
        handlers=[
            logging.FileHandler(LOG_DIR + '/kinder-' + DATE + '.log'),   # Protokoll in die Datei
            logging.StreamHandler()                 # Protokoll in die Konsole
        ])

    error_handler = logging.FileHandler(LOG_DIR + '/kinder-' + DATE + '-error.log')
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s', '%Y-%m-%d %H:%M:%S'))
    logging.getLogger().addHandler(error_handler)
    log = logging.getLogger(__name__)
    if not levelParsed:
        log.error(f"logLevelString '{levelString}' could not be parsed! Falling back to default 'INFO'!")

    external_logger = logging.getLogger('smbprotocol')
    external_logger.setLevel(logging.WARNING)
    external_logger = logging.getLogger('urllib3')
    external_logger.setLevel(logging.WARNING)
    external_logger = logging.getLogger('spnego')
    external_logger.setLevel(logging.WARNING)
    external_logger = logging.getLogger('smbclient')
    external_logger.setLevel(logging.WARNING)

    SECRET_KEY = os.environ.get('KT_SERVER_SECRET_KEY', 'secret_key')
    SQLALCHEMY_DATABASE_URI = os.environ.get('KT_DATABASE_URI', 'sqlite:////data/database.sqlite3')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    if not SQLALCHEMY_DATABASE_URI.startswith('sqlite:////'):
        log.error(f"Invalid database URI '{SQLALCHEMY_DATABASE_URI}'!")
        log.error(f"Will exit now!")
        exit(1)
