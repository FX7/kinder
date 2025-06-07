import logging
from flask import Blueprint, jsonify, request

from api.models.User import User

logger = logging.getLogger(__name__)

bp = Blueprint('user', __name__)

@bp.route('/api/v1/user/get/<id>', methods=['GET'])
def get(id:int):
  """
  Get user with given id
  ---
  parameters:
    - name: id
      in: path
      type: integer
      required: true
      description: ID of the user you want to get
  responses:
    200:
      description: User details
      schema:
        type: object
        properties:
          movie_id:
            type: integer
            example: 1
          title:
            type: string
            example: Movietitle
          plot:
            type: string
            example: Lorem Ipsum
          thumbnail:
            type: string
            example: base64 encoded image (if any)
    404:
      description: No user wiht given id found
      schema:
        type: object
        properties:
          error:
            type: string
            example: user with id 1 not found
  """
  user = User.get(int(id))
  if user is None:
     return {'error': f"user with id {id} not found"}, 404
  
  return user.to_dict(), 200


@bp.route('/api/v1/user/list', methods=['GET'])
def list():
  """
  List all users
  ---
  responses:
    200:
      description: Users
      schema:
        type: array
        items:
          type: object
          properties:
            user_id:
              type: integer
              example: 1
            name:
              type: string
              example: Superman
            create_date:
              type: datetime
              example: Wed, 28 May 2025 19:53:27 GMT
  """

  result = []
  for u in User.list():
     result.append(u.to_dict())

  return result, 200

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
