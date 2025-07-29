import { Kinder } from './index.js';
import { MovieId } from './MovieId.js';

export class Fetcher {
    #apiBase = '/api/v1';
    static #instance;

    #genres = null;

    #users_by_id = new Map();
    #movies_by_id = new Map();
    #genres_by_id = new Map();

    #settings;
    #usernamesSuggestions;

    constructor() {
    }

    async getNextMovie(session_id, user_id) {
        let next = await this.#get('/session/next/' + session_id + '/' + user_id + '/unknown/none');
        return next;
    }

    async getSessionStatus(session_id) {
        let status = await this.#get('/session/status/' + session_id);
        return status;
    }

    async voteMovie(sessionId, userId, movieId, vote) {
        let data = {
            session_id: sessionId,
            movie_source: movieId.source,
            movie_id: movieId.id,
            user_id: userId,
            vote: vote
        }
        return this.#post('/vote/movie', data);
    }

    async imposeUser(username) {
        let data = {
            username: username
        }
        return this.#post('/user/impose', data);
    }

    async getGenreById(genre_id) {
        if (this.#genres_by_id.size === 0) {
            let genres = await this.listGenres();
            genres.forEach(g => {
                this.#genres_by_id.set(g.id, g);
            });
        }
        return this.#genres_by_id.get(genre_id);
    }

    async listGenres() {
        if (this.#genres === null) {
            this.#genres = await this.#get('/movie/genres');
        }
        return this.#genres;
    }

    async listSessions() {
        return await this.#get('/session/list');
    }

    async getSession(sessionid) {
        return await this.#get('/session/get/' + sessionid);
    }

    async getMatchingSession(sessionname) {
        let session = null;
        const sessions = await Fetcher.getInstance().listSessions();
        Object.keys(sessions).forEach(key => {
            let s = sessions[key];
            if (s.name === sessionname) {
                session = s;
            }
        });
        return session;
    }

    async getUser(userid) {
        if (this.#users_by_id.has(userid)) {
            return this.#users_by_id.get(userid);
        }
        let user = await this.#get('/user/get/' + userid);
        this.#users_by_id.set(userid, user);
        return user;
    }

    async listUsers() {
        return await this.#get('/user/list');
    }

    async settings() {
        if (this.#settings === undefined || this.#settings === null) {
            let settings = await this.#get('/settings', this.#baseUrl());
            this.#settings = settings;
        }
        return this.#settings;
    }

    async usernameSuggestions() {
        if (this.#usernamesSuggestions === undefined || this.#usernamesSuggestions === null) {
            let usernames = await this.#get('/static/data/usernames.json', this.#baseUrl());
            this.#usernamesSuggestions = usernames;
        }
        return this.#usernamesSuggestions;
    }

    async startSession(
        sessionname,
        user,
        movie_provider,
        disabled_genres,
        must_genres,
        max_age,
        max_minutes,
        include_watched,
        end_max_minutes,
        end_max_votes,
        end_max_matches) {
        let data = {
            sessionname: sessionname,
            user_id: user.user_id,
            movie_provider: movie_provider,
            disabled_genres: disabled_genres,
            must_genres: must_genres,
            max_age: max_age,
            max_duration: max_minutes,
            include_watched: include_watched,
            end_max_minutes: end_max_minutes,
            end_max_votes: end_max_votes,
            end_max_matches: end_max_matches
        }
        return this.#post('/session/start', data);
    }

    async getMovie(movieId) {
        let key = MovieId.toKeyByObject(movieId);
        if (this.#movies_by_id.has(key)) {
            return this.#movies_by_id.get(key);
        }
        let movie = await this.#get('/movie/get/' + movieId.source + '/' + movieId.id);
        this.#movies_by_id.set(key, movie);
        return movie;
    }

    async playMovie(movieId) {
        let result = await this.#get('/movie/play/' + movieId.source + '/' + movieId.id);
        let movie = await this.getMovie(movieId);
        if (result.result === 'OK') {
            Kinder.overwriteableToast(movie.title + ' now playing ...');
        } else {
            Kinder.persistantToast('Error playing movie ' + movie.title, '!!! Error !!!');
        }
    }

    async #get(endpoint, baseUrl = this.#apiBaseUrl(), asJson=true) {
        const response = await fetch(baseUrl + endpoint, {
            method: 'GET',
        });
        // if (response.status === 504) {

        // } else
        if (response.status === 500) {
            const error = this.#extractErrorFromResponseText(await response.text());
            Kinder.masterError(error);
            throw new Error('received 500 status code!');
        }
        return asJson ? await response.json() : await response.text();
    }

    async #post(endpoint, data, baseUrl = this.#apiBaseUrl(), asJson=true) {
        const response = await fetch(baseUrl + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        // if (response.status === 504) {

        // } else
        if (response.status === 500) {
            const error = this.#extractErrorFromResponseText(await response.text());
            Kinder.masterError(error);
            throw new Error('received 500 status code!');
        }
        return asJson ? await response.json() : await response.text();
    }

    #extractErrorFromResponseText(text) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const content = doc.querySelector('body').innerHTML;
        return content;
    }

    #apiBaseUrl() {
        return this.#baseUrl() + this.#apiBase;
    }

    #baseUrl() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;
        return protocol + '//' + hostname + ':' + port;
    }

    static getInstance() {
        if (Fetcher.#instance === undefined || Fetcher.#instance === null) {
            Fetcher.#instance = new Fetcher();
        }
        return Fetcher.#instance;
    }
}