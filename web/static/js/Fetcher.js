import { Kinder } from './index.js';
import { MovieId } from './MovieId.js';

export class Fetcher {
    #apiBase = '/api/v1';
    static #instance;

    #genres = null;

    #sessions_by_id = new Map();
    #sessions_by_name = new Map();
    #users_by_id = new Map();
    #movies_by_id = new Map();
    #genres_by_id = new Map();

    #settings;
    #usernamesSuggestions;

    #session_status_cache = new Map(); // { session_id: { status, timestamp } }

    constructor() {
    }

    buildJoinUrl(session) {
        if (session === undefined || session === null) {
            return null;
        }
        let url = this.#baseUrl() + '/j/' + session.hash;
        return url;
    }

    async getNextMovie(session_id, user_id) {
        let next = await this.#get('/session/next/' + session_id + '/' + user_id + '/unknown/none');
        return next;
    }

    async getSessionStatus(session_id, forceFresh=false) {
        if (session_id === undefined || session_id === null || session_id === '') {
            return null;
        }
        session_id = parseInt(session_id);
        const now = Date.now();
        const cache = this.#session_status_cache.get(session_id);
        if (!forceFresh && cache && (now - cache.timestamp < (Kinder.sessionStatusInterval - 100))) {
            return cache.status;
        }
        let status = await this.#get('/session/status/' + session_id);
        this.#session_status_cache.set(session_id, { status: status, timestamp: now });
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
        if (genre_id === undefined || genre_id === null || genre_id === '') {
            return null;
        }
        let gid = genre_id.toString();
        if (this.#genres_by_id.size === 0) {
            let genres = await this.listGenres();
            genres.forEach(g => {
                this.#genres_by_id.set(g.id, g);
            });
        }
        return this.#genres_by_id.get(gid);
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
        if (sessionid === undefined || sessionid === null || sessionid === '') {
            return null;
        }
        let sid = parseInt(sessionid);
        if (this.#sessions_by_id.has(sid)) {
            return this.#sessions_by_id.get(sid);
        }
        let session = await this.#get('/session/get/' + sid);
        this.#sessions_by_id.set(sid, session);
        return session;
    }

    async getSessionByHash(sessionhash) {
        if (sessionhash === undefined || sessionhash === null || sessionhash === '') {
            return null;
        }
        const sessions = await Fetcher.getInstance().listSessions();
        let session = null;
        Object.keys(sessions).forEach(key => {
            let s = sessions[key];
            if (s.hash === sessionhash) {
                session = s;
            }
        });
        return session;
    }

    async getSessionByName(sessionname) {
        if (sessionname === undefined || sessionname === null || sessionname === '') {
            return null;
        }
        if (this.#sessions_by_name.has(sessionname)) {
            return this.#sessions_by_name.get(sessionname);
        }
        let session = null;
        const sessions = await Fetcher.getInstance().listSessions();
        Object.keys(sessions).forEach(key => {
            let s = sessions[key];
            if (s.name === sessionname) {
                session = s;
            }
        });
        if (session !== null) {
            this.#sessions_by_name.set(sessionname, session);
        }
        return session;
    }

    async getUser(userid) {
        if (userid === undefined || userid === null || userid === '') {
            return null;
        }
        let uid = parseInt(userid);
        if (this.#users_by_id.has(uid)) {
            return this.#users_by_id.get(uid);
        }
        let user = await this.#get('/user/get/' + uid);
        this.#users_by_id.set(uid, user);
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
        misc_filter,
        end_conditions,
        overlays,
        discover
        ) {
        let data = {
            sessionname: sessionname,
            user_id: user.user_id,
            movie_provider: movie_provider,
            disabled_genres: disabled_genres,
            must_genres: must_genres,
            misc_filter: misc_filter,
            end_conditions,
            overlays: overlays,
            discover: discover
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