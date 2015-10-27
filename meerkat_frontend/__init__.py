"""
meerkat_frontend.py

Root Flask app for the Meerkat frontend.

This module runs as the root Flask app and mounts component Flask apps for
different services such as the API and Reports.
"""
from flask import Flask
from .views.homepage import homepage
from .views.technical import technical
from .views.reports import reports

# Create the Flask app
app = Flask(__name__)
app.config.from_object('config.Development')
app.config.from_envvar('MEERKAT_FRONTEND_SETTINGS', silent=True)

# Register the Blueprint modules
app.register_blueprint(homepage, url_prefix='/')
app.register_blueprint(technical, url_prefix='/technical')
app.register_blueprint(reports, url_prefix='/reports')

# Logging to syslog
if not app.debug:
    import logging
    from logging.handlers import SysLogHandler
    syslog = SysLogHandler(address=app.config['SYSLOG_PATH'])
    syslog.setLevel(logging.WARNING)
    syslog.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s '
        '[in %(pathname)s:%(lineno)d]'
    ))
    app.logger.addHandler(syslog)
