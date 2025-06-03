class SessionStatus {
    #session = null;

    #statusSelector = 'div[name="session-status"]'

    #statusButtonSelector = 'div[name="session-status-button"]';

    #titleSelector = this.#statusSelector + ' div[name="title"]';
    #participantsSelector = this.#statusSelector + ' div[name="participants"]';
    #topSelector = this.#statusSelector + ' div[name="top"]'
    #flopSelector = this.#statusSelector + ' div[name="flop"]'

    #topAndFlopMovies = new Map();
    #refreshRunning = false;

    constructor(session) {
        this.#session = session;
        this.#init();
        let _this = this
        setInterval(() => { _this.#refreshTopsAndFlops(); }, 3000);
    }

    #init() {
        const statusButton = document.querySelector(this.#statusButtonSelector);
        statusButton.addEventListener('click', () => { this.show(); });

        const container = document.querySelector(this.#statusSelector);
        container.querySelector('button.btn-close').addEventListener('click', () => { this.hide(); });

        statusButton.classList.remove('d-none');
    }

    async show() {
        await this.#refreshTopsAndFlops();

        const statusButton = document.querySelector(this.#statusButtonSelector);
        statusButton.classList.add('d-none');
        statusButton.classList.remove('blink');

        const container = document.querySelector(this.#statusSelector);
        container.classList.remove('d-none');
    }

    hide() {
        const container = document.querySelector(this.#statusSelector);
        container.classList.add('d-none');

        const statusButton = document.querySelector(this.#statusButtonSelector);
        statusButton.classList.remove('d-none');
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
        const title = document.querySelector(this.#titleSelector);
        title.innerHTML = status.session.name;

        //     "user_ids": [
        //       1,
        //       2,
        //       3,
        //       4,
        //       21,
        //       39
        //     ],
        const participants = document.querySelector(this.#participantsSelector);
        participants.innerHTML = status.user_ids.length + ' participants';
        // {
        //     "votes": [
        //       {
        //         "cons": 0,
        //         "movie_id": 1,
        //         "pros": 1
        //       }
        //     ]
        //   }
        const top = document.querySelector(this.#topSelector);
        while (top.firstChild) {
            top.removeChild(top.firstChild);
        }
        const flop = document.querySelector(this.#flopSelector);
        while (flop.firstChild) {
            flop.removeChild(flop.firstChild);
        }

        status.votes.sort((a, b) => {
            let pro = b.pros - a.pros;
            if (pro === 0) {
                return a.cons - b.cons;
            }
            return pro;
        });
        let knownTopsAndFlops = this.#topAndFlopMovies;
        this.#topAndFlopMovies = new Map();
        await this.#appendVotes(top, status, (v) => v.pros <= 0 || v.cons > v.pros);
       
        status.votes.sort((a, b) => {
            let con = b.cons - a.cons;;
            if (con === 0) {
                return a.pros - b.pros;
            }
            return con;
        });
        await this.#appendVotes(flop, status, (v) => v.cons <= 0 || v.pros > v.cons);

        const statusButton = document.querySelector(this.#statusButtonSelector);
        if (knownTopsAndFlops.size === 0 && this.#topAndFlopMovies.size > 0) {
            statusButton.classList.add('blink');
        } else if (this.#topAndFlopMovies.size > knownTopsAndFlops.size) {
            statusButton.classList.add('blink');
        } else {
            for (const k of knownTopsAndFlops.keys()) {
                if (!this.#topAndFlopMovies.has(k)) {
                    statusButton.classList.add('blink');
                    break;
                } else {
                    let newVote = this.#topAndFlopMovies.get(k);
                    let oldVote = knownTopsAndFlops.get(k);
                    if (oldVote.cons != newVote.cons || oldVote.pros != newVote.pros) {
                        statusButton.classList.add('blink');
                        break;
                    }
                }                
            }
        }

        this.#refreshRunning = false;
    }

    async #appendVotes(parentElement, status, filter) {
        let count = 0;
        for (let i=0; i< status.votes.length; i++) {
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
            let movieStatus = this.#buildVote(status, vote, movie);
            parentElement.appendChild(movieStatus);
            if (count >= 3) {
                break;
            }
        }
    }

    #buildVote(status, vote, movie) {
        const template = document.getElementById('movie-status-template');
        const movieStatus = document.importNode(template.content, true);
        movieStatus.querySelector('div[name="title"]').innerHTML = movie.title + ' (' + movie.year + ')';
        movieStatus.querySelector('div[name="pros"] span[name="count"]').innerHTML = vote.pros; 
        movieStatus.querySelector('div[name="cons"] span[name="count"]').innerHTML = vote.cons;
        movieStatus.querySelector('div[name="votes"]').innerHTML = (vote.pros + vote.cons) + '/' + status.user_ids.length;
        return movieStatus;
    }
}