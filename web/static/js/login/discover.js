export class TMDBDiscover {

    #loginContainer;
    #discover;

    constructor(loginContainer) {
        this.#loginContainer = loginContainer;

        this.#init();
    }

    #init() {
        let _this = this;
        this.#loginContainer.addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            _this.#initDiscover(settings);
        });
    }

    #initDiscover(settings) {
        this.#discover = settings.discover;
    }

    isValid() {
        return true;
    }

    validate(buttonChek = true) {
        if (buttonChek) {
            this.#loginContainer.dispatchEvent(new Event('loginButtonCheckRequest'));
        }
    }

    getSortBy() {
        return this.#discover.sort_by;
    }

    getSortOrder() {
        return this.#discover.sort_order;
    }

    getReleaseYearStart() {
        return this.#discover.release_year_start;
    }

    getReleaseYearEnd() {
        return this.#discover.release_year_end;
    }

    getVoteAverage() {
        return this.#discover.vote_average;
    }
    
    getVoteCount() {
        return this.#discover.vote_count;
    }

    getTotal() {
        return this.#discover.total;
    }

    getChunks() {
        return this.#discover.chunks;
    }
    
    getDistribution() {
        return this.#discover.distribution;
    }

    getDiscover() {
        return {
            sort_by: this.getSortBy(),
            sort_order: this.getSortOrder(),
            release_year_start: this.getReleaseYearStart(),
            release_year_end: this.getReleaseYearEnd(),
            vote_average: this.getVoteAverage(),
            vote_count: this.getVoteCount(),
            total: this.getTotal(),
            chunks: this.getChunks(),
            distribution: this.getDistribution()
        };
    }
}