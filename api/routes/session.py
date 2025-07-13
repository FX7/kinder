import logging
import random
from typing import Dict, List, Tuple
from flask import Blueprint, Response, jsonify, request

from api.models.GenreId import GenreId
from api.models.MovieId import MovieId
from api.models.MovieProvider import MovieProvider
from api.models.ProviderSelection import ProviderSelection
from api.models.Vote import Vote
from api.models.MovieProvider import MovieProvider
from api.models.MovieProvider import fromString as mp_fromString
from api.models.MovieSource import MovieSource, fromString as ms_fromString
from api.models.GenreSelection import GenreSelection
from api.models.User import User
from api.models.VotingSession import VotingSession
from api.database import select
from api.routes import movie

import api.sources.kodi as kodi
import api.sources.emby as emby
import api.sources.tmdb as tmdb

logger = logging.getLogger(__name__)

bp = Blueprint('session', __name__)

_SESSION_MOVIELIST_MAP: Dict[int, list[MovieId]] = {}
_SESSION_MOVIE_FILTER_RESULT: Dict[str, bool] = {}

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
          must_genres:
            type: array
            required:  false
            items:
              type: integer
              example: 1, 2, 3
          movie_provider:
            type: array
            required: true
            items:
              type: enum
              example: kodi
          max_age:
            type: integer
            example: 16
          max_duration:
            type: integer
            example: 120
            description: max duration in minutes
          include_watched:
            type: boolean
            example: true
            description: should watched movies be included (true) or excluded (false)?
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
          must_genres_ids:
            type: array
            items:
              type: integer
              example: 1
          max_age:
            type: integer
            example: 16
          max_duration:
            type: integer
            example: 120
          include_watched:
            type: boolean
            example: true
          end_max_minutes:
            type: integer
            example: -1
          end_max_votes:
            type: integer
            example: -1
          end_max_matches:
            type: integer
            example: -1
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

  must_genres = data.get('must_genres')
  if must_genres is None:
    must_genres = []

  movie_provider = data.get('movie_provider')
  if movie_provider is None:
    movie_provider = []

  max_age = data.get('max_age')
  max_duration = data.get('max_duration')
  include_watched = data.get('include_watched')
  end_max_minutes = data.get('end_max_minutes')
  end_max_votes = data.get('end_max_votes')
  end_max_matches = data.get('end_max_matches')

  try:
    max_age = int(max_age)
    if max_age < 0:
      raise ValueError()
    if max_age > 18:
      max_age = 1000 # any random higher then 18 value
  except ValueError:
    return jsonify({'error': 'max_age must be positive integer value'}), 400

  try:
    max_duration = int(max_duration)
    if max_duration < 0:
      raise ValueError()
    if max_duration > 14400: # 240(min)*60(sec)
      max_duration = 60000 # 1000*60 : any random higher then 240*60 value
  except ValueError:
    return jsonify({'error': 'max_duration must be positive integer value'}), 400

  try:
    end_max_minutes = int(end_max_minutes)
    end_max_votes = int(end_max_votes)
    end_max_matches = int(end_max_matches)
  except ValueError:
    return jsonify({'error': 'end_max_minutes / end_max_votes / end_max_matches must be an integer'}), 400

  providers = []
  for provider in movie_provider:
    try:
      providers.append(mp_fromString(provider))
    except ValueError as e:
      return jsonify({'error', f"{provider} is not a valid MovieProvider"}), 400
  if len(providers) == 0:
    return jsonify({'error', f"no valid MovieProvider given"}), 400

  try:
    seed = random.randint(1,1000000000)
    votingsession = VotingSession.create(sessionname,
                                         seed,
                                         max_age,
                                         max_duration,
                                         include_watched,
                                         end_max_minutes,
                                         end_max_votes,
                                         end_max_matches)
    for genre_id in disabled_genres:
      GenreSelection.create(genre_id=genre_id, session_id=votingsession.id, vote=Vote.CONTRA)
    for genre_id in must_genres:
      GenreSelection.create(genre_id=genre_id, session_id=votingsession.id, vote=Vote.PRO)
    for provider in providers:
      ProviderSelection.create(session_id=votingsession.id, provider=provider)
  except Exception as e:
    return jsonify({'error': f"expcetion {e}"}), 500
  
  return votingsession.to_dict(), 200

@bp.route('/api/v1/session/status/<session_id>', methods=['GET'])
def status(session_id: str):
  """
  Get stauts for given session id
  ---
  parameters:
    - name: session_id
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

  try:
    sid = int(session_id)
  except ValueError:
    return {'error': f"session id must be int "}, 400

  votingSession = VotingSession.get(sid)
  if votingSession is None:
    return jsonify({'error': f"session with id {session_id} not found"}), 404

  result = {
    'session': votingSession.to_dict(),
    'user_ids': [],
    'votes': []
  }

  user_ids = select("SELECT DISTINCT(user_id) FROM movie_vote WHERE session_id = :session_id", {'session_id': sid})
  for user_id in user_ids:
    result['user_ids'].append(user_id[0])

  votes = select("""
    SELECT
      movie_source,
	    movie_id,
      COUNT(CASE WHEN vote = 'PRO' THEN 1 END) AS pro,
      COUNT(CASE WHEN vote = 'CONTRA' THEN 1 END) AS contra,
      GROUP_CONCAT(user_id) AS voter,
      MAX(vote_date) AS last_vote
    FROM
	    movie_vote
    WHERE
	    session_id = :session_id
    GROUP BY
	    movie_source, movie_id
    ORDER BY
      last_vote DESC
  """, {'session_id': sid})
  for vote in votes:
    result['votes'].append({
      'movie_source': vote[0],
      'movie_id': {
          'source': vote[0],
          'id': vote[1],
        },
      'pros': vote[2],
      'cons': vote[3],
      'voter': vote[4],
      'last_vote': vote[5],
    })

  return result, 200

@bp.route('/api/v1/session/next/<session_id>/<user_id>/<last_movie_source>/<last_movie_id>', methods=['GET'])
def next_movie(session_id: str, user_id: str, last_movie_source: str, last_movie_id: str):
  """
  Get the next movie for the given session and user, with last movie_voted
  ---
  parameters:
    - name: session_id
      in: path
      type: str
      required: true
      description: ID of the session you want to get the next movie for
    - name: user_id
      in: path
      type: str
      required: true
      description: ID of the user you want to get the next movie for
    - name: last_movie_source
      in: path
      type: str
      required: true
      description: Source of the movie the last vote was given for
    - name: last_movie_id
      in: path
      type: str
      required: true
      description: ID of the movie the last vote was given for
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

  checkResult = check_session_end_conditions(votingSession, user)
  if checkResult is not None:
    return checkResult

  movies = _get_session_movies(votingSession)

  if mid <= 0:
    voted_movies = _user_votes(sid, uid)
    if len(voted_movies) > 0:
      last_voted = voted_movies[len(voted_movies) - 1]
      return next_movie(session_id, user_id, str(last_voted.source), str(last_voted.id))
    index = -1
  else:
    try:
      msrc = ms_fromString(last_movie_source)
    except ValueError:
      return {"error": f"{last_movie_source} is not a valid value for MovieSource"}, 400

    movieId = MovieId(msrc, mid)

    try:
      index = movies.index(movieId)
    except ValueError:
      return jsonify({'error': f"movie with id {movieId} not found in voting list"}), 404
  
  if index+1 >= len(movies):
    return jsonify({ 'over': "No more movies left!" }), 200

  next_movie_id = movies[index+1]
  # if next_movie_id <= 0: # this should never happen, because of the previous check?!
  #   return jsonify({ 'warning': "no more movies left" }), 200
  
  if _filter_movie(next_movie_id, votingSession):
    return next_movie(session_id, user_id, next_movie_id.source.name, str(next_movie_id.id))
 
  result = movie.getMovie(next_movie_id)
  if result is None: # this should never happen, because it would mean an illegal next_movie_id
    return jsonify({ 'error': f"next_movie with id {next_movie_id} was None" }), 400

  return result.to_dict(), 200

def check_session_end_conditions(votingSession: VotingSession, user: User) -> Tuple[Response, int]|None:
  if votingSession.maxTimeReached():
    return jsonify({ 'over': "Times up!" }), 200
  
  max_votes = votingSession.end_max_votes
  if max_votes > 0 and _count_user_votes(votingSession.id, user.id) >= max_votes:
    return jsonify({ 'over': "Max votes reached!" }), 200


def _filter_movie(movie_id: MovieId, votingSession: VotingSession) -> bool :
  global _SESSION_MOVIE_FILTER_RESULT
  key = str(votingSession.id) + ':' + str(movie_id)
  cachedFilterResult = _SESSION_MOVIE_FILTER_RESULT.get(key)
  if cachedFilterResult is not None:
    return cachedFilterResult

  disabledGenreIds = votingSession.getDisabledGenres()
  mustGenreIds = votingSession.getMustGenres()
  maxAge = votingSession.max_age
  maxDuration = votingSession.max_duration
  includeWatched = votingSession.include_watched

  check_movie = movie.getMovie(movie_id)
  # This shouldnt happen, because then kodi/tmdb would have reported illegal movie ids
  if check_movie is None:
    _SESSION_MOVIE_FILTER_RESULT[key] = True
    return True

  # This can happen if for eample a movie is on Amazon Video (not Prime) but only for buying, 
  # not for rent. For now we only want flatrates or rents, but no buying
  # Also this could happen if a movie was checked for kodi presence but kodi is not selected as provider
  if len(check_movie.getFilteredProvider(votingSession.getMovieProvider())) <= 0:
    logger.debug(f"Movie {movie_id} filtered cause of no provider found")
    _SESSION_MOVIE_FILTER_RESULT[key] = True
    return True    

  # Prefere Kodi movies; so if source of this movie isnt kodi,
  # but kodi is available as provider for this movie and session, skip this movie
  if movie_id.source != MovieSource.KODI and MovieProvider.KODI in votingSession.getMovieProvider() and MovieProvider.KODI in check_movie.provider:
    logger.debug(f"Movie {movie_id} filtered cause of double match with kodi and kodi is prefered")
    _SESSION_MOVIE_FILTER_RESULT[key] = True
    return True

  # No filters apply, so this movie must not be filtered out (can be keept)
  if len(disabledGenreIds) <= 0 and len(mustGenreIds) <= 0 and maxAge >= 18 and maxDuration > (240*60) and includeWatched:
    _SESSION_MOVIE_FILTER_RESULT[key] = False
    return False

  if not includeWatched and check_movie.playcount is not None and check_movie.playcount > 0:
    logger.debug(f"Movie {movie_id} filtered playcount > 0")
    _SESSION_MOVIE_FILTER_RESULT[key] = True
    return True
  
  if check_movie.runtime is not None and check_movie.runtime > maxDuration:
    logger.debug(f"Movie {movie_id} filtered cause runtime > {maxDuration}")
    _SESSION_MOVIE_FILTER_RESULT[key] = True
    return True

  if check_movie.age is not None and check_movie.age > maxAge:
    logger.debug(f"Movie {movie_id} filtered cause age > {maxAge}")
    _SESSION_MOVIE_FILTER_RESULT[key] = True
    return True

  if _filter_genres(check_movie.genre, disabledGenreIds, mustGenreIds):
    logger.debug(f"Movie {movie_id} filtered cause genre missmatch")
    _SESSION_MOVIE_FILTER_RESULT[key] = True
    return True
  
  _SESSION_MOVIE_FILTER_RESULT[key] = False
  return False

def _filter_genres(movie_genres: List[GenreId], disabledGenreIds: List[int], mustGenreIds: List[int]) -> bool: 
  # if no genres given, dont filter on them
  if movie_genres is None or len(movie_genres) <= 0:
    return False

  mustGenreMatch = False
  for genre in movie_genres:
    if genre.id in disabledGenreIds:
      return True
    if genre.id in mustGenreIds:
      mustGenreMatch = True

  if len(mustGenreIds) > 0 and not mustGenreMatch:
    return True

  return False


def _get_session_movies(voting_session: VotingSession) -> List[MovieId]:
  global _SESSION_MOVIELIST_MAP
  if voting_session.id in _SESSION_MOVIELIST_MAP:
    movies = _SESSION_MOVIELIST_MAP.get(voting_session.id)
    if movies is None:
      movies = []
  else:
    random.seed(voting_session.seed)
    movies = []
    tmdb_used = False
    for provider in voting_session.getMovieProvider():
      if MovieProvider.KODI == provider:
        kodiIds = kodi.listMovieIds()
        movies = movies + kodiIds
      elif MovieProvider.EMBY == provider:
        embyIds = emby.listMovieIds()
        movies = movies + embyIds
      elif provider.useTmdbAsSource() and not tmdb_used:
        tmdbIds = tmdb.listMovieIds(voting_session)
        tmdb_used = True
        movies = movies + tmdbIds
      else:
        logger.error(f"Dont know how to fetch movieIds for {provider}")
    random.shuffle(movies)
    _SESSION_MOVIELIST_MAP[voting_session.id] = movies
  return movies

def _user_votes(session_id: int, user_id: int) -> List[MovieId]:
  votes = select("""
      SELECT
          movie_source, movie_id
      FROM
          movie_vote
      WHERE
          user_id = :user_id AND session_id = :session_id
      ORDER BY
          vote_date
  """, {'session_id': session_id, 'user_id': user_id})

  result = []
  for vote in votes:
    result.append(MovieId(vote[0], vote[1]))

  return result

def _count_user_votes(session_id: int, user_id: int) -> int:
  count = select("""
      SELECT
          COUNT(movie_id)
      FROM
          movie_vote
      WHERE
          user_id = :user_id and session_id = :session_id
  """, {'session_id': session_id, 'user_id': user_id})

  return int(count[0][0])