class Fetcher {
    #apiBase = '/api/v1';
    static #instance;

    #sessions = null;
    #movieIds = null;
    #genres = null;

    #movies = new Map();

    constructor() {
    }

    async getVotedMovies(session_id, user_id) {
        let votes = await this.#get('/session/' + session_id + '/votes/' + user_id);
        return votes;
    }

    async getSessionStatus(sessionId) {
        let status = await this.#get('/session/status/' + sessionId);
        return status;
    }

    async voteMovie(sessionId, userId, movieId, vote) {
        let data = {
            session_id: sessionId,
            movie_id: movieId,
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

    async listGenres() {
        if (this.#genres === null) {
            this.#genres = await this.#get('/movie/genres');
        }
        return this.#genres;
    }

    async listSessions() {
        if (this.#sessions === null) {
            this.#sessions = await this.#get('/session/list');
        }
        return this.#sessions;
    }

    async startSession(sessionname, disabled_genres) {
        this.#sessions = null;

        let data = {
            sessionname: sessionname,
            disabled_genres: disabled_genres,
        }
        return this.#post('/session/start', data);
    }

    async listMovies() {
        if (this.#movieIds === null) {
            this.#movieIds = await this.#get('/movie/list');
        }
        return this.#movieIds;
    }

    async getMovie(movieId) {
        if (this.#movies.has(movieId)) {
            return this.#movies.get(movieId);
        }
        let movie = await this.#get('/movie/get/' + movieId);
        this.#movies.set(movieId, movie);
        return movie;
    }

    async #get(endpoint) {
        const response = await fetch(this.#apiBaseUrl() + endpoint, {
            method: 'GET',
        });
        if (response.status === 500) {
            throw new Error('Netzwerkantwort war nicht ok: ' + response.statusText);
        }
        return await response.json();
    }

    async #post(endpoint, data) {
        const response = await fetch(this.#apiBaseUrl() + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (response.status === 500) {
            throw new Error('Netzwerkantwort war nicht ok: ' + response.statusText);
        }
        return await response.json();
    }

    #apiBaseUrl() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;
        return protocol + '//' + hostname + ':' + port + this.#apiBase;
    }

    static getInstance() {
        if (Fetcher.#instance === undefined || Fetcher.#instance === null) {
            Fetcher.#instance = new Fetcher();
        }
        return Fetcher.#instance;
    }
}