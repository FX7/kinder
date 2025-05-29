import logging
import random
from flask import Blueprint, jsonify, request

from api.models.VotingSession import VotingSession

logger = logging.getLogger(__name__)

bp = Blueprint('session', __name__)

@bp.route('/api/v1/session/list', methods=['GET'])
def list():
  """
  List all sessions
  ---
  responses:
    200:
      description: Sessions
      schema:
        type: array
        items:
          type: integer
          example: 1, 2, 3
  """
  result = []
  for vs in VotingSession.list():
     result.append(vs.to_dict())

  return result, 200

@bp.route('/api/v1/session/start', methods=['POST'])
def start():
    """
    Start a new voting session
    ---
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            sessionname:
              type: string
              example: Movienight
    responses:
      200:
        description: Id of the created session
        schema:
          type: object
          properties:
            session_id:
              type: integer
              example: 1
            name:
              type: string
              example: Movienight
            seed:
              type: integer
              example: 12345
            start_date:
              type: datetime
              example: Wed, 28 May 2025 19:53:27 GMT
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

    sessionname = data.get('sessionname')
    if sessionname is None:
      return jsonify({'error': 'missing sessionname'}), 400

    if VotingSession.get(sessionname) is not None:
      return jsonify({'error': 'name must be unique'}), 400

    try:
      seed = random.randint(0,1000000000)
      votingsession = VotingSession.create(sessionname, seed)
    except Exception as e:
      return jsonify({'error': f"expcetion {e}"}), 500
    
    return votingsession.to_dict(), 200
