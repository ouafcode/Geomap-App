from flask import Flask
from flask_cors import CORS
from routes.get_layers import get_bp


app = Flask(__name__)
CORS(app)

# #Register blueprint
app.register_blueprint(get_bp)

if __name__ == '__main__':
    app.run(debug=True)