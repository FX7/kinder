import { Kinder } from './index.js';
import { Fetcher } from './Fetcher.js';
import { MovieId } from './MovieId.js';
import { MovieDisplay } from './MovieDisplay.js';

export class SessionStatus {
    #session = null;
    #user = null;

    #statusSelector = 'div[name="session-status"]'

    #statusButtonSelector = 'button[name="session-status-button"]';
    #matchBadge = this.#statusButtonSelector + ' span[name="match-badge"]';

    #titleSelector = this.#statusSelector + ' h1[name="title"]';
    #topSelector = this.#statusSelector + ' div[name="top"]'
    #flopSelector = this.#statusSelector + ' div[name="flop"]'

    #matchCounter = new Map(); // movie_id -> pro votes
    #topAndFlopMovies = new Map(); // movie_id -> vote
    #knownUsers = new Set();
    #refreshRunning = false;

    #autoRefresh = null;
    #maxVoteCountInitialized = false;

    #match_action;
    #top_count = Number.MIN_VALUE;
    #flop_count = Number.MIN_VALUE;

    #is_final = false;

    constructor(session, user) {
        this.#session = session;
        this.#user = user;
        this.#init();
        let _this = this
        this.#refreshTopsAndFlops(true);
        this.#autoRefresh = setInterval(() => { _this.#refreshTopsAndFlops(); }, Kinder.sessionStatusInterval);

        document.addEventListener('kinder.over.voter', () => { _this.#over(); });
        document.querySelector(this.#statusSelector).addEventListener('hide.bs.modal', () => {
            _this.#closeAllMovies();
        });
    }

    #closeAllMovies() {
        document.querySelectorAll(this.#statusSelector + ' .list-group-item').forEach((item) => {
            let button = item.querySelector('div[name="title"]');
            let movie = item.querySelector('div[name="movie-details"]');
            if (!movie.classList.contains('d-none') && movie.children.length > 0) {
                button.dispatchEvent(new Event('click'));
            }
        });
    }

    #over() {
        // Still needs to refresh, cause of endconditions that can be reached per user
        // and not per session. E.g.: Max votes per user.
        // clearInterval(_this.#autoRefresh);
        this.#is_final = true;
        this.show();
    }

    #init() {
        this.#initSettings();

        const statusButton = document.querySelector(this.#statusButtonSelector);
        statusButton.addEventListener('click', () => { this.show(); });

        const container = document.querySelector(this.#statusSelector);
        container.querySelector('button.btn-close').addEventListener('click', () => { this.#closeClicked(); });

        statusButton.classList.remove('d-none');

        let _this = this;
        document.addEventListener('kinder.over.time', () => { _this.#over(); });
        document.addEventListener('kinder.over.match', () => { _this.#over(); });
    }

    #closeClicked() {
        if (this.#is_final) {
            window.location = '/';
        } else {
            this.hide();
        }
    }

    show() {
        Kinder.hideOverwriteableToast('match');

        const options = {};
        const statusModal = bootstrap.Modal.getOrCreateInstance(document.querySelector(this.#statusSelector), options);
        statusModal.show();
        this.#refreshTopsAndFlops(true);
    }

    hide() {
        const statusModal = bootstrap.Modal.getOrCreateInstance(document.querySelector(this.#statusSelector), {});
        statusModal.hide();
    }

    #initSettings() {
        if (this.#match_action === undefined || this.#match_action === null ||
          this.#top_count === undefined || this.#top_count === null || this.#top_count === Number.MIN_VALUE ||
          this.#flop_count === undefined || this.#flop_count === null || this.#flop_count === Number.MIN_VALUE) {
            let result = Fetcher.getInstance().settings();
            result.then((settings) => {
                this.#match_action = settings.match_action;
                this.#top_count = settings.top_count;
                this.#flop_count = settings.flop_count;
            });
        }
    }

    async #makeUserInfo(status) {
        //     "user_ids": [
        //       1,
        //       2,
        //       3,
        //       4,
        //       21,
        //       39
        //     ],
        let users = []
        users.push('<b>' + this.#user.name + '</b>');
        if (this.#user.user_id !== this.#session.creator_id) {
            const creator = await Fetcher.getInstance().getUser(this.#session.creator_id);
            users.push('<i>' + creator.name + '</i>');
        }
        let knownUsersSize = this.#knownUsers.size;
        this.#knownUsers.add(this.#user.user_id);
        for (let i=0; i<status.user_ids.length; i++) {
            let uid = status.user_ids[i];
            const user = await Fetcher.getInstance().getUser(uid);
            if (uid !== this.#user.user_id && uid !== this.#session.creator_id) {
                users.push(user.name);
                if (!this.#knownUsers.has(uid)) {
                    this.#knownUsers.add(uid);
                    if (knownUsersSize > 0) {
                        Kinder.timeoutToast('User <span class="fst-italic">' + user.name + '</span> joined!', '<i class="bi bi-person-fill"></i> New User!')
                    }
                }
            }
        }
        return '<i class="bi bi-people-fill"></i> ' + users.join(', ');
    }
    
    async #refreshTopsAndFlops(forceFresh = false) {
        if (this.#refreshRunning) {
            return;
        }
        this.#refreshRunning = true;
        let status = await Fetcher.getInstance().getSessionStatus(this.#session.session_id, forceFresh);

        //     "session": {
        //       "name": "movienight",
        //       "seed": 226498123,
        //       "session_id": 1,
        //       "start_date": "Sun, 25 May 2025 12:01:23 GMT"
        //     }
        const titleDiv = document.querySelector(this.#titleSelector);

        let title = 'Session: <b>'
            + status.session.name
            + '</b> | started '
            + new Date(this.#session.start_date).toLocaleDateString('de-DE', Kinder.shortDateTimeOptions);
        
        let userInfo = await this.#makeUserInfo(status);
        titleDiv.innerHTML = title + '<br>' + userInfo;
        
        // {
        //     "votes": [
        //       {
        //         "cons": 0,
        //         "movie_id": 1,
        //         "pros": 1,
        //         "last_vote": 2022.01.01 17:03:13.3343,
        //         "voter": "1,2,3"
        //       }
        //     ]
        //   }
        const top = document.querySelector(this.#topSelector).querySelector('ul');
        const flop = document.querySelector(this.#flopSelector).querySelector('ul');

        this.#topAndFlopMovies = new Map();

        status.votes.sort((a, b) => {
            let pro = b.pros - a.pros;
            if (pro === 0) {
                return a.cons - b.cons;
            }
            return pro;
        });

        let prosAdded = await this.#appendVotes(top, status, (v) => v.pros <= 0 || v.cons > v.pros, true, this.#top_count);
       
        status.votes.sort((a, b) => {
            let con = b.cons - a.cons;;
            if (con === 0) {
                return a.pros - b.pros;
            }
            return con;
        });
        let max = this.#flop_count;
        if (prosAdded < this.#top_count) {
            max += this.#top_count - prosAdded;
        }
        await this.#appendVotes(flop, status, (v) => v.cons <= 0 || v.pros > v.cons, false, max);

        if (status.user_ids.length > 1) {
            await this.#checkPerfectMatches(status);
        }

        this.#userMaxVotesInit(status);
        this.#refreshRunning = false;
    }

    #userMaxVotesInit(status) {
        let maxVotes = this.#session.end_conditions.max_votes;
        if (maxVotes <= 0 || this.#maxVoteCountInitialized) {
            return;
        }
        this.#maxVoteCountInitialized = true;
        let userVotes = 0;
        for (let i=0; i< status.votes.length; i++) {
            if (status.votes[i].voter.split(',').includes(this.#user.user_id.toString())) {
                userVotes++;
            }
        }
        document.dispatchEvent(new CustomEvent('maxVotes.init', {
            detail: {
                userVotes: userVotes
            }
        }));
    }

    async #checkPerfectMatches(status) {
        let matchCount = 0;
        for (const k of Array.from(this.#topAndFlopMovies.keys()).reverse()) {
            let vote = this.#topAndFlopMovies.get(k);
            let pros = vote.pros;
            let match = this.#matchCounter.get(k);
            let lastPros = 0
            if (match !== undefined && match !== null) {
                lastPros = match;
            }
            if (pros === status.user_ids.length && status.user_ids.includes(this.#user.user_id)) {
                if (pros > lastPros) { // Display toast only once or if more people joined
                    this.#matchCounter.set(k, pros);
                    this.#perfectMatchToast(k, pros);
                }
                matchCount++;
            } else if (pros < lastPros) {
                this.#matchCounter.set(k, pros);
                this.#recallToast(k);
            }
        }
        document.dispatchEvent(new CustomEvent('match', {
            detail: {
                matchCount: matchCount
            }
        }));
        this.#displayMatchBadge(matchCount);
    }

    #displayMatchBadge(matchCount) {
        const badge = document.querySelector(this.#matchBadge);
        if (matchCount <= 0) {
            badge.classList.add('d-none');
        } else {
            badge.innerHTML = matchCount.toString();
            badge.classList.remove('d-none');
        }
    }

    async #recallToast(k) {
        Kinder.hideOverwriteableToast('match');
        let movie = await Fetcher.getInstance().getMovie(MovieId.fromKey(k));
        Kinder.timeoutToast(Kinder.buildMovieTitle(movie.title, movie.year), 'Perfect match recalled!');
    }

    async #perfectMatchToast(k, pros) {
        let movie = await Fetcher.getInstance().getMovie(MovieId.fromKey(k));
        let title = '<i class="bi bi-stars"></i> Latest perfect match  ' + pros + '/' + pros + '!';
        let toast = Kinder.overwriteableToast(Kinder.buildMovieTitle(movie.title, movie.year), title, 'match');
        let body = toast.querySelector('.toast-body');
        body.classList.add('clickable', 'text-decoration-underline');
        body.addEventListener('click', () => {
            this.show();
        });
        return toast;
    }

    async #appendVotes(parentElement, status, filter, top, maxCount) {
        let count = 0;
        for (let i=0; i< status.votes.length && count < maxCount; i++) {
            let vote = status.votes[i];
            if (filter(vote)) {
                continue;
            }
            let key = MovieId.toKeyByObject(vote.movie_id);
            if (this.#topAndFlopMovies.has(key)) {
                continue;
            }
            this.#topAndFlopMovies.set(key, vote);
            let movie = await Fetcher.getInstance().getMovie(vote.movie_id);
            if (movie.error) {
                continue;
            }
            count++;
            let movieStatus = this.#buildVote(status, vote, movie, top);
            if (parentElement.children.length <= i) {
                parentElement.appendChild(movieStatus);
            } else if (parentElement.children[i].querySelector('div[name="movie-status"]').getAttribute('status-id')
              !== movieStatus.querySelector('div[name="movie-status"]').getAttribute('status-id')) {
                parentElement.replaceChild(movieStatus, parentElement.children[i]);
            }
        }
        // remove to much elements from last "overflow"
        for (let i=maxCount; i<parentElement.children.length; i++) {
            let child = parentElement.children[i];
            if (child !== undefined && child !== null) {
                parentElement.removeChild(child);
            }
        }
        return count;
    }

    #buildVote(status, vote, movie, top) {
        let clazz = top ? 'bg-success-subtle' : 'bg-danger-subtle';
        const template = document.getElementById('movie-status-template');
        const movieStatus = document.importNode(template.content, true);
        this.#buildVoteTitle(movieStatus, clazz, movie);
        let providers = [];
        for (let i=0; i<movie.provider.length; i++) {
            let provider = movie.provider[i];
            if (!this.#session.movie_provider.includes(provider.name.toLowerCase())) {
                continue;
            }
            providers.push('<img src="static/images/logo_' + provider.name.toLowerCase() + '.png" width="15" style="vertical-align:top">');
        }

        movieStatus.querySelector('div[name="info-row"] div[name="provider"]').innerHTML = providers.join('');
        movieStatus.querySelector('div[name="info-row"]').classList.add(clazz);
        movieStatus.querySelector('div[name="pros"] span[name="count"]').innerHTML = vote.pros;
        movieStatus.querySelector('div[name="cons"] span[name="count"]').innerHTML = vote.cons;
        let votes = (vote.pros + vote.cons) + '/' + status.user_ids.length;
        if (vote.pros == status.user_ids.length && status.user_ids.length > 1) {
            votes = votes + '<i class="bi bi-stars ms-1"></i>';
        }
        movieStatus.querySelector('div[name="votes"]').innerHTML = votes;
        if (top && vote.pros === status.user_ids.length && this.#match_action === 'play' && movie.provider.includes('KODI') && this.#session.movie_provider.includes('kodi')) {
            movieStatus.querySelector('div[name="action"]').addEventListener('click', () => {
                Fetcher.getInstance().playMovie(movie.movie_id);
            });
        } else {
            movieStatus.querySelector('div[name="action"]').innerHTML = '';
        }
        let attributeId = MovieId.toKeyByObject(movie.movie_id) + ':' + top + ':' + vote.pros + ':' + vote.cons + ':' + status.user_ids.length;
        movieStatus.querySelector('div[name="movie-status"]').setAttribute('status-id', attributeId);
        return movieStatus;
    }

    #buildVoteTitle(movieStatus, clazz, movie) {
        let title = movieStatus.querySelector('div[name="title"]');
        let displayContainer = movieStatus.querySelector('div[name="movie-details"');
        title.classList.add(clazz);
        let closed = document.createElement('i');
        closed.classList.add('bi', 'bi-caret-right-fill', 'me-1');
        let opened = document.createElement('i');
        opened.classList.add('bi', 'bi-caret-down-fill', 'me-1', 'd-none');
        let movieDisplay = new MovieDisplay(displayContainer, movie, this.#session);
        title.addEventListener('click', () => {
            // this means it was build before and is just hidden
            if (opened.classList.contains('d-none')) {
                if (displayContainer.classList.contains('d-none')) {
                    displayContainer.classList.remove('d-none');
                } else {
                    movieDisplay.build(false);
                }
                closed.classList.add('d-none');
                opened.classList.remove('d-none');
            } else {
                closed.classList.remove('d-none');
                opened.classList.add('d-none');
                displayContainer.classList.add('d-none');
                movieDisplay.closeTrailer();
            }
        });
        title.appendChild(closed);
        title.appendChild(opened);
        let text = document.createElement('span');
        text.innerHTML = Kinder.buildMovieTitle(movie.title, movie.year);
        title.appendChild(text);
    }
}