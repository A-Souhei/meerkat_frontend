"""
meerkat_app.py

Sets up the Root Flask app for the Meerkat Frontend, so it can be imported
at the begining of files, without complicated import chains.
"""
from flask import Flask
from flask.ext.babel import Babel
from raven.contrib.flask import Sentry
from werkzeug.contrib.fixers import ProxyFix
import jinja2
import os
import json
from meerkat_libs.logger_client import FlaskActivityLogger
import copy

# Create the Flask app
app = Flask(__name__)
app.jinja_options['extensions'].append('jinja2.ext.do')
babel = Babel(app)
app.config.from_object('meerkat_frontend.config.Development')
app.config.from_envvar('MEERKAT_FRONTEND_SETTINGS')
app.config.from_envvar('MEERKAT_FRONTEND_API_SETTINGS', silent=True)
app.secret_key = 'some_secret'
app.wsgi_app = ProxyFix(app.wsgi_app)


FlaskActivityLogger(app)

# Set up sentry error monitoring
if app.config["SENTRY_DNS"]:
    sentry = Sentry(app, dsn=app.config["SENTRY_DNS"])
else:
    sentry = None

if app.config.get('TEMPLATE_FOLDER', None):
    my_loader = jinja2.ChoiceLoader([
        app.jinja_loader,
        jinja2.FileSystemLoader(app.config["TEMPLATE_FOLDER"]),
    ])
    app.jinja_loader = my_loader

# Need to pass auth root down to all pages that might need it.
# Feels a bit hacky, but can't immediately think of a better way.
# Here we feed the env var into the shared config that is sent to all pages.
app.config['SHARED_CONFIG']['auth_root'] = app.config['AUTH_ROOT']
display_configs = {}

# Set up the config files.
for k, v in app.config['COMPONENT_CONFIGS'].items():
    path = os.path.dirname(os.path.realpath(__file__)) + "/../" + v
    config = json.loads(open(path).read())
    display_configs[k] = {**app.config['SHARED_CONFIG'], **config}
    app.config[k] = display_configs[k]


# Set the default values of the g object
class FlaskG(app.app_ctx_globals_class):
    def __init__(self):
        self.allowed_location = 1
        self.config = copy.deepcopy(display_configs)
        self.language = app.config['DEFAULT_LANGUAGE']

app.app_ctx_globals_class = FlaskG
