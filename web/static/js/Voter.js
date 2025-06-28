import { Kinder } from './index.js';
import { Fetcher } from './Fetcher.js';

export class Voter {
    #votingContainerSelector = 'div[name="voting-container"]';

    #session = null;
    #user = null;
    // movie.movie_id
    // movie.title
    // movie.plot
    // movie.thumbnail
    #movie = null;

    #reminder = null;
    #reminderDelay = 3500;

    #swipeOffset = 75;
    #swipeStartX = 0;

    constructor(session, user) {
        this.#session = session;
        this.#user = user;
        this.#init();
    }

    show() {
        let next_movie = Fetcher.getInstance().getNextMovie(this.#session.session_id, this.#user.user_id)
        this.#displayNextMovie(next_movie);
    }

    #displayNextMovie(next_movie_promise) {
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

        next_movie_promise.then(async (value) => {
            let warning = value['warning'];
            if (warning !== undefined && warning !== null) {
                if (this.#reminder) {
                    clearTimeout(this.#reminder);
                }
                document.dispatchEvent(new Event('kinder.over'));
                return;
            }
            this.#movie = value;
    
            let title = this.#createTitleOverlay();
            let image = this.#createMovieImageElement();
            let genres = this.#createGenreOverlays();
            let duration = this.#createDurationOverlay();
            let watched = this.#createWatchedOverlay();
            let age = this.#createAgeOverlay();
            let plot = this.#createMoviePlotElement();
    
            let imageOverlays = image.querySelector('div[name="image-overlays"]');
            movieDisplay.querySelector('div[name="spinner"]').remove();
            movieDisplay.appendChild(image);
            genres.forEach((g) => imageOverlays.querySelector('.top-left-overlay').appendChild(g));
            imageOverlays.querySelector('.bottom-center-overlay').appendChild(title);
            imageOverlays.querySelector('.bottom-right-overlay').appendChild(watched);
            imageOverlays.querySelector('.bottom-right-overlay').appendChild(duration);
            imageOverlays.querySelector('.bottom-left-overlay').appendChild(age);
            movieDisplay.appendChild(plot);
    
            this.#reminder = setTimeout(() => { _this.#flashProConArea() }, this.#reminderDelay);
        });
        
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
                if (this.#reminderDelay > 3500) {
                    this.#reminderDelay -= 500;
                }
                _this.#reminder = setTimeout(() => { _this.#flashProConArea() }, _this.#reminderDelay);
            }, 300)
        }, 300);
    }

    #createMoviePlotElement() {
        let title = document.createElement('div');

        title.classList.add('m-2', 'p-3', 'shadow');
        if (this.#movie.plot === undefined || this.#movie.plot === null || this.#movie.plot === '') {
            title.classList.add('d-none');
        } else {
            title.innerHTML = this.#movie.plot;
        }

        return title;
    }

    #createTitleOverlay() {
        const template = document.getElementById('title-template');
        const titleOverlay = document.importNode(template.content, true);
        let title = Kinder.buildMovieTitle(this.#movie.overlay.title, this.#movie.year);
        if (title !== undefined && title !== null) {
            titleOverlay.querySelector('div[name="title"]').innerHTML = '<h3>' + title  + '</h3>';
        }
        return titleOverlay;
    }

    #createDurationOverlay() {
        const template = document.getElementById('duration-template');
        const duration = document.importNode(template.content, true);
        if (this.#movie.overlay.duration && this.#movie.overlay.duration > 0) {
            let hours = Math.floor(this.#movie.overlay.duration / 60).toString().padStart(2, '0');
            let minutes = Math.floor(this.#movie.overlay.duration - (hours * 60)).toString().padStart(2, '0');
            duration.querySelector('div[name="duration"]').innerHTML = hours + ':' + minutes;
        }
        return duration;
    }

    #createWatchedOverlay() {
        const template = document.getElementById('watched-template');
        const duration = document.importNode(template.content, true);
        if (this.#movie.overlay.watched !== undefined && this.#movie.overlay.watched !== null && this.#movie.overlay.watched >= 0) {
            if (this.#movie.overlay.watched && this.#movie.overlay.watched > 0) {
                duration.querySelector('div[name="watch-state"]').innerHTML = '<i class="bi bi-eye-fill"></i>';
            } else {
                duration.querySelector('div[name="watch-state"]').innerHTML = '<i class="bi bi-eye-slash-fill"></i>';
            }
        }
        return duration;
    }

    #createAgeOverlay() {
        const template = document.getElementById('age-template');
        const ageOverlay = document.importNode(template.content, true);
        let fsk = this.#movie.overlay.age;
        if (fsk !== undefined && fsk !== null) {
            let image = document.createElement('img');
            image.alt = this.#movie.overlay.age;
            image.src = 'static/images/fsk' + fsk + '.png';
            if (window.innerWidth >= 1060) {
                image.width = '80';
            } else {
                image.width = '65';
            }
            ageOverlay.querySelector('span[name="age"]').appendChild(image);
        }
        return ageOverlay;
    }


    #createGenreOverlays() {
        let tags = []
        for (const genre in this.#movie.overlay.genres) {
            const template = document.getElementById('genre-tag-template');
            const tag = document.importNode(template.content, true);
            tag.querySelector('span[name="genre"]').innerHTML = this.#movie.overlay.genres[genre];
            tags.push(tag);
        }
        return tags;
    }

    #createMovieImageElement() {
        var _this = this;
        const template = document.getElementById('image-template');
        const container = document.importNode(template.content, true);
        let image = container.querySelector('img[name="image"]')
        image.alt = this.#movie.title;
        if (this.#movie.thumbnail) {
            image.src = this.#movie.thumbnail;
        } else {
            image.src = 'static/images/poster-dummy.jpg';
        }

        const contra = container.querySelector('div[name="contra-area"]');
        const pro = container.querySelector('div[name="pro-area"]');
        contra.addEventListener('click', () => { this.#voteNo(); });
        pro.addEventListener('click', () => { this.#voteYes(); });

        contra.addEventListener('touchstart', (e) => {
            _this.#swipeStartX = e.touches[0].clientX; // Speichere die Startposition
        });
        pro.addEventListener('touchstart', (e) => {
            _this.#swipeStartX = e.touches[0].clientX; // Speichere die Startposition
        });
        contra.addEventListener('touchmove', (e) => { e.preventDefault(); }); // Verhindere das Scrollen
        pro.addEventListener('touchmove', (e) => { e.preventDefault(); }); // Verhindere das Scrollen
        contra.addEventListener('touchend', (e) => { _this.#touchMoveEvaluation(e); });
        pro.addEventListener('touchend', (e) => { _this.#touchMoveEvaluation(e); });

        return container;
    }

    #touchMoveEvaluation(event) {
        const endX = event.changedTouches[0].clientX; // Endposition
        const diffX = endX - this.#swipeStartX;
        if (Math.abs(diffX) > this.#swipeOffset) {
            if (diffX > 0) {
                this.#voteYes();
            } else {
                this.#voteNo();
            }
        }
    }

    #init() {
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
        let next_movie = Fetcher.getInstance().voteMovie(this.#session.session_id, this.#user.user_id, this.#movie.movie_id, 'pro');
        let vote = '<i class="bi bi-hand-thumbs-up-fill"></i> ' + Kinder.buildMovieTitle(this.#movie.title, this.#movie.year);
        Kinder.overwriteableToast(vote, 'Last vote');
        this.#displayNextMovie(next_movie);
    }

    #voteNo() {
        let next_movie = Fetcher.getInstance().voteMovie(this.#session.session_id, this.#user.user_id, this.#movie.movie_id, 'contra');
        let vote = '<i class="bi bi-hand-thumbs-down-fill"></i> ' + Kinder.buildMovieTitle(this.#movie.title, this.#movie.year);
        Kinder.overwriteableToast(vote, 'Last vote');
        this.#displayNextMovie(next_movie);
    }
}