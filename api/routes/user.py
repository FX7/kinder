from flask import Blueprint, jsonify, request

from api.models.User import User

bp = Blueprint('user', __name__)

@bp.route('/api/v1/user/register', methods=['POST'])
def register():
    """
    Register a new User
    ---
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            username:
              type: string
              example: Max
    responses:
      200:
        description: User created
        schema:
          type: object
          properties:
            id:
              type: integer
              example: 1
      400:
        description: Invalid JSON data
        schema:
          type: object
          properties:
            error:
              type: string
              example: invalid JSON data
    """
    if request.json is None:
        return jsonify({'error': 'invalid JSON data'}), 400

    data = request.json

    username = data.get('username')
    if username is None:
      return jsonify({'error': 'missing username'}), 400

    try:
      user = User.create(username)
    except Exception as e:
      return jsonify({'error': 'expcetion {e}'}), 500
    
    response = {
        'id': user.id
    }

    return jsonify(response), 200
