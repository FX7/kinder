
import logging
from flask import Blueprint, jsonify, request


logger = logging.getLogger(__name__)

bp = Blueprint('kodidummy', __name__)

movies = [
    {
        "movieid": 1,
        "title": "Inception",
        "year": 2010,
        "genre": ["Action", "Sci-Fi"],
        "plot": "Ein Dieb, der Unternehmensgeheimnisse durch den Einsatz von Traum-Sharing-Technologie stiehlt, erhält die umgekehrte Aufgabe, eine Idee in den Kopf eines CEOs zu pflanzen.",
        "thumbnail": "https://www.themoviedb.org/t/p/w600_and_h900_bestv2/z7xs5iYsI6S9spcdm3B92q2Ew46.jpg",
        "uniqueid": {"imdb": "tt1375666"},
        "runtime": 3600,
        "mpaa": "rated 16",
        "playcount": 1,
        "art": {"poster": "https://www.themoviedb.org/t/p/w600_and_h900_bestv2/z7xs5iYsI6S9spcdm3B92q2Ew46.jpg"}
    },
    {
        "movieid": 2,
        "title": "The Matrix",
        "year": 1999,
        "genre": ["Action", "Sci-Fi"],
        "plot": "Ein Computer-Hacker erfährt von geheimnisvollen Rebellen über die wahre Natur seiner Realität und seine Rolle im Krieg gegen deren Kontrolleure.",
        "thumbnail": "https://www.themoviedb.org/t/p/w600_and_h900_bestv2/iVmDLujHcV1zaMnaahKWn4TcCS6.jpg",
        "uniqueid": {"imdb": "tt0133093"},
        "runtime": 7200,
        "mpaa": "rated 12",
        "playcount": 3,
        "art": {"poster": "https://www.themoviedb.org/t/p/w600_and_h900_bestv2/iVmDLujHcV1zaMnaahKWn4TcCS6.jpg"}
    },
        {
        "movieid": 3,
        "title": "The Shawshank Redemption",
        "year": 1994,
        "genre": ["Drama"],
        "plot": "Zwei Häftlinge entwickeln über die Jahre eine enge Freundschaft, während sie im Shawshank-Gefängnis leben.",
        "thumbnail": "https://www.themoviedb.org/t/p/w600_and_h900_bestv2/78Pb6FMLMfpm1jUOKTniwREYgAN.jpg",
        "uniqueid": {"imdb": "tt0111161"},
        "runtime": 5160,
        "mpaa": "rated 18",
        "playcount": 0,
        "art": {"poster": "https://www.themoviedb.org/t/p/w600_and_h900_bestv2/78Pb6FMLMfpm1jUOKTniwREYgAN.jpg"}
    },
    {
        "movieid": 4,
        "title": "The Godfather",
        "year": 1972,
        "genre": ["Drama", "Crime"],
        "plot": "Die Geschichte der mächtigen Mafiafamilie Corleone und deren patriarchalischen Anführer.",
        "thumbnail": "https://www.themoviedb.org/t/p/w600_and_h900_bestv2/mGdfUP8PjiTiekjxwqzLTjQlvrz.jpg",
        "uniqueid": {"imdb": "tt0068646"},
        "runtime": 7200,
        "mpaa": "rated 16",
        "playcount": 0,
        "art": {"poster": "https://www.themoviedb.org/t/p/w600_and_h900_bestv2/mGdfUP8PjiTiekjxwqzLTjQlvrz.jpg"}
    },
    {
        "movieid": 5,
        "title": "Pulp Fiction",
        "year": 1994,
        "genre": ["Crime", "Drama"],
        "plot": "Die Wege von zwei Auftragskillern, einem Boxkämpfer und einem Gangster-Paar kreuzen sich in dieser stilvollen Erzählung.",
        "thumbnail": "https://www.themoviedb.org/t/p/w600_and_h900_bestv2/cZj7z3sCiHmj7aj06S4EYnpaEwB.jpg",
        "uniqueid": {"imdb": "tt0110912"},
        "runtime": 7000,
        "mpaa": "rated 16",
        "playcount": 1,
        "art": {"poster": "https://www.themoviedb.org/t/p/w600_and_h900_bestv2/cZj7z3sCiHmj7aj06S4EYnpaEwB.jpg"}
    },
    {
        "movieid": 6,
        "title": "The Dark Knight",
        "year": 2008,
        "genre": ["Action", "Crime", "Drama"],
        "plot": "Batman kämpft gegen den Joker, der Chaos in Gotham City stiftet.",
        "thumbnail": "https://www.themoviedb.org/t/p/w600_and_h900_bestv2/z1DfRQf2CgnROyhVZ6ch8FbWt71.jpg",
        "uniqueid": {"imdb": "tt0468569"},
        "runtime": 7150,
        "mpaa": "rated 16",
        "playcount": 1,
        "art": {"poster": "https://www.themoviedb.org/t/p/w600_and_h900_bestv2/z1DfRQf2CgnROyhVZ6ch8FbWt71.jpg"}
    },
    {
        "movieid": 7,
        "title": "Forrest Gump",
        "year": 1994,
        "genre": ["Drama", "Romance"],
        "plot": "Die Lebensgeschichte von Forrest Gump, einem Mann mit einem niedrigen IQ, der an vielen historischen Ereignissen teilnimmt.",
        "thumbnail": "https://www.themoviedb.org/t/p/w600_and_h900_bestv2/zUWRCzac72YuO9k5kEWSe0aGbs7.jpg",
        "uniqueid": {"imdb": "tt0109830"},
        "runtime": 4200,
        "mpaa": "rated 6",
        "playcount": 3,
        "art": {"poster": "https://www.themoviedb.org/t/p/w600_and_h900_bestv2/zUWRCzac72YuO9k5kEWSe0aGbs7.jpg"}
    },
    {
        "movieid": 8,
        "title": "Interstellar",
        "year": 2014,
        "genre": ["Adventure", "Sci-Fi"],
        "plot": "Eine Gruppe von Astronauten reist durch ein Wurmloch in der Hoffnung, die Menschheit zu retten.",
        "thumbnail": "https://www.themoviedb.org/t/p/w600_and_h900_bestv2/hHdhfkkzt0Mwec33Ux177Z7CO8w.jpg",
        "uniqueid": {"imdb": "tt0816692"},
        "runtime": 5600,
        "mpaa": "rated 12",
        "playcount": 1,
        "art": {"poster": "https://www.themoviedb.org/t/p/w600_and_h900_bestv2/hHdhfkkzt0Mwec33Ux177Z7CO8w.jpg"}
    },
]

genres = [
    {"genreid": 1, "label": "Action"},
    {"genreid": 2, "label": "Drama"},
    {"genreid": 3, "label": "Sci-Fi"},
    {"genreid": 4, "label": "Crime"},
    {"genreid": 5, "label": "Advenure"},
    {"genreid": 6, "label": "Romance"}
]

@bp.route('/jsonrpc', methods=['POST'])
def jsonrpc():
    data = request.get_json()
    method = data.get('method')
    params = data.get('params', {})
    id = data.get('id')

    response = {}

    if method == 'VideoLibrary.GetMovies':
        response = {
            "jsonrpc": "2.0",
            "result": {
                "movies": movies
            },
            "id": id
        }
    elif method == 'VideoLibrary.GetMovieDetails':
        movie_id = params.get('movieid')
        movie_details = next((movie for movie in movies if movie['movieid'] == movie_id), None)
        response = {
            "jsonrpc": "2.0",
            "result": {
                "moviedetails": movie_details
            },
            "id": id
        }
    elif method == 'VideoLibrary.GetGenres':
        response = {
            "jsonrpc": "2.0",
            "result": {
                "genres": genres
            },
            "id": id
        }
    else:
        response = {
            "jsonrpc": "2.0",
            "error": {
                "code": -32601,
                "message": "Methode nicht gefunden"
            },
            "id": id
        }

    return jsonify(response), 200