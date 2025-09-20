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
    #minAgeContainer;
    #minAgeInput;
    #maxAgeContainer;
    #maxAgeInput;
    #minDurationContainer;
    #minDurationInput;
    #maxDurationContainer;
    #maxDurationInput;
    #watchedContainer;
    #watchedInput;
    #providersContainer;
    #providersInput;
    #minYearContainer;
    #minYearInput;
    #maxYearContainer;
    #maxYearInput;
    #regionContainer;
    #regionInput;
    #languageContainer;
    #languageInput;
    #ratingAverageContainer;
    #ratingAverageDisplay;

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
        this.#minAgeContainer = this.#container.querySelector('div[name="min-age"]');
        this.#minAgeInput = this.#minAgeContainer.querySelector('input[type="text"]');
        this.#maxAgeContainer = this.#container.querySelector('div[name="max-age"]');
        this.#maxAgeInput = this.#maxAgeContainer.querySelector('input[type="text"]');
        this.#minDurationContainer = this.#container.querySelector('div[name="min-duration"]');
        this.#minDurationInput = this.#minDurationContainer.querySelector('input[type="text"]');
        this.#maxDurationContainer = this.#container.querySelector('div[name="max-duration"]');
        this.#maxDurationInput = this.#maxDurationContainer.querySelector('input[type="text"]');
        this.#watchedContainer = this.#container.querySelector('div[name="watched"]');
        this.#watchedInput = this.#watchedContainer.querySelector('input[type="text"]');
        this.#providersContainer = this.#container.querySelector('div[name="providers"]');
        this.#providersInput = this.#providersContainer.querySelector('input[type="text"]');
        this.#minYearContainer = this.#container.querySelector('div[name="min-year"]')
        this.#minYearInput = this.#minYearContainer.querySelector('input[type="text"]');
        this.#maxYearContainer = this.#container.querySelector('div[name="max-year"]')
        this.#maxYearInput = this.#maxYearContainer.querySelector('input[type="text"]');
        this.#regionContainer = this.#container.querySelector('div[name="region"]');
        this.#regionInput = this.#regionContainer.querySelector('input[type="text"]');
        this.#languageContainer = this.#container.querySelector('div[name="language"]');
        this.#languageInput = this.#languageContainer.querySelector('input[type="text"]');
        this.#ratingAverageContainer = this.#container.querySelector('div[name="rating-average"]');
        this.#ratingAverageDisplay = this.#ratingAverageContainer.querySelector('span[name="rating-average-display"]');
    }

    async display(session, settings) {
        this.#setCreatedAt(session);
        this.#setCreatedBy(session);
        this.#setParticipants(session);
        this.#setAntiGenres(session);
        this.#setMustGenres(session);
        this.#setMinAge(session);
        this.#setMaxAge(session);
        this.#setMinDuration(session);
        this.#setMaxDuration(session);
        this.#setWatched(session);
        this.#setProviders(session);
        this.#setMinYear(session);
        this.#setMaxYear(session);
        this.#setRegion(session, settings);
        this.#setLanguage(session, settings);
        this.#setRatingAverage(session);
    }

    #setRatingAverage(session) {
        if (session === undefined || session === null
            || session.misc_filter === undefined || session.misc_filter === null
            || session.misc_filter.vote_average === undefined || session.misc_filter.vote_average === null || session.misc_filter.vote_average === 0.0)
        {
            this.#ratingAverageContainer.classList.add('d-none');
            this.#ratingAverageDisplay.innerHTML = Kinder.ratingAverageToDisplay(0.0);
            return;
        }

        this.#ratingAverageContainer.classList.remove('d-none');
        this.#ratingAverageDisplay.innerHTML = Kinder.ratingAverageToDisplay(session.misc_filter.vote_average);
    }

    #setRegion(session, settings) {
        if (session === undefined || session === null
            || session.tmdb_discover === undefined || session.tmdb_discover === null || session.tmdb_discover.region === undefined || session.tmdb_discover.region === null
            || settings === undefined || settings === null
            || settings.discover === undefined || settings.discover === null || settings.discover.region === undefined || settings.discover.region === null
            || session.tmdb_discover.region === settings.discover.region)
        {
            this.#regionContainer.classList.add('d-none');
            this.#regionInput.value = '';
            return;
        }

        this.#regionContainer.classList.remove('d-none');
        this.#regionInput.value = session.tmdb_discover.region;
    }

    #setLanguage(session, settings) {
        if (session === undefined || session === null
            || session.tmdb_discover === undefined || session.tmdb_discover === null || session.tmdb_discover.language === undefined || session.tmdb_discover.language === null
            || settings === undefined || settings === null 
            || settings.discover === undefined || settings.discover === null || settings.discover.language === undefined || settings.discover.language === null
            || session.tmdb_discover.language === settings.discover.language)
        {
            this.#languageContainer.classList.add('d-none');
            this.#languageInput.value = '';
            return;
        }

        this.#languageContainer.classList.remove('d-none');
        this.#languageInput.value = session.tmdb_discover.language;
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
        this.#setGenres(this.#antiGenresContainer, this.#antiGenresInput, session.disabled_genre_ids, session.tmdb_discover.language);
    }

    async #setMustGenres(session) {
        if (session === undefined || session === null
            || session.must_genre_ids === undefined || session.must_genre_ids === null || session.must_genre_ids.length <= 0) {
            this.#mustGenresContainer.classList.add('d-none');
            this.#mustGenresInput.value = '';
            return;
        }
        this.#setGenres(this.#mustGenresContainer, this.#mustGenresInput, session.must_genre_ids, session.tmdb_discover.language);
    }

    async #setGenres(container, display, genreIds, language) {
        let genrenames = [];
        for (let i=0; i<genreIds.length; i++) {
            let genreId = genreIds[i];
            let genre = await Fetcher.getInstance().getGenreById(genreId, language);
            if (genre === undefined || genre === null) {
                // Could happen if eg Kodi is not available, but was during session creation
                continue;
            }
            genrenames.push(genre.name);
        }
        container.classList.remove('d-none');
        display.value = genrenames.join(', ');
    }

    #setMinAge(session) {
        if (session === undefined || session === null
            || session.misc_filter.min_age === undefined || session.misc_filter.min_age === null || session.misc_filter.min_age <= 0) {
            this.#minAgeContainer.classList.add('d-none');
            this.#minAgeInput.value = '';
            return;
        }
        this.#minAgeContainer.classList.remove('d-none');
        this.#minAgeInput.value = session.misc_filter.min_age + ' years';
    }

    #setMaxAge(session) {
        if (session === undefined || session === null
            || session.misc_filter.max_age === undefined || session.misc_filter.max_age === null || session.misc_filter.max_age >= 18) {
            this.#maxAgeContainer.classList.add('d-none');
            this.#maxAgeInput.value = '';
            return;
        }
        this.#maxAgeContainer.classList.remove('d-none');
        this.#maxAgeInput.value = session.misc_filter.max_age + ' years';
    }

    #setMinDuration(session) {
        if (session === undefined || session === null
            || session.misc_filter.min_duration === undefined || session.misc_filter.min_duration === null || session.misc_filter.min_duration <= 0) {
            this.#minDurationContainer.classList.add('d-none');
            this.#minDurationInput.value = '';
            return;
        }
        this.#minDurationContainer.classList.remove('d-none');
        this.#minDurationInput.value = session.misc_filter.min_duration + ' minutes';
    }

    #setMaxDuration(session) {
        if (session === undefined || session === null
            || session.misc_filter.max_duration === undefined || session.misc_filter.max_duration === null || session.misc_filter.max_duration >= 1000) {
            this.#maxDurationContainer.classList.add('d-none');
            this.#maxDurationInput.value = '';
            return;
        }
        this.#maxDurationContainer.classList.remove('d-none');
        this.#maxDurationInput.value = session.misc_filter.max_duration + ' minutes';
    }

    #setWatched(session) {
        if (session === undefined || session === null
            || session.movie_provider === undefined || session.movie_provider === null || session.movie_provider.length <= 0 || !session.movie_provider.includes('kodi')) {
            this.#watchedContainer.classList.add('d-none');
            this.#watchedInput.value = '';
            return;
        }
        this.#watchedContainer.classList.remove('d-none');
        this.#watchedInput.value = session.misc_filter.include_watched ? 'included' : 'excluded';
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

    #setMinYear(session) {
        if (session === undefined || session === null
            || session.misc_filter === undefined || session.misc_filter === null || session.misc_filter.min_year === undefined || session.misc_filter.min_year === null
            || session.misc_filter.min_year <= 1900 || session.misc_filter.min_year >= new Date().getFullYear()) {
                this.#minYearContainer.classList.add('d-none');
                this.#minYearInput.value = '';
                return;
            }
            this.#minYearContainer.classList.remove('d-none');
            this.#minYearInput.value = session.misc_filter.min_year;
    }

    #setMaxYear(session) {
        if (session === undefined || session === null
            || session.misc_filter === undefined || session.misc_filter === null || session.misc_filter.max_year === undefined || session.misc_filter.max_year === null
            || session.misc_filter.max_year <= 1900 || session.misc_filter.max_year >= new Date().getFullYear()) {
                this.#maxYearContainer.classList.add('d-none');
                this.#maxYearInput.value = '';
                return;
            }
            this.#maxYearContainer.classList.remove('d-none');
            this.#maxYearInput.value = session.misc_filter.max_year;
    }
}