import { Kinder } from "../index.js";
import { Fetcher } from "../Fetcher.js";

export class JoinInfo {
    #container;
    #createdAtContainer;
    #createdAtInput;
    #createdByContainer;
    #createdByInput;
    #participantsContainer;
    #participantsInput;
    #antiGenresContainer;
    #antiGenresInput;
    #mustGenresContainer;
    #mustGenresInput;
    #maxAgeContainer;
    #maxAgeInput;
    #maxDurationContainer;
    #maxDurationInput;
    #watchedContainer;
    #watchedInput;
    #providersContainer;
    #providersInput;

    constructor(container) {
        this.#container = container;
        this.#createdAtContainer = this.#container.querySelector('div[name="created_at"]');
        this.#createdAtInput = this.#createdAtContainer.querySelector('input[type="text"]');
        this.#createdByContainer = this.#container.querySelector('div[name="creator"]');
        this.#createdByInput = this.#createdByContainer.querySelector('input[type="text"]');
        this.#participantsContainer = this.#container.querySelector('div[name="participants"]');
        this.#participantsInput = this.#participantsContainer.querySelector('input[type="text"]');
        this.#antiGenresContainer = this.#container.querySelector('div[name="anti-genres"]');
        this.#antiGenresInput = this.#antiGenresContainer.querySelector('input[type="text"]');
        this.#mustGenresContainer = this.#container.querySelector('div[name="must-genres"]');
        this.#mustGenresInput = this.#mustGenresContainer.querySelector('input[type="text"]');
        this.#maxAgeContainer = this.#container.querySelector('div[name="max-age"]');
        this.#maxAgeInput = this.#maxAgeContainer.querySelector('input[type="text"]');
        this.#maxDurationContainer = this.#container.querySelector('div[name="max-duration"]');
        this.#maxDurationInput = this.#maxDurationContainer.querySelector('input[type="text"]');
        this.#watchedContainer = this.#container.querySelector('div[name="watched"]');
        this.#watchedInput = this.#watchedContainer.querySelector('input[type="text"]');
        this.#providersContainer = this.#container.querySelector('div[name="providers"]');
        this.#providersInput = this.#providersContainer.querySelector('input[type="text"]');
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
        if (session === undefined || session === null) {
            this.#createdAtInput.value = '';
            return;
        }
        const createdAt = new Date(session.start_date).toLocaleDateString('de-DE', Kinder.dateTimeOptions);
        this.#createdAtInput.value = createdAt;
    }

    #setCreatedBy(session) {
        if (session === undefined || session === null) {
            this.#createdByInput.value = '';
            return;
        }
        const user = Fetcher.getInstance().getUser(session.creator_id);
        user.then((data) => {
            this.#createdByInput.value = data.name;
        });
    }

    #setParticipants(session) {
        if (session === undefined || session === null) {
            this.#participantsInput.value = '';
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
            this.#participantsInput.value = usernames.join(', ');
        });
    }

    #setAntiGenres(session) {
        if (session === undefined || session === null
            || session.disabled_genre_ids === undefined || session.disabled_genre_ids === null || session.disabled_genre_ids.length <= 0) {
            this.#antiGenresContainer.classList.add('d-none');
            this.#antiGenresInput.value = '';
            return;
        }
        this.#setGenres(this.#antiGenresContainer, this.#antiGenresInput, session.disabled_genre_ids);
    }

    async #setMustGenres(session) {
        if (session === undefined || session === null
            || session.must_genre_ids === undefined || session.must_genre_ids === null || session.must_genre_ids.length <= 0) {
            this.#mustGenresContainer.classList.add('d-none');
            this.#mustGenresInput.value = '';
            return;
        }
        this.#setGenres(this.#mustGenresContainer, this.#mustGenresInput, session.must_genre_ids);
    }

    async #setGenres(container, display, genreIds) {
        let genrenames = [];
        for (let i=0; i<genreIds.length; i++) {
            let genreId = genreIds[i];
            let genre = await Fetcher.getInstance().getGenreById(genreId);
            if (genre === undefined || genre === null) {
                // Could happen if eg Kodi is not available, but was during session creation
                continue;
            }
            genrenames.push(genre.name);
        }
        container.classList.remove('d-none');
        display.value = genrenames.join(', ');
    }

    #setMaxAge(session) {
        if (session === undefined || session === null
            || session.max_age === undefined || session.max_age === null || session.max_age >= 18) {
            this.#maxAgeContainer.classList.add('d-none');
            this.#maxAgeInput.value = '';
            return;
        }
        this.#maxAgeContainer.classList.remove('d-none');
        this.#maxAgeInput.value = session.max_age + ' years';
    }

    #setMaxDuration(session) {
        if (session === undefined || session === null
            || session.max_duration === undefined || session.max_duration === null || session.max_duration >= 1000) {
            this.#maxDurationContainer.classList.add('d-none');
            this.#maxDurationInput.value = '';
            return;
        }
        this.#maxDurationContainer.classList.remove('d-none');
        this.#maxDurationInput.value = session.max_duration + ' minutes';
    }

    #setWatched(session) {
        if (session === undefined || session === null
            || session.movie_provider === undefined || session.movie_provider === null || session.movie_provider.length <= 0 || !session.movie_provider.includes('kodi')) {
            this.#watchedContainer.classList.add('d-none');
            this.#watchedInput.value = '';
            return;
        }
        this.#watchedContainer.classList.remove('d-none');
        this.#watchedInput.value = session.include_watched ? 'included' : 'excluded';
    }

    #setProviders(session) {
        if (session === undefined || session === null
            || session.movie_provider === undefined || session.movie_provider === null || session.movie_provider.length <= 0) {
            this.#providersContainer.classList.add('d-none');
            this.#providersInput.value = '';
            return;
        }
        this.#providersContainer.classList.remove('d-none');
        this.#providersInput.value = session.movie_provider.map(Kinder.providerToDisplay).join(', ');;
    }
}