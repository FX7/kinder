import os
import logging

from dotenv import load_dotenv
from datetime import datetime

class Config:
    load_dotenv()

    LOG_DIR = '/log'
    DATE = datetime.now().strftime('%Y-%m-%d')    
    if not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR)

    level = logging.getLevelName(os.environ.get('KT_LOG_LEVEL', 'INFO'))
    logging.basicConfig(level=level, # Setze das Logging-Level
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', # Format der Log-Nachricht
        datefmt='%Y-%m-%d %H:%M:%S', # Datumsformat
        handlers=[
            logging.FileHandler(LOG_DIR + '/kinder-' + DATE + '.log'),   # Protokoll in die Datei
            logging.StreamHandler()                 # Protokoll in die Konsole
        ])

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
