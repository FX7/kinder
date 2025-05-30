import logging
import random
from flask import Blueprint, jsonify, request

from api.models.VotingSession import VotingSession
from api.database import select

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

@bp.route('/api/v1/session/status/<id>', methods=['GET'])
def status(id:int):
  """
  Get stauts for given session id
  ---
  parameters:
    - name: id
      in: path
      type: integer
      required: true
      description: ID of the session you want to get the status of
  responses:
    200:
      description: Ids of movies in the kodi database
      schema:
        type: object
        properties:
          user_ids:
            type: array
            example: 1, 2, 3, 4
          votes:
            type: array
            properties:
              movie_id:
                type: integer
                example: 1
              pros:
                type: integer
                example: 0
              cons:
                type: integer
                example: 0
          plot:
            type: string
            example: Lorem Ipsum
          thumbnail:
            type: string
            example: base64 encoded image (if any)
    404:
      description: No movie wiht given id found
      schema:
        type: object
        properties:
          error:
            type: string
            example: movie with id 1 not found
  """
  result = {
    'user_ids': [],
    'votes': []
  }

  user_ids = select("SELECT DISTINCT(user_id) FROM movie_vote WHERE session_id = :session_id", {'session_id': id})
  for user_id in user_ids:
    result['user_ids'].append(user_id[0])

  votes = select("""
    SELECT
	    movie_id,
      COUNT(CASE WHEN vote = 'PRO' THEN 1 END) AS pro, 
      COUNT(CASE WHEN vote = 'CONTRA' THEN 1 END) AS contra 
    FROM
	    movie_vote
    WHERE
	    session_id = :session_id
    GROUP BY
	    movie_id
  """, {'session_id': id})
  for vote in votes:
    result['votes'].append({
      'movie_id': vote[0],
      'pros': vote[1],
      'cons': vote[2]
    })

  return result, 200
