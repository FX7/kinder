class Fetcher {
    #apiBase = '/api/v1';
    static #instance;

    constructor() {
    }

    async register(username) {
        let data = {
            username: username
        }

        return this.#post('/user/register', data);
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