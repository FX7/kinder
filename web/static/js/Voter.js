import { Kinder } from './index.js';
import { Fetcher } from './Fetcher.js';

export class Voter {
    #votingContainerSelector = 'div[name="voting-container"]';

    #stopButtonSelector = 'div[name="session-stop-button"]';

    #endConditionSelector = 'div[name="session-end-condition"]';

    #session = null;
    #user = null;
    // movie.movie_id
    // movie.title
    // movie.plot
    // movie.thumbnail
    #movie = null;

    #reminder = null;
    #reminderDelay = 3500;

    #endConditionRefresh = null;

    #swipeOffset = 75;
    #swipeStartX = 0;

    #reVoteToast = null;

    constructor(session, user) {
        this.#session = session;
        this.#user = user;
        this.#init();
    }

    show() {
        let next_movie = Fetcher.getInstance().getNextMovie(this.#session.session_id, this.#user.user_id)
        this.#displayNextMovie(next_movie);
        this.#displayEndCondition();
    }

    #displayEndCondition() {
        let maxTime = this.#session.end_max_minutes;
        if (maxTime <= 0) {
            return;
        }
        if (this.#endConditionRefresh) {
            clearTimeout(this.#endConditionRefresh);
        }

        maxTime = maxTime*60;
        let now = new Date();
        let startDate = new Date(this.#session.start_date);
        const timeDifference = (startDate - now)/1000;
        const timeLeft = timeDifference + maxTime;
        const endInfo = document.querySelector(this.#endConditionSelector);
        if (timeLeft <= 0) {
            endInfo.innerHTML = '<h4><span class="badge text-bg-secondary">The vote is over!</span></h4>'
        } else {
            const hours = Math.floor(timeLeft / 3600);
            const minutes = Math.ceil((timeLeft % 3600) / 60);
            const seconds = Math.floor(timeLeft % 60);
            let text = '';
            let clazz = 'text-bg-secondary';

            if (hours > 1) {
                text = hours + ' hours left';
            } else if (minutes > 1) {
                text = minutes + ' minutes left';
            } else {
                if (seconds <= 10) {
                    clazz = 'text-bg-danger';
                }
                else if (seconds <= 30) {
                    clazz = 'text-bg-warning';
                }
                text = seconds + ' seconds left';
            }
            endInfo.innerHTML = '<h4><span class="badge ' + clazz + '">' + text + '</span></h4>'
            let _this = this;
            setTimeout(() => {_this.#displayEndCondition(); }, 1000);
        }
    }

    #endSession(reason) {
        if (this.#reminder) {
            clearTimeout(this.#reminder);
        }
        if (this.#reVoteToast !== undefined && this.#reVoteToast !== null) {
            let btToast = bootstrap.Toast.getInstance(this.#reVoteToast);
            if (btToast !== undefined && btToast !== null) {
                btToast.hide()
            }
        }
        // remove the spinner
        const movieDisplay = document.querySelector(this.#votingContainerSelector + ' div[name="movie-display"]');
        while (movieDisplay.hasChildNodes()) {
            movieDisplay.firstChild.remove();
        }
        document.dispatchEvent(new Event('kinder.over'));
        Kinder.persistantToast(reason, 'The vote is over!');
    }

    #displayNextMovie(next_movie_promise) {
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
            let reason = value['over'];
            if (reason !== undefined && reason !== null) {
                this.#endSession(reason);
            } else {
                this.#movie = value;
                this.#buildMovie();
            }
        });
        
    }

    #buildMovie() {
        const movieDisplay = document.querySelector(this.#votingContainerSelector + ' div[name="movie-display"]');

        let title = this.#createTitleOverlay();
        let provider = this.#createProviderOverlay();
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
        provider.forEach((p) => imageOverlays.querySelector('.top-right-overlay').appendChild(p));
        imageOverlays.querySelector('.bottom-center-overlay').appendChild(title);
        imageOverlays.querySelector('.bottom-right-overlay').appendChild(watched);
        imageOverlays.querySelector('.bottom-right-overlay').appendChild(duration);
        imageOverlays.querySelector('.bottom-left-overlay').appendChild(age);
        movieDisplay.appendChild(plot);

        var _this = this;
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

    #createProviderOverlay() {
        let providers = [];
        for (let i=0; i<this.#movie.provider.length; i++) {
            let provider = this.#movie.provider[i];
            if (!this.#session.movie_provider.includes(provider.toLowerCase())) {
                continue;
            }
            const template = document.getElementById('provider-template');
            const sourceOverlay = document.importNode(template.content, true);
            provider = '<img src="static/images/logo_' + provider.toLowerCase() + '.png" width="40" class="mt-2 me-2">';
            sourceOverlay.querySelector('span[name="provider"]').innerHTML = provider;
            providers.push(sourceOverlay);
        }
        return providers;
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
        if (this.#movie.overlay.runtime && this.#movie.overlay.runtime > 0) {
            let hours = Math.floor(this.#movie.overlay.runtime / 60).toString().padStart(2, '0');
            let minutes = Math.floor(this.#movie.overlay.runtime - (hours * 60)).toString().padStart(2, '0');
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
        for (const genre in this.#movie.overlay.genre) {
            const template = document.getElementById('genre-tag-template');
            const tag = document.importNode(template.content, true);
            tag.querySelector('span[name="genre"]').innerHTML = this.#movie.overlay.genre[genre];
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
        const stopButton = document.querySelector(this.#stopButtonSelector);
        stopButton.addEventListener('click', () => { window.location = '/'; });

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
        let vote = this.#createToastMessage(true);
        this.#reVoteToast = Kinder.overwriteableToast(vote, 'Last vote');
        this.#displayNextMovie(next_movie);
    }

    #voteNo() {
        let next_movie = Fetcher.getInstance().voteMovie(this.#session.session_id, this.#user.user_id, this.#movie.movie_id, 'contra');
        let vote = this.#createToastMessage(false);
        this.#reVoteToast = Kinder.overwriteableToast(vote, 'Last vote');
        this.#displayNextMovie(next_movie);
    }

    #createToastMessage(up) {
        let vote = document.createElement('div');
        vote.classList.add('d-flex');

        let titleElement = document.createElement('span')
        titleElement.classList.add('flex-grow-1');
        let title = Kinder.buildMovieTitle(this.#movie.title, this.#movie.year);
        if (up) {
            titleElement.innerHTML = '<i class="bi bi-hand-thumbs-up-fill fs-6"></i> ' + title
        } else {
            titleElement.innerHTML = '<i class="bi bi-hand-thumbs-down-fill fs-6"></i> ' + title;
        }
        vote.appendChild(titleElement)

        let reVoteBtn = document.createElement('button');
        reVoteBtn.type = 'button';
        reVoteBtn.classList.add('btn', 'btn-secondary', 'btn-sm', 'ms-3');
        reVoteBtn.innerHTML = '<i class="bi bi-arrow-counterclockwise"></i>';
        vote.appendChild(reVoteBtn);

        // because after toast this.movie will be another movie
        let previousMovie = this.#movie;
        reVoteBtn.addEventListener('click', () => {
            let title = Kinder.buildMovieTitle(previousMovie.title, previousMovie.year);
            Kinder.overwriteableToast(title, 'Re-vote');
            // displayNextMovie expects promise of movie
            this.#displayNextMovie(Fetcher.getInstance().getMovie(previousMovie.movie_id));
        });
        return vote;
    }
}