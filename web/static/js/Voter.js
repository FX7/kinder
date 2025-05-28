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

        this.#displayNextMovie();
    }

    async #displayNextMovie() {
        let movieId = await this.#nextMovie();
        let movie = await Fetcher.getInstance().getMovie(movieId);
        const movieDisplay = document.querySelector(this.#votingContainerSelector + ' div[name="movie-display"]');

        // movie.title;
        // movie.plot;
        // movie.thumbnail;
        while (movieDisplay.hasChildNodes()) {
            movieDisplay.firstChild.remove();
        }
        let image = document.createElement('img');
        image.alt = movie.title;
        image.classList.add('movie-poster');
        if (movie.thumbnail) {
            image.src =  "data:image/jpb;base64," + movie.thumbnail;
        } else {
            image.src = 'static/images/poster-template.jpg';
        }
        // <img src="pic_trulli.jpg" alt="Italian Trulli">
        movieDisplay.appendChild(image);
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

        const yes = this.#createYesInput();
        const movie = this.#createMovieDisplay();
        const no = this.#createNoInput();

        votingContainer.appendChild(yes);
        votingContainer.appendChild(movie);
        votingContainer.appendChild(no);
    }

    #createMovieDisplay() {
        const movie = document.createElement('div');
        movie.setAttribute('name', 'movie-display');
        return movie;
    }

    #createYesInput() {
        const container = document.createElement('div');
        const yes = document.createElement('button');
        yes.setAttribute('type', 'button');
        yes.classList.add('btn', 'btn-success');
        yes.innerHTML = 'Pro';
        yes.addEventListener('click', () => {
            Kinder.toast('Yes');
            this.#displayNextMovie();
        });
        container.appendChild(yes);
        return container;
    }

    #createNoInput() {
        const container = document.createElement('div');
        const no = document.createElement('button');
        no.setAttribute('type', 'button');
        no.classList.add('btn', 'btn-danger');
        no.innerHTML = 'Contra';
        no.addEventListener('click', () => { 
            Kinder.toast('No');
            this.#displayNextMovie();
        });
        container.appendChild(no);
        return container;
    }

    async #nextMovie() {
        const movies = await Fetcher.getInstance().listMovies();
        const index = Math.floor(this.#random() * movies.length); // Zufälliger Index
        return movies[index];
    }
}