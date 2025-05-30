class Fetcher {
    #apiBase = '/api/v1';
    static #instance;

    #sessions = null;
    #movieIds = null;

    constructor() {
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

    async listSessions() {
        if (this.#sessions === null) {
            this.#sessions = await this.#get('/session/list');
        }
        return this.#sessions;
    }

    async startSession(sessionname) {
        this.#sessions = null;

        let data = {
            sessionname: sessionname
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
        let movie = await this.#get('/movie/get/' + movieId);
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