import { Kinder } from "../index.js";
import { Fetcher } from "../Fetcher.js";

export class JoinInfo {

    #containerSelector;
    #createdAtContainer;
    #createdAtSelector;
    #createdByContainer;
    #createdBySelector;
    #participantsContainer;
    #participantsSelector;
    #antiGenresContainer;
    #antiGenresSelector;
    #mustGenresContainer;
    #mustGenresSelector;
    #maxAgeContainer;
    #maxAgeSelector;
    #maxDurationContainer;
    #maxDurationSelector;
    #watchedContainer;
    #watchedSelector;
    #providersContainer;
    #providersSelector;

    constructor(containerSelector) {
        this.#containerSelector = containerSelector;
        this.#createdAtContainer = containerSelector + ' div[name="created_at"]'; 
        this.#createdAtSelector = this.#createdAtContainer + ' input[type="text"]';
        this.#createdByContainer = containerSelector + ' div[name="creator"]';
        this.#createdBySelector = this.#createdByContainer + ' input[type="text"]';
        this.#participantsContainer = containerSelector + ' div[name="participants"]';
        this.#participantsSelector = this.#participantsContainer + ' input[type="text"]';
        this.#antiGenresContainer = containerSelector + ' div[name="anti-genres"]';
        this.#antiGenresSelector = this.#antiGenresContainer + ' input[type="text"]';
        this.#mustGenresContainer = containerSelector + ' div[name="must-genres"]';
        this.#mustGenresSelector = this.#mustGenresContainer + ' input[type="text"]';
        this.#maxAgeContainer = containerSelector + ' div[name="max-age"]';
        this.#maxAgeSelector = this.#maxAgeContainer + ' input[type="text"]';
        this.#maxDurationContainer = containerSelector + ' div[name="max-duration"]';
        this.#maxDurationSelector = this.#maxDurationContainer + ' input[type="text"]';
        this.#watchedContainer = containerSelector + ' div[name="watched"]';
        this.#watchedSelector = this.#watchedContainer + ' input[type="text"]';
        this.#providersContainer = containerSelector + ' div[name="providers"]';
        this.#providersSelector = this.#providersContainer + ' input[type="text"]';
    }

    async display(session) {
        this.#setCreatedAt(session);
        this.#setCreatedBy(session);
        this.#setParticipants(session);
        this.#setAntiGenres(session);
        this.#setMustGenres(session);
        this.#setMaxAge(session);
        this.#setMaxDuration(session);
        this.#setWatched(session);
        this.#setProviders(session);
    }

    #setCreatedAt(session) {
        const createdAtDisplay = document.querySelector(this.#createdAtSelector);
        if (session === undefined || session === null) {
            createdAtDisplay.value = '';
            return;
        }

        const createdAt = new Date(session.start_date).toLocaleDateString('de-DE', Kinder.dateTimeOptions);
        createdAtDisplay.value = createdAt;
    }

    #setCreatedBy(session) {
        const createdByDisplay = document.querySelector(this.#createdBySelector);
        if (session === undefined || session === null) {
            createdByDisplay.value = '';
            return;
        }

        const user = Fetcher.getInstance().getUser(session.creator_id);
        user.then((data) => {
            createdByDisplay.value = data.name;
        });
    }

    #setParticipants(session) {
        const participantsDisplay = document.querySelector(this.#participantsSelector);
        if (session === undefined || session === null) {
            participantsDisplay.value = '';
            return;
        }

        const status = Fetcher.getInstance().getSessionStatus(session.session_id);
        status.then(async (data) => {
            let user_ids = Array.from(new Set([].concat(data.user_ids).concat(session.creator_id)));
            let usernames = [];
            for (let i=0; i<user_ids.length; i++) {
                let user = await Fetcher.getInstance().getUser(user_ids[i]);
                usernames.push(user.name);
            }
            participantsDisplay.value = usernames.join(', ');
        });
    }

    #setAntiGenres(session) {
        const antiGenresContainer = document.querySelector(this.#antiGenresContainer);
        const antiGenresDisplay = document.querySelector(this.#antiGenresSelector);
        if (session === undefined || session === null
            || session.disabled_genre_ids === undefined || session.disabled_genre_ids === null || session.disabled_genre_ids.length <= 0) {
            antiGenresContainer.classList.add('d-none');
            antiGenresDisplay.value = '';
            return;
        }

        this.#setGenres(antiGenresContainer, antiGenresDisplay, session.disabled_genre_ids);
    }

    async #setMustGenres(session) {
        const mustGenresContainer = document.querySelector(this.#mustGenresContainer);
        const mustGenresDisplay = document.querySelector(this.#mustGenresSelector);
        if (session === undefined || session === null
            || session.must_genre_ids === undefined || session.must_genre_ids === null || session.must_genre_ids.length <= 0) {
            mustGenresContainer.classList.add('d-none');
            mustGenresDisplay.value = '';
            return;
        }

        this.#setGenres(mustGenresContainer, mustGenresDisplay, session.must_genre_ids);
    }

    async #setGenres(container, display, genreIds) {
        let genrenames = [];
        for (let i=0; i<genreIds.length; i++) {
            let genreId = genreIds[i];
            let genre = await Fetcher.getInstance().getGenreById(genreId);
            genrenames.push(genre.name);
        }
        container.classList.remove('d-none');
        display.value = genrenames.join(', ');
    }

    #setMaxAge(session) {
        const maxAgeContainer = document.querySelector(this.#maxAgeContainer);
        const maxAgeDisplay = document.querySelector(this.#maxAgeSelector);
        if (session === undefined || session === null
            || session.max_age === undefined || session.max_age === null || session.max_age >= 18) {
            maxAgeContainer.classList.add('d-none');
            maxAgeDisplay.value = '';
            return;
        }

        maxAgeContainer.classList.remove('d-none');
        maxAgeDisplay.value = session.max_age + ' years';
    }

    #setMaxDuration(session) {
        const maxDurationContainer = document.querySelector(this.#maxDurationContainer);
        const maxDurationDisplay = document.querySelector(this.#maxDurationSelector);
        if (session === undefined || session === null
            || session.max_duration === undefined || session.max_duration === null || session.max_duration >= 1000) {
            maxDurationContainer.classList.add('d-none');
            maxDurationDisplay.value = '';
            return;
        }

        maxDurationContainer.classList.remove('d-none');
        maxDurationDisplay.value = session.max_duration + ' minutes';
    }

    #setWatched(session) {
        const watchedContainer = document.querySelector(this.#watchedContainer);
        const watchedDisplay = document.querySelector(this.#watchedSelector);
        if (session === undefined || session === null
            || session.movie_provider === undefined || session.movie_provider === null || session.movie_provider.length <= 0 || !session.movie_provider.includes('kodi')) {
            watchedContainer.classList.add('d-none');
            watchedDisplay.value = '';
            return;
        }

        watchedContainer.classList.remove('d-none');
        watchedDisplay.value = session.include_watched ? 'included' : 'excluded';
    }

    #setProviders(session) {
        const providersContainer = document.querySelector(this.#providersContainer);
        const providersDisplay = document.querySelector(this.#providersSelector);
        if (session === undefined || session === null
            || session.movie_provider === undefined || session.movie_provider === null || session.movie_provider.length <= 0) {
            providersContainer.classList.add('d-none');
            providersDisplay.value = '';
            return;
        }

        providersContainer.classList.remove('d-none');
        providersDisplay.value = session.movie_provider.join(', ');
    }
}