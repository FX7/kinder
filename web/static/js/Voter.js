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

    #reminder = null;
    #reminderDelay = 3500;

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
        var _this = this;
        if (this.#reminder) {
            clearTimeout(this.#reminder);
            if (this.#reminderDelay < 15000) {
                this.#reminderDelay += 500;
            }
        }

        const movieDisplay = document.querySelector(this.#votingContainerSelector + ' div[name="movie-display"]');

        while (movieDisplay.hasChildNodes()) {
            movieDisplay.firstChild.remove();
        }

        const template = document.getElementById('spinner-template');
        const spinner = document.importNode(template.content, true);
        movieDisplay.appendChild(spinner);

        this.#movie = await this.#nextMovie();

        let title = this.#createMovieTitleElement();
        let image = this.#createMovieImageElement();
        let genres = this.#createGenreTags();
        let plot = this.#createMoviePlotElement();

        let imageOverlays = image.querySelector('div[name="image-overlays"]');
        movieDisplay.querySelector('div[name="spinner"]').remove();
        movieDisplay.appendChild(image);
        genres.forEach((g) => imageOverlays.appendChild(g));
        imageOverlays.appendChild(title);
        movieDisplay.appendChild(plot);

        this.#reminder = setTimeout(() => { _this.#flashProConArea() }, this.#reminderDelay);
    }

    #flashProConArea() {
        var _this = this;
        const proArea = document.querySelector(this.#votingContainerSelector + ' div[name="movie-display"] .pro-area');
        const conArea = document.querySelector(this.#votingContainerSelector + ' div[name="movie-display"] .contra-area');
        conArea.classList.remove('contra-background');
        proArea.classList.add('pro-background');
        this.#reminder = setTimeout(() => {
            proArea.classList.remove('pro-background');
            conArea.classList.add('contra-background');
            _this.#reminder = setTimeout(() => {
                conArea.classList.remove('contra-background');
                _this.#reminder = setTimeout(() => { _this.#flashProConArea() }, _this.#reminderDelay);
            }, 300)
        }, 300);
    }

    #createMoviePlotElement() {
        let title = document.createElement('div');
        title.classList.add('m-2', 'p-3', 'shadow');
        title.innerHTML = this.#movie.plot;
        return title;
    }

    #createMovieTitleElement() {
        const template = document.getElementById('title-template');
        const title = document.importNode(template.content, true);
        title.querySelector('h3').innerHTML = this.#getMovieTitleAndYear();
        return title;
    }

    #createGenreTags() {
        let tags = []
        for (const genre in this.#movie.genre) {
            const template = document.getElementById('genre-tag-template');
            const tag = document.importNode(template.content, true);
            tag.querySelector('.genre-tag').innerHTML = this.#movie.genre[genre];
            tags.push(tag);
        }
        return tags;
    }

    #createMovieImageElement() {
        const template = document.getElementById('image-template');
        const container = document.importNode(template.content, true);
        let image = container.querySelector('img[name="image"]')
        image.alt = this.#movie.title;
        if (this.#movie.thumbnail) {
            image.src = this.#movie.thumbnail;
            // image.src =  "data:image/jpb;base64," + this.#movie.thumbnail;
        } else {
            image.src = 'static/images/poster-dummy.jpg';
        }

        const contra = container.querySelector('div[name="contra-area"]');
        const pro = container.querySelector('div[name="pro-area"]');
        contra.addEventListener('click', () => { this.#voteNo(); });
        pro.addEventListener('click', () => { this.#voteYes(); });

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
        let title = '<i class="bi bi-hand-thumbs-up-fill"></i> ' + this.#getMovieTitleAndYear();
        Kinder.toast(title);
        this.#displayNextMovie();
    }

    #voteNo() {
        Fetcher.getInstance().voteMovie(this.#session.session_id, this.#user.user_id, this.#movie.movie_id, 'contra');
        let title = '<i class="bi bi-hand-thumbs-down-fill"></i> ' + this.#getMovieTitleAndYear();
        Kinder.toast(title);
        this.#displayNextMovie();
    }

    #getMovieTitleAndYear() {
        let title = this.#movie.title + ' (' + this.#movie.year + ')';
        return title;
    }

    async #nextMovie() {
        const movies = await Fetcher.getInstance().listMovies();
        const index = Math.floor(this.#random() * movies.length); // Zufälliger Index
        let movieId = movies[index];
        if (this.#votedMovies.has(movieId)) {
            return this.#nextMovie();
        }
        this.#votedMovies.add(movieId);
        let movie = await Fetcher.getInstance().getMovie(movieId);
        if (await this.#hasDisabledGenre(movie)) {
            return this.#nextMovie();
        }
        return movie;
    }

    async #hasDisabledGenre(movie) {
        if (this.#session.disabled_genre_ids === undefined || this.#session.disabled_genre_ids === null || this.#session.disabled_genre_ids.length === 0) {
            return false;
        }
        for (let i=0; i<this.#session.disabled_genre_ids.length; i++) {
            let gid = this.#session.disabled_genre_ids[i];
            let name = await Fetcher.getInstance().getGenreName(gid);
            if (movie.genre.includes(name)) {
                return true;
            }
        };
        return false;
    }
}