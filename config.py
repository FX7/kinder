import os

class Config:
    SECRET_KEY = os.environ.get('KT_SERVER_SECRET_KEY', 'secret_key')
    SQLALCHEMY_DATABASE_URI = os.environ.get('KT_DATABASE_URI', 'sqlite:////data/database.sqlite3')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAIL_SERVER = 'smtp.example.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER') or 'noreply@example.com'
