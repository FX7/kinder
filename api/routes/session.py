import logging
import random
from typing import Dict
from flask import Blueprint, jsonify, request

from api.models.Vote import Vote
from api.models.GenreSelection import GenreSelection
from api.models.User import User
from api.models.VotingSession import VotingSession
from api.database import select
from api.routes.movie import getMovie

import api.kodi as kodi


logger = logging.getLogger(__name__)

bp = Blueprint('session', __name__)

session_movie_map: Dict[int, list[int]] = {}

@bp.route('/api/v1/session/get/<session_id>', methods=['GET'])
def get(session_id:str):
  """
  Get Session with given id
  ---
  parameters:
    - name: session_id
      in: path
      type: integer
      required: true
      description: ID of the Session you want to get
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

  try:
    sid = int(session_id)
  except ValueError:
    return {'error': f"session id must be int "}, 400

  session = VotingSession.get(sid)
  if session is None:
     return {'error': f"session with id {session_id} not found"}, 404
  
  return session.to_dict(), 200


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
            disabled_genre_ids:
              type: array
              items:
                type: integer
                example: 1
  """
  result = []
  for vs in VotingSession.list():
     result.append(vs.to_dict())

  result = sorted(result, key=lambda x: x["session_id"], reverse=True)
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
            required:  true
            example: Movienight
          disabled_genres:
            type: array
            required:  false
            items:
              type: integer
              example: 1, 2, 3
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
          disabled_genre_ids:
            type: array
            items:
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

  sessionname = data.get('sessionname')
  if sessionname is None:
    return jsonify({'error': 'missing sessionname'}), 400

  if VotingSession.get(sessionname) is not None:
    return jsonify({'error': 'name must be unique'}), 400

  disabled_genres = data.get('disabled_genres')
  if disabled_genres is None:
    disabled_genres = []

  try:
    seed = random.randint(0,1000000000)
    votingsession = VotingSession.create(sessionname, seed)
    for genre_id in disabled_genres:
      GenreSelection.create(genre_id=genre_id, session_id=votingsession.id, vote=Vote.CONTRA)
  except Exception as e:
    return jsonify({'error': f"expcetion {e}"}), 500
  
  return votingsession.to_dict(), 200

@bp.route('/api/v1/session/status/<id>', methods=['GET'])
def status(id: str):
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
      description: No session with given id found
      schema:
        type: object
        properties:
          error:
            type: string
            example: session with id 1 not found
  """

  votingSession = VotingSession.get(int(id))
  if votingSession is None:
    return jsonify({'error': f"session with id {id} not found"}), 404

  result = {
    'session': votingSession.to_dict(),
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
      COUNT(CASE WHEN vote = 'CONTRA' THEN 1 END) AS contra,
      MAX(vote_date) AS last_vote
    FROM
	    movie_vote
    WHERE
	    session_id = :session_id
    GROUP BY
	    movie_id
    ORDER BY
      last_vote DESC
  """, {'session_id': id})
  for vote in votes:
    result['votes'].append({
      'movie_id': vote[0],
      'pros': vote[1],
      'cons': vote[2],
      'last_vote': vote[3],
    })

  return result, 200

@bp.route('/api/v1/session/next/<session_id>/<user_id>/<last_movie_id>', methods=['GET'])
def next_movie(session_id: str, user_id: str, last_movie_id: str):
  """
  Get the next movie for the given session and user, with last movie_voted
  ---
  parameters:
    - name: session_id
      in: path
      type: integer
      required: true
      description: ID of the session you want to get the next movie for
    - name: user_id
      in: path
      type: integer
      required: true
      description: ID of the user you want to get the next movie for
    - name: last_movie_id
      in: path
      type: integer
      required: true
      description: ID of movie the last vote was given for
  responses:
    200:
      description: The next movie id the user can vote for in this session
      schema:
        type: object
        properties:
          next_movie_id:
            type: integer
            example: 376
    404:
      description: No session / user /movie with given id found
      schema:
        type: object
        properties:
          error:
            type: string
            example: session with id 1 not found
  """

  try:
    sid = int(session_id)
    uid = int(user_id)
    mid = int(last_movie_id)
  except ValueError:
    return jsonify({'error': f"session_id / user_id / last_movie_id must be ints!"}), 400

  votingSession = VotingSession.get(sid)
  if votingSession is None:
    return jsonify({'error': f"session with id {session_id} not found"}), 404
  
  user = User.get(uid)
  if user is None:
    return jsonify({'error': f"user with id {user_id} not found"}), 404
  
  global session_movie_map
  if sid in session_movie_map:
    movies = session_movie_map.get(sid)
    if movies is None:
      movies = []
  else:
    movies = kodi.listMovieIds().copy()
    random.seed(votingSession.seed)
    random.shuffle(movies)
    session_movie_map[sid] = movies

  if mid <= 0:
    voted_movies = _user_votes(sid, uid)
    if len(voted_movies) > 0:
      return next_movie(session_id, user_id, str(voted_movies[len(voted_movies) - 1]))
    index = -1
  else:
    try:
      index = movies.index(mid)
    except ValueError:
      return jsonify({'error': f"movie with id {last_movie_id} not found"}), 404
  
  if index+1 >= len(movies):
    return jsonify({ 'warning': "no more movies left" }), 200

  next_movie_id = movies[index+1]
  disabledGenreIds = votingSession.getDisabledGenres()

  if len(disabledGenreIds) > 0:
    kodi_movie = kodi.getMovie(next_movie_id)
    movie_genre = kodi_movie['result']['moviedetails']['genre']
    genres = kodi.listGenres()
    
    for genre in genres:
      if genre['genreid'] in disabledGenreIds and genre['label'] in movie_genre:
        return next_movie(session_id, user_id, str(next_movie_id))

  if next_movie_id <= 0:
    return jsonify({ 'warning': "no more movies left" }), 200
  
  movie = getMovie(next_movie_id)
  if movie is None:
    return jsonify({ 'warning': "no more movies left" }), 200
  return movie, 200

def _user_votes(session_id: int, user_id: int):
  votes = select("""
      SELECT
          movie_id
      FROM
          movie_vote
      WHERE
          user_id = :user_id AND session_id = :session_id
      ORDER BY
          vote_date
  """, {'session_id': session_id, 'user_id': user_id})

  result = []
  for vote in votes:
    result.append(vote[0])

  return result