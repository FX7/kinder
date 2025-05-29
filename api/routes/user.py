import logging
from flask import Blueprint, jsonify, request

from api.models.User import User

logger = logging.getLogger(__name__)

bp = Blueprint('user', __name__)

@bp.route('/api/v1/user/impose', methods=['POST'])
def impose():
    """
    Impose as given User
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
        description: Id of the created User
        schema:
          type: object
          properties:
            user_id:
              type: integer
              example: 1
            name:
              type: string
              example: Max
            create_date:
              type: date
              example: Sun, 25 May 2025 10:42:53 GMT
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

    user = User.get(username)
    if user is None:
      try:
        user = User.create(username)
      except Exception as e:
        return jsonify({'error': f"expcetion {e}"}), 500

    return user.to_dict(), 200
