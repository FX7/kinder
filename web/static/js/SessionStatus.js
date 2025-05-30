class SessionStatus {
    #session = null;

    #statusSelector = 'div[name="session-status"]'

    #titleSelector = this.#statusSelector + ' div[name="title"]';
    #participantsSelector = this.#statusSelector + ' div[name="participants"]';
    #topSelector = this.#statusSelector + ' div[name="top"]'

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
        const top = document.querySelector(this.#topSelector);

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
        //       },
        //       {
        //         "cons": 0,
        //         "movie_id": 2,
        //         "pros": 1
        //       },
        //       {
        //         "cons": 0,
        //         "movie_id": 3,
        //         "pros": 1
        //       },
        //       {
        //         "cons": 0,
        //         "movie_id": 27,
        //         "pros": 1
        //       },
        //       {
        //         "cons": 0,
        //         "movie_id": 28,
        //         "pros": 1
        //       },
        //       {
        //         "cons": 0,
        //         "movie_id": 29,
        //         "pros": 1
        //       },
        //       {
        //         "cons": 0,
        //         "movie_id": 30,
        //         "pros": 1
        //       },
        //       {
        //         "cons": 1,
        //         "movie_id": 33,
        //         "pros": 0
        //       },
        //       {
        //         "cons": 1,
        //         "movie_id": 1183,
        //         "pros": 0
        //       },
        //       {
        //         "cons": 2,
        //         "movie_id": 2785,
        //         "pros": 1
        //       },
        //       {
        //         "cons": 0,
        //         "movie_id": 2786,
        //         "pros": 2
        //       }
        //     ]
        //   }
    }
}