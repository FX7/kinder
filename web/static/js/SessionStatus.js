import { Kinder } from './index.js';
import { Fetcher } from './Fetcher.js';
import { MovieId } from './MovieId.js';
import { MovieDisplay } from './MovieDisplay.js';
import { JoinInfo } from './login/joinInfo.js';

export class SessionStatus {
    #session = null;
    #user = null;
    #settings = null;

    #statusSelector = 'div[name="session-status"]'

    #statusButtonSelector = 'button[name="session-status-button"]';
    #matchBadge = this.#statusButtonSelector + ' span[name="match-badge"]';

    #titleSelector = this.#statusSelector + ' h1[name="title"]';
    #infoIntroSelector = this.#statusSelector + ' div[name="session-info-intro"]';
    #infoSelector = this.#statusSelector + ' div[name="session-info"]';
    #topHrSelector = this.#statusSelector + ' hr[name="top-hr"]';
    #topSelector = this.#statusSelector + ' div[name="top"]'
    #flopHrSelector = this.#statusSelector + ' hr[name="flop-hr"]';
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

    constructor(session, user, settings) {
        this.#session = session;
        this.#user = user;
        this.#settings = settings;
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
            let details = item.querySelector('div[name="vote-details"]');
            if (!details.classList.contains('d-none') && details.children.length > 0) {
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
        this.#makeSessionDetails(status);
        
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
            let pro = b.pro_voter.length - a.pro_voter.length;
            if (pro === 0) {
                return a.con_voter.length - b.con_voter.length;
            }
            return pro;
        });

        let prosAdded = await this.#appendVotes(top, status, (v) => v.pro_voter.length <= 0 || v.con_voter.length > v.pro_voter.length, true, this.#top_count);
       
        status.votes.sort((a, b) => {
            let con = b.con_voter.length - a.con_voter.length;
            if (con === 0) {
                return a.pro_voter.length - b.pro_voter.length;
            }
            return con;
        });
        let max = this.#flop_count;
        if (prosAdded.size < this.#top_count) {
            max += this.#top_count - prosAdded.size;
        }
        let consAdded = await this.#appendVotes(flop, status, (v) => v.con_voter.length <= 0 || v.pro_voter.length > v.con_voter.length, false, max, prosAdded);
        let titleDiv = document.querySelector(this.#titleSelector);
        let titles = [];
        if (prosAdded.size > 0) {
            document.querySelector(this.#topHrSelector).classList.remove('d-none');
            titles.push('Top ' + prosAdded.size);
        }
        if (consAdded.size > 0) {
            document.querySelector(this.#flopHrSelector).classList.remove('d-none');
            titles.push('Flop ' + consAdded.size);
        }
        if (titles.length <= 0) {
            titles.push('Top / Flop');
        }
        titleDiv.innerHTML = titles.join(' / ') + ' movie votes';

        if (status.user_ids.length > 1) {
            await this.#checkPerfectMatches(status);
        } else {
            document.dispatchEvent(new CustomEvent('match', {
                detail: {
                    matchCount: 0
                }
            }));
        }

        this.#userMaxVotesInit(status);
        this.#refreshRunning = false;
    }

    async #makeSessionDetails(status) {
        let info = new JoinInfo(document.querySelector(this.#infoSelector));
        info.display(status.session, this.#settings);
        // let userInfo = await this.#makeUserInfo(status);

        const introDiv = document.querySelector(this.#infoIntroSelector);
        if (introDiv.children.length <= 0) {
            const infoDiv = document.querySelector(this.#infoSelector);
            let closed = document.createElement('i');
            closed.classList.add('bi', 'bi-caret-right-fill', 'me-1');
            let opened = document.createElement('i');
            opened.classList.add('bi', 'bi-caret-down-fill', 'me-1', 'd-none');
            let title = document.createElement('span')
            title.innerHTML = 'Session: <b>' + status.session.name + '</b> &#124; You are: <b>' + this.#user.name + '</b>';

            introDiv.appendChild(closed);
            introDiv.appendChild(opened);
            introDiv.appendChild(title);
            introDiv.addEventListener('click', () => {
                if (opened.classList.contains('d-none')) {
                    opened.classList.remove('d-none');
                    closed.classList.add('d-none');
                    infoDiv.classList.remove('d-none');
                } else {
                    opened.classList.add('d-none');
                    closed.classList.remove('d-none');
                    infoDiv.classList.add('d-none');
                }
            });
        }
    }

    #userMaxVotesInit(status) {
        let maxVotes = this.#session.end_conditions.max_votes;
        if (maxVotes <= 0 || this.#maxVoteCountInitialized) {
            return;
        }
        this.#maxVoteCountInitialized = true;
        let userVotes = 0;
        for (let i=0; i< status.votes.length; i++) {
            if (status.votes[i].voter.includes(this.#user.user_id)) {
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
            let pros = vote.pro_voter.length;
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

    async #appendVotes(parentElement, status, filter, top, maxCount, removeIds = new Set()) {
        let appended = new Set();
        for (let i=0; i< status.votes.length && appended.size < maxCount; i++) {
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
            appended.add(key);
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
        if (removeIds.size > 0) {
            for (let i=0; i<parentElement.children.length; i++) {
                let child = parentElement.children[i];
                let movieId = child.querySelector('div[name="movie-status"]').getAttribute('movie-id');
                if (removeIds.has(movieId)) {
                    parentElement.removeChild(child);
                }
            }
        }
        return appended;
    }

    #buildVote(status, vote, movie, top) {
        let clazz = top ? 'bg-success-subtle' : 'bg-danger-subtle';
        const template = document.getElementById('movie-status-template');
        const movieStatus = document.importNode(template.content, true);
        this.#buildVoteTitle(movieStatus, clazz, movie);
        this.#buildVoteDistribution(movieStatus.querySelector('div[name="vote-distribution"]'), status, vote);
        let providers = [];
        let providerNames = movie.provider.map((p) => p.name.toLowerCase());
        for (let i=0; i<movie.provider.length; i++) {
            let provider = movie.provider[i];
            if (!this.#session.movie_provider.includes(provider.name.toLowerCase())) {
                continue;
            }
            providers.push('<img src="static/images/logo_' + provider.name.toLowerCase() + '.png" width="15" style="vertical-align:top">');
        }

        movieStatus.querySelector('div[name="info-row"] div[name="provider"]').innerHTML = providers.join('');
        movieStatus.querySelector('div[name="info-row"]').classList.add(clazz);
        movieStatus.querySelector('div[name="pros"] span[name="count"]').innerHTML = vote.pro_voter.length;
        movieStatus.querySelector('div[name="cons"] span[name="count"]').innerHTML = vote.con_voter.length;
        let votes = (vote.pro_voter.length + vote.con_voter.length) + '/' + status.user_ids.length;
        if (vote.pro_voter.length == status.user_ids.length && status.user_ids.length > 1) {
            votes = votes + '<i class="bi bi-stars ms-1"></i>';
        }
        movieStatus.querySelector('div[name="votes"]').innerHTML = votes;
        if (top && vote.pro_voter.length === status.user_ids.length && this.#match_action === 'play' && providerNames.includes('kodi') && this.#session.movie_provider.includes('kodi')) {
            movieStatus.querySelector('div[name="action"]').addEventListener('click', () => {
                Fetcher.getInstance().playMovie(movie.movie_id);
            });
        } else {
            movieStatus.querySelector('div[name="action"]').innerHTML = '';
        }
        let attributeId = MovieId.toKeyByObject(movie.movie_id) + ':' + top + ':' + vote.pro_voter.length + ':' + vote.con_voter.length + ':' + status.user_ids.length;
        movieStatus.querySelector('div[name="movie-status"]').setAttribute('status-id', attributeId);
        movieStatus.querySelector('div[name="movie-status"]').setAttribute('movie-id', MovieId.toKeyByObject(movie.movie_id));
        return movieStatus;
    }

     async #buildVoteDistribution(distribution, status, vote) {
        let waiting = status.user_ids !== undefined && status.user_ids !== null ? status.user_ids : [];
        let pro_voter = [];
        if (vote.pro_voter !== undefined && vote.pro_voter !== null && vote.pro_voter.length > 0) {
            for (let i=0; i<vote.pro_voter.length; i++) {
                let uid = vote.pro_voter[i];
                waiting = waiting.filter((w) => w !== parseInt(uid));
                let user = await Fetcher.getInstance().getUser(uid);
                if (this.#user.user_id == uid) {
                    pro_voter.push('<b>' + user.name + '</b>');
                } else {
                    pro_voter.push(user.name);
                }
            }
        }
        let con_voter = [];
        if (vote.con_voter !== undefined && vote.con_voter !== null && vote.con_voter.length > 0) {
            for (let i=0; i<vote.con_voter.length; i++) {
                let uid = vote.con_voter[i];
                waiting = waiting.filter((w) => w !== uid);
                let user = await Fetcher.getInstance().getUser(uid);
                if (this.#user.user_id == uid) {
                    con_voter.push('<b>' + user.name + '</b>');
                } else {
                    con_voter.push(user.name);
                }
            }
        }
        let waiting_voter = [];
        for (let i=0; i<waiting.length; i++) {
            let uid = waiting[i];
            let user = await Fetcher.getInstance().getUser(uid);
            if (this.#user.user_id == uid) {
                waiting_voter.push('<b>' + user.name + '</b>');
            } else {
                waiting_voter.push(user.name);
            }
        }
        distribution.querySelector('span[name="pros"]').innerHTML = pro_voter.length <= 0 ? '-' : pro_voter.join(', ');
        distribution.querySelector('span[name="cons"]').innerHTML = con_voter.length <= 0 ? '-' : con_voter.join(', ');
        distribution.querySelector('span[name="waiting"]').innerHTML = waiting_voter.length <= 0 ? '-' : waiting_voter.join(', '); 
    }

    #buildVoteTitle(movieStatus, clazz, movie) {
        let _this = this;
        let title = movieStatus.querySelector('div[name="title"]');
        let movieDetails = movieStatus.querySelector('div[name="movie-details"');
        let detailsContainer = movieStatus.querySelector('div[name="vote-details"');
        title.classList.add(clazz);
        let closed = document.createElement('i');
        closed.classList.add('bi', 'bi-caret-right-fill', 'me-1');
        let opened = document.createElement('i');
        opened.classList.add('bi', 'bi-caret-down-fill', 'me-1', 'd-none');
        let movieDisplay = new MovieDisplay(movieDetails, movie, this.#session);
        movieDisplay.build(false, false);
        title.addEventListener('click', () => {
            _this.#voteClicked(opened, closed, detailsContainer, movieDisplay, title);
        });
        movieStatus.querySelector('div[name="info-row"]').addEventListener('click', () => {
            _this.#voteClicked(opened, closed, detailsContainer, movieDisplay, title);
        });
        title.appendChild(closed);
        title.appendChild(opened);
        let text = document.createElement('span');
        text.innerHTML = Kinder.buildMovieTitle(movie.title, movie.year);
        title.appendChild(text);
    }

    #voteClicked(opened, closed, detailsContainer, movieDisplay, title) {
        if (opened.classList.contains('d-none')) {
            this.#closeAllMovies();
            detailsContainer.classList.remove('d-none');
            closed.classList.add('d-none');
            opened.classList.remove('d-none');
            title.scrollIntoView({ behavior: 'smooth', block: 'start'});
        } else {
            detailsContainer.classList.add('d-none');
            closed.classList.remove('d-none');
            opened.classList.add('d-none');
            movieDisplay.closeTrailer();
        }
    }
}