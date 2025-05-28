class Voter {

    #votingContainerSelector = 'div[name="voting-container"]';

    #session = null;
    #random = null;
    #seed = null;

    constructor(session) {
        this.#session = session;
        this.#init();
    }

    async show() {
        const votingContainer = document.querySelector(this.#votingContainerSelector);
        votingContainer.classList.remove('d-none');

        let movieId = await this.#nextMovie();
        votingContainer.innerHTML = movieId;
    }

    #init() {
        this.#seed = this.#session.seed;
        let _this = this;
        this.#random = () => {
            // Linear Congruential Generator (LCG)
            _this.#seed = (_this.#seed * 48271) % 2147483647; // 2^31 - 1
            return (_this.#seed - 1) / 2147483646; // Normalisierung auf [0, 1)
        }

        const votingContainer = document.querySelector(this.#votingContainerSelector);
        while (votingContainer.hasChildNodes()) {
            votingContainer.firstChild.remove();
        }
    }

    async #nextMovie() {
        const movies = await Fetcher.getInstance().listMovies();
        const index = Math.floor(this.#random() * movies.length); // Zufälliger Index
        return movies[index];
    }
}