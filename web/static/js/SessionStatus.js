import { Kinder } from './index.js';
import { Fetcher } from './Fetcher.js';
import { MovieId } from './MovieId.js';

export class SessionStatus {
    #session = null;
    #user = null;

    #statusSelector = 'div[name="session-status"]'

    #statusButtonSelector = 'div[name="session-status-button"]';
    #matchBadge = this.#statusButtonSelector + ' span[name="match-badge"]';

    #titleSelector = this.#statusSelector + ' div[name="title"]';
    #cardIntroSelector = this.#statusSelector + ' p.card-text';
    #topSelector = this.#statusSelector + ' div[name="top"]'
    #flopSelector = this.#statusSelector + ' div[name="flop"]'

    #endConditionSelector = 'div[name="session-end-condition"]';
    #timeEndConditionSelector = this.#endConditionSelector + ' span[name="time"]';
    #matchEndConditionSelector = this.#endConditionSelector + ' span[name="matches"]';

    #matchCounter = new Map(); // movie_id -> pro votes
    #topAndFlopMovies = new Map(); // movie_id -> vote
    #knownUsers = new Set();
    #refreshRunning = false;

    #autoRefresh = null;
    #maxTimeEndConditionRefresh = null;
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
        this.#refreshTopsAndFlops();
        this.#autoRefresh = setInterval(() => { _this.#refreshTopsAndFlops(); }, 3000);

        document.addEventListener('kinder.over.voter', () => { _this.#over(); });
    }

    #over() {
        const endInfo = document.querySelector(this.#endConditionSelector);
        endInfo.innerHTML = '<h4><span class="badge text-bg-secondary">The vote is over!</span></h4>';
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

        this.#displayTimeEndCondition();
        this.#displayMatchEndCondition(0);
    }

    #displayTimeEndCondition() {
        let maxTime = this.#session.end_max_minutes;
        if (maxTime <= 0) {
            return;
        }
        if (this.#maxTimeEndConditionRefresh) {
            clearTimeout(this.#maxTimeEndConditionRefresh);
        }

        maxTime = maxTime*60;
        let now = new Date();
        let startDate = new Date(this.#session.start_date);
        const timeDifference = (startDate - now)/1000;
        const timeLeft = timeDifference + maxTime;
        if (timeLeft <= 0) {
            this.#over();
            // show toast only if timeout was without voting
            // which means timeLeft > -1
            // if a reload / rejoin was done after timeout, the timeLeft will
            // be smaller
            if (timeLeft > -1) {
                Kinder.persistantToast('Times up!', 'The vote is over!');
                document.dispatchEvent(new Event('kinder.over.time'));
            }
        } else {
            const hours = Math.floor(timeLeft / 3600);
            const minutes = Math.ceil((timeLeft % 3600) / 60);
            const seconds = Math.floor(timeLeft % 60);
            let text = '<i class="bi bi-alarm-fill"></i> ';
            let clazz = 'text-bg-secondary';

            if (hours > 1) {
                text += hours + ' h';
            } else if (minutes > 1) {
                text += minutes + ' m';
            } else {
                if (seconds <= 10) {
                    clazz = 'text-bg-danger';
                }
                else if (seconds <= 30) {
                    clazz = 'text-bg-warning';
                }
                text += seconds + ' s';
            }
            const timeInfo = document.querySelector(this.#timeEndConditionSelector);
            // Session already ended in another way and element is gone
            if (timeInfo === undefined || timeInfo === null) {
                return;
            }
            timeInfo.innerHTML = '<h4><span class="badge ' + clazz + '">' + text + '</span></h4>'
            timeInfo.classList.remove('d-none');
            let _this = this;
            this.#maxTimeEndConditionRefresh = setTimeout(() => {_this.#displayTimeEndCondition(); }, 1000);
        }
    }

    #displayMatchEndCondition(matchCount) {
        let maxMatches = this.#session.end_max_matches;
        if (maxMatches <= 0) {
            return;
        }
        const matchInfo = document.querySelector(this.#matchEndConditionSelector);
        const matchesLeft = maxMatches - matchCount;
        if (matchesLeft <= 0) {
            // because we still refresh tops/flops after end
            // (max votes may not be reached at the same time),
            // we only propagate this on the first time
            if (matchInfo !== undefined && matchInfo !== null) {
                this.#over();
                Kinder.persistantToast('Max matches reached!', 'The vote is over!');
                document.dispatchEvent(new Event('kinder.over.match'));
            }
        } else {
            // Session already ended in another way and element is gone
            if (matchInfo === undefined || matchInfo === null) {
                return;
            }
            let clazz = 'text-bg-secondary';
            if (matchesLeft <= 1) {
                clazz = 'text-bg-danger';
            } else if (matchesLeft <= 2) {
                clazz = 'text-bg-warning';
            }
            let text = '<i class="bi bi-stars"></i> ' + matchCount + '/' + maxMatches;
            matchInfo.innerHTML = '<h4><span class="badge ' + clazz + '">' + text + '</span></h4>'
            matchInfo.classList.remove('d-none');
        }
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
        const statusButton = document.querySelector(this.#statusButtonSelector);
        statusButton.classList.add('d-none');

        const container = document.querySelector(this.#statusSelector);
        container.classList.remove('d-none');
        this.#refreshTopsAndFlops();
    }

    hide() {
        const container = document.querySelector(this.#statusSelector);
        container.classList.add('d-none');

        const statusButton = document.querySelector(this.#statusButtonSelector);
        statusButton.classList.remove('d-none');
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
        let introDiv = document.querySelector(this.#cardIntroSelector);
        let users = []
        users.push('<b>' + this.#user.name + '</b>');
        let knownUsersSize = this.#knownUsers.size;
        for (let i=0; i<status.user_ids.length; i++) {
            let uid = status.user_ids[i];
            const user = await Fetcher.getInstance().getUser(uid);
            if (uid !== this.#user.user_id) {
                users.push(user.name);
                if (!this.#knownUsers.has(user.user_id)) {
                    this.#knownUsers.add(user.user_id);
                    if (knownUsersSize > 0) {
                        Kinder.timeoutToast('User <span class="fst-italic">' + user.name + '</span> joined!', '<i class="bi bi-person-fill"></i> New User!')
                    }
                }
            }
        }
        introDiv.innerHTML = '<i class="bi bi-people-fill"></i> ' + users.join(', ');
        // title += users.join(', ');
    }
    
    async #refreshTopsAndFlops() {
        if (this.#refreshRunning) {
            return;
        }
        this.#refreshRunning = true;
        let status = await Fetcher.getInstance().getSessionStatus(this.#session.session_id);

        //     "session": {
        //       "name": "movienight",
        //       "seed": 226498123,
        //       "session_id": 1,
        //       "start_date": "Sun, 25 May 2025 12:01:23 GMT"
        //     }
        const titleDiv = document.querySelector(this.#titleSelector);

        let title = 'Session: <b>'
            + status.session.name
            + '</b><br>started '
            + new Date(this.#session.start_date).toLocaleDateString('de-DE', Kinder.shortDateTimeOptions);
        titleDiv.innerHTML = title;
        
        this.#makeUserInfo(status);
        
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
        let maxVotes = this.#session.end_max_votes;
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
        this.#displayMatchEndCondition(matchCount);
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
            } else if (parentElement.children[i].textContent.trim() !== movieStatus.textContent.trim()) {
                parentElement.replaceChild(movieStatus, parentElement.children[i]);
            }
        }
        // remove to much elements from last "overflow"
        for (let i=maxCount; i<parentElement.children.length; i++) {
            parentElement.removeChild(parentElement.children[i]);
        }
        return count;
    }

    #buildVote(status, vote, movie, top) {
        let clazz = top ? 'bg-success-subtle' : 'bg-danger-subtle';
        const template = document.getElementById('movie-status-template');
        const movieStatus = document.importNode(template.content, true);
        movieStatus.querySelector('div[name="title"]').innerHTML = Kinder.buildMovieTitle(movie.title, movie.year);
        let providers = [];
        for (let i=0; i<movie.provider.length; i++) {
            let provider = movie.provider[i];
            if (!this.#session.movie_provider.includes(provider.toLowerCase())) {
                continue;
            }
            providers.push('<img src="static/images/logo_' + provider.toLowerCase() + '.png" width="15" style="vertical-align:top">');
        }

        movieStatus.querySelector('div[name="info-row"] div[name="provider"]').innerHTML = providers.join('');
        movieStatus.querySelector('div[name="title"]').classList.add(clazz);
        movieStatus.querySelector('div[name="info-row"]').classList.add(clazz);
        movieStatus.querySelector('div[name="pros"] span[name="count"]').innerHTML = vote.pros; 
        movieStatus.querySelector('div[name="cons"] span[name="count"]').innerHTML = vote.cons;
        movieStatus.querySelector('div[name="votes"]').innerHTML = (vote.pros + vote.cons) + '/' + status.user_ids.length;
        if (top && vote.pros === status.user_ids.length && this.#match_action === 'play' && movie.provider.includes('KODI') && this.#session.movie_provider.includes('kodi')) {
            movieStatus.querySelector('div[name="action"]').addEventListener('click', () => {
                Fetcher.getInstance().playMovie(movie.movie_id);
            });
        } else {
            movieStatus.querySelector('div[name="action"]').innerHTML = '';
        }
        return movieStatus;
    }
}