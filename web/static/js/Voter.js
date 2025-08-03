import { Kinder } from './index.js';
import { Fetcher } from './Fetcher.js';
import { MovieId } from './MovieId.js';

export class Voter {
    #votingContainerSelector = 'div[name="voting-container"]';

    #stopButtonSelector = 'div[name="session-stop-button"]';

    #session = null;
    #user = null;
    #movie = null;

    #reminder = null;
    #reminderDelay = 3500;

    #swipeOffset = 75;
    #swipeStartX = 0;

    #reVoteToast = null;

    #endConditionSelector = 'div[name="session-end-condition"]';
    #votesEndConditionSelector = this.#endConditionSelector + ' span[name="votes"]';

    #moviesVotes = new Set();
    #previousVotes = null;

    constructor(session, user) {
        this.#session = session;
        this.#user = user;
        this.#init();
    }

    show() {
        let next_movie = Fetcher.getInstance().getNextMovie(this.#session.session_id, this.#user.user_id)
        this.#displayNextMovie(next_movie);
    }

    #endSession(reason) {
        this.#over();
        document.dispatchEvent(new Event('kinder.over.voter'));
        Kinder.persistantToast(reason, 'The vote is over!');
    }

    #over() {
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
    }

    #displayNextMovie(next_movie_promise, countVote = false) {
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
            let name = provider.name.toLowerCase();
            if (!this.#session.movie_provider.includes(name)) {
                continue;
            }
            const template = document.getElementById('provider-template');
            const sourceOverlay = document.importNode(template.content, true);
            let providerLogo = '<img src="static/images/logo_' + name + '.png" width="40" class="mt-2 me-2">';
            sourceOverlay.querySelector('span[name="provider"]').innerHTML = providerLogo;
            providers.push(sourceOverlay);
        }
        return providers;
    }

    #createTitleOverlay() {
        const template = document.getElementById('title-template');
        const titleOverlay = document.importNode(template.content, true);
        let title = Kinder.buildMovieTitle(this.#movie.title, this.#movie.year);
        if (title !== undefined && title !== null && title !== '' && !this.#movie.thumbnail) {
            titleOverlay.querySelector('div[name="title"]').innerHTML = '<h3>' + title  + '</h3>';
        } else if (this.#session.overlays.title !== undefined && this.#session.overlays.title !== null && this.#session.overlays.title
            && title !== null && title !== '') {
            titleOverlay.querySelector('div[name="title"]').innerHTML = '<h3>' + title  + '</h3>';
        }
        return titleOverlay;
    }

    #createDurationOverlay() {
        const template = document.getElementById('duration-template');
        const duration = document.importNode(template.content, true);
        if (this.#session.overlays.duration && this.#movie.runtime && this.#movie.runtime > 0) {
            let hours = Math.floor(this.#movie.runtime / 60).toString().padStart(2, '0');
            let minutes = Math.floor(this.#movie.runtime - (hours * 60)).toString().padStart(2, '0');
            duration.querySelector('div[name="duration"]').innerHTML = hours + ':' + minutes;
        }
        return duration;
    }

    #createWatchedOverlay() {
        const template = document.getElementById('watched-template');
        const duration = document.importNode(template.content, true);
        if (this.#session.overlays.watched && this.#movie.playcount !== undefined && this.#movie.playcount !== null && this.#movie.playcount >= 0) {
            if (this.#movie.playcount && this.#movie.playcount > 0) {
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
        let fsk = this.#movie.age;
        if (this.#session.overlays.age && fsk !== undefined && fsk !== null) {
            let image = document.createElement('img');
            image.alt = this.#movie.age;
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
        if (this.#session.overlays.genres === undefined || this.#session.overlays.genres === null || !this.#session.overlays.genres) {
            return tags;
        }
        for (const genre in this.#movie.genres) {
            const template = document.getElementById('genre-tag-template');
            const tag = document.importNode(template.content, true);
            tag.querySelector('span[name="genre"]').innerHTML = this.#movie.genres[genre].name;
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

        let _this = this;
        document.addEventListener('maxVotes.init', (e) => {
            _this.#previousVotes =  e.detail.userVotes;
            _this.#updateVoteCount();
        });
       document.addEventListener('kinder.over.time', () => { _this.#over(); });
       document.addEventListener('kinder.over.match', () => { _this.#over(); });
    }

    #createMovieDisplay() {
        const movie = document.createElement('div');
        movie.setAttribute('name', 'movie-display');
        return movie;
    }

    #voteYes() {
        this.#updateVoteCount(this.#movie.movie_id);
        let next_movie = Fetcher.getInstance().voteMovie(this.#session.session_id, this.#user.user_id, this.#movie.movie_id, 'pro');
        let vote = this.#createToastMessage(true);
        this.#reVoteToast = Kinder.overwriteableToast(vote, '<i class="bi bi-person-raised-hand"></i> Last vote');
        this.#displayNextMovie(next_movie);
    }

    #voteNo() {
        this.#updateVoteCount(this.#movie.movie_id);
        let next_movie = Fetcher.getInstance().voteMovie(this.#session.session_id, this.#user.user_id, this.#movie.movie_id, 'contra');
        let vote = this.#createToastMessage(false);
        this.#reVoteToast = Kinder.overwriteableToast(vote, '<i class="bi bi-person-raised-hand"></i> Last vote');
        this.#displayNextMovie(next_movie);
    }

    #updateVoteCount(movie_id) {
        let maxVotes = this.#session.end_conditions.max_votes;
        if (maxVotes <= 0) {
            return;
        }

        if (movie_id !== undefined && movie_id !== null) {
            this.#moviesVotes.add(MovieId.toKeyByObject(movie_id));
        }

        if (this.#previousVotes === null) {
            return;
        }

        let userVotes = this.#previousVotes + this.#moviesVotes.size;
        if (userVotes >= maxVotes) {
            // Calling endSession would lead to double callings, because
            // initial we call nextMovie which already would lead to an endSession call
            // (if applyable)
            // this.#endSession('Max votes reached!');
            return;
        }

        let clazz = 'text-bg-secondary';
        let votesLeft = maxVotes - userVotes;
        if (votesLeft <= maxVotes*0.1) {
            clazz = 'text-bg-danger';
        } else if (votesLeft <= maxVotes*0.2) {
            clazz = 'text-bg-warning';
        }
        let text = '<i class="bi bi-person-raised-hand"></i> ' + userVotes + '/' + maxVotes;
        let voteInfo = document.querySelector(this.#votesEndConditionSelector);
        // Session already ended in another way and element is gone
        if (voteInfo === undefined || voteInfo === null) {
            return;
        }
        voteInfo.innerHTML = '<h4><span class="badge ' + clazz + '">' + text + '</span></h4>'
        voteInfo.classList.remove('d-none');
    }

    #createToastMessage(thumbsUp) {
        let vote = document.createElement('div');
        vote.classList.add('d-flex');

        let titleElement = document.createElement('span')
        titleElement.classList.add('flex-grow-1');
        let title = Kinder.buildMovieTitle(this.#movie.title, this.#movie.year);
        if (thumbsUp) {
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
            this.#reVoteToast = Kinder.overwriteableToast(title, 'Re-vote');
            // displayNextMovie expects promise of movie
            this.#displayNextMovie(Fetcher.getInstance().getMovie(previousMovie.movie_id));
        });
        return vote;
    }
}