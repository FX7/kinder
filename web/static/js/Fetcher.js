class Fetcher {
    #apiBase = '/api/v1';
    static #instance;

    #movieIds = null;
    #genres = null;

    #movies_by_id = new Map();
    #genres_by_id = new Map();

    constructor() {
    }

    async getNextMovie(session_id, user_id) {
        let next = await this.#get('/session/next/' + session_id + '/' + user_id + '/-1');
        return next;
    }

    async getSessionStatus(session_id) {
        let status = await this.#get('/session/status/' + session_id);
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

    async getUser(id) {
        const users = await this.listUsers();
        for (let i=0; i<users.length; i++) {
            let user = users[i];
            if (user.user_id === id) {
                return user;
            }
        }
        return null;
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

    async getMovie(movieId) {
        if (this.#movies_by_id.has(movieId)) {
            return this.#movies_by_id.get(movieId);
        }
        let movie = await this.#get('/movie/get/' + movieId);
        this.#movies_by_id.set(movieId, movie);
        return movie;
    }

    async #get(endpoint, baseUrl = this.#apiBaseUrl(), asJson=true) {
        const response = await fetch(baseUrl + endpoint, {
            method: 'GET',
        });
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