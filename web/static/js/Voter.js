import { Kinder } from './index.js';
import { Fetcher } from './Fetcher.js';
import { MovieId } from './MovieId.js';
import { MovieDisplay } from './MovieDisplay.js';

export class Voter {
    #votingContainerSelector = 'div[name="voting-container"]';

    #menuButton;
    #menuOpenedIcon;
    #menuClosedIcon;
    #stopButton;
    #shareButton;

    #session = null;
    #user = null;
    #reminderSettings = null;
    #movie = null;

    #reminder = null;
    #reminderDelay = 3500;

    #swipeOffset = 75;
    #swipeStartX = 0;

    #reVoteToast = null;

    constructor(session, user, reminderSettings) {
        this.#session = session;
        this.#user = user;
        this.#reminderSettings = reminderSettings
        this.#reminderDelay = reminderSettings.min;
        this.#menuButton = document.querySelector('div[name="options"] button[name="burger"]');
        this.#menuOpenedIcon = document.querySelector('div[name="options"] i[name="open"]');
        this.#menuClosedIcon = document.querySelector('div[name="options"] i[name="close"]');
        this.#stopButton = document.querySelector('div[name="options"] button[name="session-stop-button"]');
        this.#shareButton = document.querySelector('div[name="options"] button[name="session-share"]');
        this.#init();
    }

    show() {
        let next_movie = Fetcher.getInstance().getNextMovie(this.#session.session_id, this.#user.user_id)
        this.#displayNextMovie(next_movie);
    }

    #endSession(reason) {
        this.#over();
        document.dispatchEvent(new Event('kinder.over.voter'));
        Kinder.overwriteableToast(reason, 'The vote is over!', 'kinder.over');
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
            if (this.#reminderDelay < this.#reminderSettings.max) {
                this.#reminderDelay += this.#reminderSettings.offset;
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

    #createVotingOverlays(pro, contra) {
        let _this = this;
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
    }

    #buildMovie() {
        const movieContainer = document.querySelector(this.#votingContainerSelector + ' div[name="movie-display"]');
        let movie = new MovieDisplay(movieContainer, this.#movie, this.#session);
        movie.build();
        this.#createVotingOverlays(movie.getProArea(), movie.getContraArea());

        var _this = this;
        if (this.#reminderSettings.min > 0 && this.#reminderSettings.max > 0) {
            this.#reminder = setTimeout(() => { _this.#flashProConArea() }, this.#reminderDelay);
        }
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
                if (this.#reminderDelay > this.#reminderSettings.min) {
                    this.#reminderDelay -= this.#reminderSettings.offset;
                }
                _this.#reminder = setTimeout(() => { _this.#flashProConArea() }, _this.#reminderDelay);
            }, 300)
        }, 300);
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

    #share() {
        const shareUrl = Fetcher.getInstance().buildJoinUrl(this.#session);
        if (navigator.share) {
            navigator.share({
                title: this.#user.name + ' invited you to join K-inder session "' + this.#session.name + '":',
                url: shareUrl
            }).catch(() => {});
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                Kinder.timeoutToast('Link to session "' + this.#session.name + '" copied to clipboard.', 'Session link copied!');
            });
        } else {
            window.prompt('Copy link to session "' + this.#session.name + '":', shareUrl);
        }
    }

    #toggleMenu() {
        if (this.#menuOpenedIcon.classList.contains('d-none')) {
            this.#menuClosedIcon.classList.add('d-none');
            this.#menuOpenedIcon.classList.remove('d-none');
            this.#stopButton.classList.remove('d-none');
            this.#shareButton.classList.remove('d-none');
        } else {
            this.#menuClosedIcon.classList.remove('d-none');
            this.#menuOpenedIcon.classList.add('d-none');
            this.#stopButton.classList.add('d-none');
            this.#shareButton.classList.add('d-none');
        }
    }

    #init() {
        this.#menuButton.addEventListener('click', () => { this.#toggleMenu(); });
        this.#stopButton.addEventListener('click', () => { window.location = '/'; });
        this.#shareButton.addEventListener('click', () => { this.#share(); });

        const votingContainer = document.querySelector(this.#votingContainerSelector);
        while (votingContainer.hasChildNodes()) {
            votingContainer.firstChild.remove();
        }

        const movie = this.#createMovieDisplay();
        votingContainer.appendChild(movie);

        let _this = this;
        document.addEventListener('kinder.over.time', () => { _this.#over(); });
        document.addEventListener('kinder.over.match', () => { _this.#over(); });
    }

    #createMovieDisplay() {
        const movie = document.createElement('div');
        movie.setAttribute('name', 'movie-display');
        return movie;
    }

    #voteYes() {
        this.#updateVoteCount(this.#movie.movie_id, true);
        let next_movie = Fetcher.getInstance().voteMovie(this.#session.session_id, this.#user.user_id, this.#movie.movie_id, 'pro');
        let vote = this.#createToastMessage(true);
        this.#reVoteToast = Kinder.overwriteableToast(vote, '<i class="bi bi-person-raised-hand"></i> Last vote');
        this.#displayNextMovie(next_movie);
    }

    #voteNo() {
        this.#updateVoteCount(this.#movie.movie_id, false);
        let next_movie = Fetcher.getInstance().voteMovie(this.#session.session_id, this.#user.user_id, this.#movie.movie_id, 'contra');
        let vote = this.#createToastMessage(false);
        this.#reVoteToast = Kinder.overwriteableToast(vote, '<i class="bi bi-person-raised-hand"></i> Last vote');
        this.#displayNextMovie(next_movie);
    }

    #updateVoteCount(movie_id, pro) {
        document.dispatchEvent(new CustomEvent('vote', {
            detail: {
                movie_id: movie_id,
                pro: pro
            }
        }));
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