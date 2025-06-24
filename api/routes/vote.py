import logging
from flask import Blueprint, json, jsonify, request

from api.models.MovieVote import MovieVote
from api.models.User import User
from api.models.Vote import Vote
from api.models.MovieSource import fromString as ms_fromString
from api.models.MovieSource import MovieSource
from api.models.VotingSession import VotingSession

from api.routes.session import next_movie

logger = logging.getLogger(__name__)

bp = Blueprint('vote', __name__)

@bp.route('/api/v1/vote/movie', methods=['POST'])
def movie():
  """
  Give a vote for a movie
  ---
  parameters:
    - name: body
      in: body
      required: true
      schema:
        type: object
        properties:
          session_id:
            type: integer
            required: true
            description: Id of the session your vote should be accounted for
            example: 1
          movie_source:
            type: string
            required: true
            enum: [kodi]
            description: The source of the movie_id
          movie_id:
            type: integer
            required: true
            description: Id of the movie you vote for
            example: 1
          user_id:
            type: integer
            required: true
            description: Id of the user giving the vote
            example: 1
          vote:
            type: string
            required: true
            enum: [pro, contra]
            description: Your vote for the given movie in context of the given session
  responses:
    200:
      description: Created voting Object and next movieId
      schema:
        type: object
        properties:
          next_movie_id:
            type: integer
            example: 376
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

  session_id = data.get('session_id')
  movie_id = data.get('movie_id')
  movie_source = data.get('movie_source')
  user_id = data.get('user_id')
  vote = data.get('vote')
  if session_id is None or movie_id is None or user_id is None or vote is None:
    return jsonify({'error': 'missing session_id / movie_id / user_id / vote'}), 400

  try:
    sid = int(session_id)
    msrc = ms_fromString(movie_source)
    mid = int(movie_id)
    uid = int(user_id)
    if vote.upper() not in Vote.__members__:
        raise ValueError(f"{vote} is not a valid value for Vote")
    else:
      vote = Vote[vote.upper()]
  except ValueError:
    return jsonify({'error': 'invalid value for session_id / movie_source/ movie_id / user_id / vote'}), 400

  session = VotingSession.get(sid)
  # TODO movie_id überprüfen
  user = User.get(uid)
  if session is None or user is None:
      return jsonify({'error': 'unknown session_id / movie_id / user_id'}), 400

  old_vote = MovieVote.get(user = user, movie_source=msrc, movie_id=mid, session=session)
  if old_vote is not None:
     return jsonify({'error': 'already voted'}), 400

  movie_vote = MovieVote.create(session=session, user=user, movie_source=movie_source, movie_id=mid, vote=vote)
  
  return next_movie(session_id, user_id, movie_source, movie_id)