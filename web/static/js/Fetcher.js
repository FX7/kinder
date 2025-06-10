class Fetcher {
    #apiBase = '/api/v1';
    static #instance;

    #movieIds = null;
    #genres = null;

    #movies_by_id = new Map();
    #genres_by_id = new Map();

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

    async getGenreName(genre_id) {
        if (this.#genres_by_id.size === 0) {
            let genres = await this.listGenres();
            genres.forEach(g => {
                this.#genres_by_id.set(g.genreid, g.label);
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

    async listUsers() {
        return await this.#get('/user/list');
    }

    async startSession(sessionname, disabled_genres) {
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
        if (this.#movies_by_id.has(movieId)) {
            return this.#movies_by_id.get(movieId);
        }
        let movie = await this.#get('/movie/get/' + movieId);
        this.#movies_by_id.set(movieId, movie);
        return movie;
    }

    async #get(endpoint) {
        const response = await fetch(this.#apiBaseUrl() + endpoint, {
            method: 'GET',
        });
        if (response.status === 500) {
            const error = this.#extractErrorFromResponseText(await response.text());
            Kinder.masterError(error);
            throw new Error('received 500 status code!');
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
            const error = this.#extractErrorFromResponseText(await response.text());
            Kinder.masterError(error);
            throw new Error('received 500 status code!');
        }
        return await response.json();
    }

    #extractErrorFromResponseText(text) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const content = doc.querySelector('body').innerHTML;
        return content;
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