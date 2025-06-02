class Voter {

    #votingContainerSelector = 'div[name="voting-container"]';
    #proSelector = this.#votingContainerSelector + ' button[name="pro"]';
    #contraSelector = this.#votingContainerSelector + ' button[name="contra"]';

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
        document.querySelector(this.#proSelector).disabled = true;
        document.querySelector(this.#contraSelector).disabled = true;

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

        document.querySelector(this.#proSelector).disabled = false;
        document.querySelector(this.#contraSelector).disabled = false;
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
        // <img src="pic_trulli.jpg" alt="Italian Trulli">
        let image = document.createElement('img');
        image.alt = this.#movie.title;
        image.classList.add('movie-poster');
        if (this.#movie.thumbnail) {
            image.src =  "data:image/jpb;base64," + this.#movie.thumbnail;
        } else {
            image.src = 'static/images/poster-dummy.jpg';
        }
        return image;
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
        yes.name = 'pro';
        yes.classList.add('btn', 'btn-success');
        yes.innerHTML = 'Pro';
        yes.disabled = true;
        yes.addEventListener('click', () => { this.#voteYes(); });
        container.appendChild(yes);
        return container;
    }

    #createNoInput() {
        const container = document.createElement('div');
        const no = document.createElement('button');
        no.setAttribute('type', 'button');
        no.name = 'contra';
        no.classList.add('btn', 'btn-danger');
        no.innerHTML = 'Contra';
        no.disabled = true;
        no.addEventListener('click', () => { this.#voteNo(); });
        container.appendChild(no);
        return container;
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