import random
from flask import Blueprint, json, jsonify, request

from api.models.MovieVote import MovieVote
from api.models.User import User
from api.models.Vote import Vote
from api.models.VotingSession import VotingSession

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
        description: Created voting Object
        schema:
          type: object
          properties:
            user_id:
              type: integer
              example: 1
            session_id:
              type: integer
              example: 1
            movie_id:
              type: integer
              example: 1
            vote:
              type: string
              enum: [pro, contra]
              description: Your vote for the given movie in context of the given session
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
    user_id = data.get('user_id')
    vote = data.get('vote')
    if session_id is None or movie_id is None or user_id is None or vote is None:
      return jsonify({'error': 'missing session_id / movie_id / user_id / vote'}), 400

    try:
      session_id = int(session_id)
      movie_id = int(movie_id)
      user_id = int(user_id)
      if vote.upper() not in Vote.__members__:
         print(f"invalid vote")
         raise ValueError(f"{vote} is not a valid value for Vote")
      else:
        vote = Vote[vote.upper()] 
    except ValueError:
      return jsonify({'error': 'invalid value for session_id / movie_id / user_id / vote'}), 400

    session = VotingSession.get(session_id)
    # TODO movie_id überprüfen
    user = User.get(user_id)
    if session is None or user is None:
       return jsonify({'error': 'unknown session_id / movie_id / user_id'}), 400

    # TODO check if vote is already given
    movie_vote = MovieVote.create(session=session, user=user, movie_id=movie_id, vote=vote)
   
    return movie_vote.to_dict(), 200
