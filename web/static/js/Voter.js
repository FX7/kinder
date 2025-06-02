class Voter {
    #votingContainerSelector = 'div[name="voting-container"]';

    #session = null;
    #user = null;
    // movie.movie_id
    // movie.title
    // movie.plot
    // movie.thumbnail
    #movie = null;
    #random = null;
    #seed = null;

    #votedMovies = new Set();

    #startX = 0;

    constructor(session, user) {
        this.#session = session;
        this.#user = user;
        this.#init();
    }

    async show() {
        const votingContainer = document.querySelector(this.#votingContainerSelector);
        votingContainer.classList.remove('d-none');

        this.#displayNextMovie();
    }

    async #displayNextMovie() {
        const movieDisplay = document.querySelector(this.#votingContainerSelector + ' div[name="movie-display"]');

        while (movieDisplay.hasChildNodes()) {
            movieDisplay.firstChild.remove();
        }

        const template = document.getElementById('spinner-template');
        const spinner = document.importNode(template.content, true);
        movieDisplay.appendChild(spinner);

        let movieId = await this.#nextMovieId();
        this.#movie = await Fetcher.getInstance().getMovie(movieId);

        let title = this.#createMovieTitleElement();
        let image = this.#createMovieImageElement();
        let plot = this.#createMoviePlotElement();

        movieDisplay.querySelector('div[name="spinner"]').remove();
        movieDisplay.appendChild(title);
        movieDisplay.appendChild(image);
        movieDisplay.appendChild(plot);
    }

    #createMoviePlotElement() {
        let title = document.createElement('div');
        title.innerHTML = this.#movie.plot;
        return title;
    }

    #createMovieTitleElement() {
        let title = document.createElement('div');
        title.innerHTML = this.#movie.title;
        return title;
    }

    #createMovieImageElement() {
        const template = document.getElementById('image-template');
        const container = document.importNode(template.content, true);
        let image = container.querySelector('img[name="image"]')
        image.alt = this.#movie.title;
        if (this.#movie.thumbnail) {
            image.src =  "data:image/jpb;base64," + this.#movie.thumbnail;
        } else {
            image.src = 'static/images/poster-dummy.jpg';
        }

        container.querySelector('div[name="left-area"]').addEventListener('click', () => { this.#voteNo(); });
        container.querySelector('div[name="right-area"]').addEventListener('click', () => { this.#voteYes(); });

        let _this = this;
        container.addEventListener('touchstart', function(e) {
            _this.#startX = e.touches[0].clientX;
        });

        container.addEventListener('touchmove', function(e) {
            const moveX = e.touches[0].clientX;
            if (_this.#startX - moveX > 50) {
                alert('Nach links gewischt!');
                e.preventDefault();
            } else if (moveX - _this.#startX > 50) {
                alert('Nach rechts gewischt!');
                e.preventDefault();
            }
        });

        return container;
    }

    async #fetchVotedMovies() {
        let voted = await Fetcher.getInstance().getVotedMovies(this.#session.session_id, this.#user.user_id);
        let _this = this;
        voted.forEach(v => _this.#votedMovies.add(v));
    }

    #init() {
        this.#seed = this.#session.seed;
        let _this = this;
        this.#random = () => {
            // Linear Congruential Generator (LCG)
            _this.#seed = (_this.#seed * 48271) % 2147483647; // 2^31 - 1
            return (_this.#seed - 1) / 2147483646; // Normalisierung auf [0, 1)
        }

        this.#fetchVotedMovies();

        const votingContainer = document.querySelector(this.#votingContainerSelector);
        while (votingContainer.hasChildNodes()) {
            votingContainer.firstChild.remove();
        }

        const movie = this.#createMovieDisplay();

        votingContainer.appendChild(movie);
    }

    #createMovieDisplay() {
        const movie = document.createElement('div');
        movie.setAttribute('name', 'movie-display');
        return movie;
    }

    #voteYes() {
        Fetcher.getInstance().voteMovie(this.#session.session_id, this.#user.user_id, this.#movie.movie_id, 'pro');
        Kinder.toast('Yes');
        this.#displayNextMovie();
    }

    #voteNo() {
        Fetcher.getInstance().voteMovie(this.#session.session_id, this.#user.user_id, this.#movie.movie_id, 'contra');
        Kinder.toast('No');
        this.#displayNextMovie();
    }

    async #nextMovieId() {
        const movies = await Fetcher.getInstance().listMovies();
        const index = Math.floor(this.#random() * movies.length); // Zufälliger Index
        let movieId = movies[index];
        if (this.#votedMovies.has(movieId)) {
            return this.#nextMovieId();
        }
        this.#votedMovies.add(movieId);
        return movieId;
    }
}