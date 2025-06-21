import { Kinder } from './index.js';
import { Fetcher } from './Fetcher.js';

export class SessionStatus {
    #session = null;
    #user = null;

    #statusSelector = 'div[name="session-status"]'

    #statusButtonSelector = 'div[name="session-status-button"]';

    #titleSelector = this.#statusSelector + ' div[name="title"]';
    #cardIntroSelector = this.#statusSelector + ' p.card-text';
    #topSelector = this.#statusSelector + ' div[name="top"]'
    #flopSelector = this.#statusSelector + ' div[name="flop"]'

    #matchCounter = new Map(); // movie_id -> pro votes
    #topAndFlopMovies = new Map(); // movie_id -> vote
    #refreshRunning = false;

    #autoRefresh = null;

    #match_action;
    #top_count = Number.MIN_VALUE;
    #flop_count = Number.MIN_VALUE;

    constructor(session, user) {
        this.#session = session;
        this.#user = user;
        this.#init();
        let _this = this
        this.#autoRefresh = setInterval(() => { _this.#refreshTopsAndFlops(); }, 3000);

        document.addEventListener('kinder.over', () => {
            clearInterval(_this.#autoRefresh);
        });
    }

    #init() {
        const statusButton = document.querySelector(this.#statusButtonSelector);
        statusButton.addEventListener('click', () => { this.show(); });

        const container = document.querySelector(this.#statusSelector);
        container.querySelector('button.btn-close').addEventListener('click', () => { this.hide(); });

        statusButton.classList.remove('d-none');
    }

    show() {
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

    async #initSettings() {
        let settings = null;
        if (this.#match_action === undefined || this.#match_action === null) {
            if (settings === null) {
                settings = await Fetcher.getInstance().settings();
            }
            this.#match_action = settings.match_action;
        }
        if (this.#top_count === undefined || this.#top_count === null || this.#top_count === Number.MIN_VALUE) {
            if (settings === null) {
                settings = await Fetcher.getInstance().settings();
            }
            this.#top_count = settings.top_count;
        }
        if (this.#flop_count === undefined || this.#flop_count === null || this.#flop_count === Number.MIN_VALUE) {
            if (settings === null) {
                settings = await Fetcher.getInstance().settings();
            }
            this.#flop_count = settings.flop_count;
        }
    }

    async #refreshTopsAndFlops() {
        if (this.#refreshRunning) {
            return;
        }
        await this.#initSettings();
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
        for (let i=0; i<status.user_ids.length; i++) {
            let uid = status.user_ids[i];
            const user = await Fetcher.getInstance().getUser(uid);
            if (uid === this.#user.user_id) {
                
            } else {
                users.push(user.name);
            }
        }
        introDiv.innerHTML = 'Users: ' + users.join(', ');
        // title += users.join(', ');
        
        // {
        //     "votes": [
        //       {
        //         "cons": 0,
        //         "movie_id": 1,
        //         "pros": 1,
        //         "last_vote": 2022.01.01 17:03:13.3343
        //       }
        //     ]
        //   }
        const top = document.querySelector(this.#topSelector).querySelector('ul');
        while (top.firstChild) {
            top.removeChild(top.firstChild);
        }
        const flop = document.querySelector(this.#flopSelector).querySelector('ul');
        while (flop.firstChild) {
            flop.removeChild(flop.firstChild);
        }

        this.#topAndFlopMovies = new Map();

        status.votes.sort((a, b) => {
            let pro = b.pros - a.pros;
            if (pro === 0) {
                return a.cons - b.cons;
            }
            return pro;
        });
        await this.#appendVotes(top, status, (v) => v.pros <= 0 || v.cons > v.pros, true);
       
        status.votes.sort((a, b) => {
            let con = b.cons - a.cons;;
            if (con === 0) {
                return a.pros - b.pros;
            }
            return con;
        });
        await this.#appendVotes(flop, status, (v) => v.cons <= 0 || v.pros > v.cons, false);

        if (status.user_ids.length > 1) {
            for (const k of this.#topAndFlopMovies.keys()) {
                let vote = this.#topAndFlopMovies.get(k);
                let pros = vote.pros;
                let lastPros = this.#matchCounter.get(k);
                if (lastPros === undefined || lastPros === null) {
                    lastPros = 0;
                }
                if (pros === status.user_ids.length && pros > lastPros && status.user_ids.includes(this.#user.user_id)) {
                    this.#matchCounter.set(k, pros);
                    let movie = await Fetcher.getInstance().getMovie(k);
                    const clickable = document.createElement('span');
                    clickable.classList.add('clickable');
                    clickable.innerHTML = Kinder.buildMovieTitle(movie.title, movie.year);
                    let toast = Kinder.toast(clickable, 'Perfect match  ' + pros + '/' + pros + '!', 0);
                    clickable.addEventListener('click', () => {
                        this.show();
                        bootstrap.Toast.getInstance(toast).hide();
                    });
                }
            }
        }

        this.#refreshRunning = false;
    }

    async #appendVotes(parentElement, status, filter, top) {
        let count = 0;
        let maxCount = top ? this.#top_count : this.#flop_count;
        for (let i=0; i< status.votes.length; i++) {
            if (count >= maxCount) {
                break;
            }
            let vote = status.votes[i];
            if (filter(vote)) {
                continue;
            }
            if (this.#topAndFlopMovies.has(vote.movie_id)) {
                continue;
            }
            this.#topAndFlopMovies.set(vote.movie_id, vote);
            let movie = await Fetcher.getInstance().getMovie(vote.movie_id);
            if (movie.error) {
                continue;
            }
            count++;
            let movieStatus = this.#buildVote(status, vote, movie, top);
            parentElement.appendChild(movieStatus);
        }
    }

    #buildVote(status, vote, movie, top) {
        let clazz = top ? 'bg-success-subtle' : 'bg-danger-subtle';
        const template = document.getElementById('movie-status-template');
        const movieStatus = document.importNode(template.content, true);
        movieStatus.querySelector('div[name="title"]').innerHTML = Kinder.buildMovieTitle(movie.title, movie.year);
        movieStatus.querySelector('div[name="title"]').classList.add(clazz);
        movieStatus.querySelector('div[name="info-row"]').classList.add(clazz);
        movieStatus.querySelector('div[name="pros"] span[name="count"]').innerHTML = vote.pros; 
        movieStatus.querySelector('div[name="cons"] span[name="count"]').innerHTML = vote.cons;
        movieStatus.querySelector('div[name="votes"]').innerHTML = (vote.pros + vote.cons) + '/' + status.user_ids.length;
        if (top && vote.pros === status.user_ids.length && this.#match_action === 'play') {
            movieStatus.querySelector('div[name="action"]').addEventListener('click', () => {
                Fetcher.getInstance().playMovie(movie.movie_id);
            });
        } else {
            movieStatus.querySelector('div[name="action"]').innerHTML = '';
        }
        return movieStatus;
    }
}