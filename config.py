import os
import logging

from dotenv import load_dotenv

class Config:
    load_dotenv()

    level = logging.getLevelName(os.environ.get('KT_LOG_LEVEL', 'INFO'))
    logging.basicConfig(level=level,  # Setze das Logging-Level
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',  # Format der Log-Nachricht
        datefmt='%Y-%m-%d %H:%M:%S')  # Datumsformat

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
    MAIL_SERVER = 'smtp.example.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER') or 'noreply@example.com'
