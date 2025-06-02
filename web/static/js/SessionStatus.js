class SessionStatus {
    #session = null;

    #statusSelector = 'div[name="session-status"]'

    #titleSelector = this.#statusSelector + ' div[name="title"]';
    #participantsSelector = this.#statusSelector + ' div[name="participants"]';
    #topSelector = this.#statusSelector + ' div[name="top"]'
    #flopSelector = this.#statusSelector + ' div[name="flop"]'

    constructor(session) {
        this.#session = session;
        let _this = this
        setInterval(() => { _this.#update(); }, 1500);
    }

    show() {
        const container = document.querySelector(this.#statusSelector);
        container.classList.remove('d-none');
    }

    async #update() {
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
        let movies = new Set();
        const top = document.querySelector(this.#topSelector);
        while (top.firstChild) {
            top.removeChild(top.firstChild);
        }
        status.votes.sort((a, b) => b.pros - a.pros);
        let count = 0;
        for (let i=0; i< status.votes.length; i++) {
            let vote = status.votes[i];
            if (vote.pros <= 0) {
                continue;
            }
            if (movies.has(vote.movie_id)) {
                continue;
            }
            movies.add(vote.movie_id);
            let movie = await Fetcher.getInstance().getMovie(vote.movie_id);
            if (movie.error) {
                continue;
            }
            count++;
            const template = document.getElementById('movie-status-template');
            const movieStatus = document.importNode(template.content, true);
            movieStatus.querySelector('div[name="title"]').innerHTML = movie.title;
            movieStatus.querySelector('div[name="pros"]').innerHTML = vote.pros;
            movieStatus.querySelector('div[name="cons"]').innerHTML = vote.cons;
            movieStatus.querySelector('div[name="votes"]').innerHTML = (vote.pros + vote.cons) + '/' + status.user_ids.length;
            top.appendChild(movieStatus);
            if (count >= 2) {
                break;
            }
        }
       
        const flop = document.querySelector(this.#flopSelector);
        while (flop.firstChild) {
            flop.removeChild(flop.firstChild);
        }
        status.votes.sort((a, b) => b.cons - a.cons);
        count = 0;
        for (let i=0; i< status.votes.length; i++) {
            let vote = status.votes[i];
            if (vote.cons <= 0) {
                continue;
            }
            if (movies.has(vote.movie_id)) {
                continue;
            }
            movies.add(vote.movie_id);
            let movie = await Fetcher.getInstance().getMovie(vote.movie_id);
            if (movie.error) {
                continue;
            }
            count++;
            const template = document.getElementById('movie-status-template');
            const movieStatus = document.importNode(template.content, true);
            movieStatus.querySelector('div[name="title"]').innerHTML = movie.title;
            movieStatus.querySelector('div[name="pros"]').innerHTML = vote.pros;
            movieStatus.querySelector('div[name="cons"]').innerHTML = vote.cons;
            movieStatus.querySelector('div[name="votes"]').innerHTML = (vote.pros + vote.cons) + '/' + status.user_ids.length;
            flop.appendChild(movieStatus);
            if (count >= 2) {
                break;
            }
        }
    }
}