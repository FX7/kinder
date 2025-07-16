import { Kinder } from './index.js';
import { Fetcher } from './Fetcher.js';
import { random_names } from './randomNames.js';

export class Login {
    // Selector for the complete login content div
    #loginContainerSelector = 'div[name="login-container"]';
    #usernameSelector = this.#loginContainerSelector + ' input[name="username"]';
    // Selector for the new sessionname input
    #sessionnameSelector =  this.#loginContainerSelector + ' input[name="sessionname"]';
    // Selector for the joining sessionname select
    #sessionnamesSelector = this.#loginContainerSelector + ' select[name="sessinonames"]';
    #sessionDisabledGenreSelector = this.#loginContainerSelector + ' select[name="disabled-genres"]';
    #sessionMustGenreSelector = this.#loginContainerSelector + ' select[name="must-genres"]';
    #sessionMaxAgeSelector = this.#loginContainerSelector + ' input[name="max-age"]';
    #sessionMaxAgeDisplaySelector = this.#loginContainerSelector + ' span[name="max-age-display"]';
    #sessionMaxDurationSelector = this.#loginContainerSelector + ' input[name="max-duration"]';
    #sessionMaxDurationDisplaySelector = this.#loginContainerSelector + ' span[name="max-duration-display"]';
    #sessionIncludeWatchedSelector = this.#loginContainerSelector + ' #include-watched';
    #sessionProviderSelector = this.#loginContainerSelector + ' div[name="movie_provider"] input[type="checkbox"]';
    // Selector for the Session create/join radios
    #sessionchoiseSelector = this.#loginContainerSelector + ' input[name="sessionchoise"]';
    // Selector for the Session create/join parent div
    #sessionswitchSelector = this.#loginContainerSelector + ' div[name="session-switch"]';
    // Selector for the Session create div
    #sessionCreateSelector = this.#loginContainerSelector + ' div[name="session-create"]';
    //Selector for the Session join div
    #sessionJoinSelector = this.#loginContainerSelector + ' div[name="session-join"]';
    #loginButtonSelector = this.#loginContainerSelector + ' button.btn-primary';

    #session_max_minutes = -1;
    #session_max_votes = -1;
    #session_max_matches = -1;

    constructor() {
        this.#init();
    }

    async #loginSuccess() {
        const username = document.querySelector(this.#usernameSelector);
        username.focus();
        // username.classList.remove('is-invalid');
        // username.value = '';

        // const session = document.querySelector(this.#sessionnameSelector);
        // session.classList.add('is-invalid');
        // session.value = '';

        const button = document.querySelector(this.#loginButtonSelector);
        button.enabled = false;

        let sessions = await Fetcher.getInstance().listSessions();
        this.#initJoinSessionSelect(sessions);
        this.#initNewSessionName(sessions);

        let radio = document.querySelectorAll(this.#sessionchoiseSelector)[1];
        radio.checked = true;
        radio.dispatchEvent(new Event('click'));

        window.location = '/vote'
    }

    async #getMatchingSession(sessionname) {
        let session = null;
        const sessions = await Fetcher.getInstance().listSessions();
        Object.keys(sessions).forEach(key => {
            let s = sessions[key];
            if (s.name === sessionname) {
                session = s;
            }
        });
        return session;
    }

    async #login() {
        const username = this.#getUsername();
        const sessionname = this.#getSessionname();
        // this shouldnt happen but on FF Android you can start / Join, go back
        // and then you can join with empty username. This should prevent it.
        if (username === '') {
            let wasFromCookie = this.#setUsernameValue();
            if (wasFromCookie) {
                // If we could set the username successfully from cookie
                // then restart the login process (rejoin session)
                this.#login();
            }
            return;
        }
        if (sessionname === '') {
            this.#validateSessionName();
            return;
        }

        const user = await Fetcher.getInstance().imposeUser(username);
        let session = null;
        if (user.error === undefined) {
            session = await this.#getMatchingSession(sessionname);
            if (session === null) {
                let movie_providers = this.#getProviders();
                let disabledGenres = this.#getDisabledGenres();
                let mustGenres = this.#getMustGenres();
                let maxAge = this.#getMaxAge();
                let maxDuration = this.#getMaxDuration();
                let includeWatched = this.#getIncludeWatched();
                let sessionMaxTime = this.#getSessionMaxTime();
                let sessionMaxVotes = this.#getSessionMaxVotes();
                let sessionMaxMatches = this.#getSessionMaxMatches();
                session = await Fetcher.getInstance().startSession(
                    sessionname,
                    movie_providers,
                    disabledGenres,
                    mustGenres,
                    maxAge,
                    maxDuration,
                    includeWatched,
                    sessionMaxTime,
                    sessionMaxVotes,
                    sessionMaxMatches);
            }
        }
        if (user && user.error === undefined && session && session.error === undefined) {
            Kinder.setCookie('username', username, 14);
            Kinder.setSession(session);
            Kinder.setUser(user);
            this.#loginSuccess();
        }
        else if (user.error) {
            document.querySelector(this.#usernameSelector).classList.add('is-invalid');
        } else if (session.error) {
            Kinder.persistantToast('Error creating voting session!', '!!! Error !!!');
        } else {
            Kinder.persistantToast('Unknown error!', '!!! Error !!!');
        }
    }

    #getUsername() {
        const username = document.querySelector(this.#usernameSelector).value.trim();
        return username;
    }

    #getMaxAge() {
        let value = parseInt(document.querySelector(this.#sessionMaxAgeSelector).value)
        switch (value) {
            case 0:
                return 0;
            case 1:
                return 6;
            case 2:
                return 12;
            case 3:
                return 16;
            case 4:
            default:
                return Number.MAX_VALUE;
        }
    }

    #getMaxDuration() {
        let value = parseInt(document.querySelector(this.#sessionMaxDurationSelector).value)
        switch (value) {
            case 0:
                return 30;
            case 1:
                return 60;
            case 2:
                return 90;
            case 3:
                return 120;
            case 4:
                return 135;
            case 5:
                return 150;
            case 6:
                return 165;
            case 7:
                return 180;
            case 8:
                return 210
            case 9:
                return 240
            case 10:
            default:
                return Number.MAX_VALUE
        }
    }

    #getProviders() {
        let providers = [];
        let checked_provider = document.querySelectorAll(this.#sessionProviderSelector + ':checked');
        checked_provider.forEach((c) => providers.push(c.name))
        return providers;
    }

    #getIncludeWatched() {
        return document.querySelector(this.#sessionIncludeWatchedSelector).checked;
    }

    #getDisabledGenres() {
        return this.#getGenres(this.#sessionDisabledGenreSelector);
    }

    #getMustGenres() {
        return this.#getGenres(this.#sessionMustGenreSelector);
    }

    #getGenres(selector) {
        var result = [];
        const select = document.querySelector(selector);
        for (let i=0; i< select.options.length; i++) {
            let opt = select.options[i];
            if (opt.selected && !opt.classList.contains('d-none')) {
                result.push(opt.value);
            }
        }
        return result;
    }

    #getDisabledGenreOptions() {
        return this.#getGenreOptions(this.#sessionDisabledGenreSelector);
    }

    #getMustGenreOptions() {
        return this.#getGenreOptions(this.#sessionMustGenreSelector);
    }

    #getGenreOptions(selector) {
        return document.querySelector(selector).options;
    }

    #getSessionname() {
        let choice = this.#getSessionChoice();
        if (choice === 'create') {
            return document.querySelector(this.#sessionnameSelector).value.trim();
        } else if (choice === 'join') {
            return document.querySelector(this.#sessionnamesSelector).value.trim();
        }
        return '';
    }

    #getSessionMaxTime() {
        return this.#session_max_minutes;
    }

    #getSessionMaxVotes() {
        return this.#session_max_votes;
    }

    #getSessionMaxMatches() {
        return this.#session_max_matches;
    }

    #updateAgeAndDurationDisplay() {
        const maxAge = this.#getMaxAge();
        let maDisplay = maxAge == Number.MAX_VALUE ? '18+' : maxAge.toString();
        document.querySelector(this.#sessionMaxAgeDisplaySelector).innerHTML = maDisplay;

        const maxDuration = this.#getMaxDuration();
        let mdDisplay = maxDuration == Number.MAX_VALUE ? '240+ min.' : maxDuration.toString() + ' min.';
        document.querySelector(this.#sessionMaxDurationDisplaySelector).innerHTML = mdDisplay;
    }

    #validateProvider(buttonChek = true) {
        const providers = this.#getProviders();
        document.querySelectorAll(this.#sessionProviderSelector).forEach((s) => {
            if (providers.length <= 0) {
                s.classList.add('is-invalid');
            } else {
                s.classList.remove('is-invalid');
            }
        });
        this.#setDisableWatchedCheckbox(providers);
        this.#setDisabledGenreByProvider(providers);

        if (buttonChek) {
            this.#loginButtonCheck();
        }
    }

    #setDisableWatchedCheckbox(providers) {
        if (providers.includes('kodi')) {
            document.querySelector(this.#sessionIncludeWatchedSelector).disabled = false;
        } else {
            document.querySelector(this.#sessionIncludeWatchedSelector).disabled = true;
        }
    }

    async #setDisabledGenreByProvider(providers) {
        const disabledGenres = this.#getDisabledGenreOptions();
        const mustGenres = this.#getMustGenreOptions();
        for (let d=0; d<disabledGenres.length; d++) {
            let dgOption = disabledGenres[d];
            let mgOption = mustGenres[d];
            //  {
            //     "id": id,
            //     "name": name,
            //     "kodi_id": kodi_id,
            //     "tmdb_id": tmdb_id,
            //     "emby_id": emby_id,
            //     "sources": sources
            // }
            let genre = await Fetcher.getInstance().getGenreById(dgOption.value);
            // This check is enough for my setup, because alls kodi genres are also tmdb genres
            // and only (some?) emby genres are standing alone. So they will be hidden
            // if emby is deselected
            if (genre.sources.length == 1 && !providers.includes(genre.sources[0]) && genre.sources[0] !== 'tmdb') {
                mgOption.classList.add('d-none');
                dgOption.classList.add('d-none');
            } else {
                dgOption.classList.remove('d-none');
                mgOption.classList.remove('d-none');
            }
        }
        this.#validateGenres();
    }

    #validateGenres(buttonChek = true) {
        const disabledGenres = this.#getDisabledGenres();
        const mustGenres = this.#getMustGenres();

        let genresOverlap = false;
        disabledGenres.forEach((g) => {
            if (mustGenres.includes(g)) {
                genresOverlap = true;
            }
        });

        if (genresOverlap) {
            document.querySelector(this.#sessionDisabledGenreSelector).classList.add('is-invalid');
            document.querySelector(this.#sessionMustGenreSelector).classList.add('is-invalid');
        } else {
            document.querySelector(this.#sessionDisabledGenreSelector).classList.remove('is-invalid');
            document.querySelector(this.#sessionMustGenreSelector).classList.remove('is-invalid');
        }

        if (buttonChek) {
            this.#loginButtonCheck();
        }
    }

    #validate() {
        this.#validateUserName(false);
        this.#validateSessionName(false);
        this.#validateGenres(false);
        this.#validateProvider(false);

        this.#loginButtonCheck();
    }

    #validateUserName(buttonChek = true) {
        const username = this.#getUsername();
        if (username === '') {
            document.querySelector(this.#usernameSelector).classList.add('is-invalid');
        } else {
            document.querySelector(this.#usernameSelector).classList.remove('is-invalid');
        }

        if (buttonChek) {
            this.#loginButtonCheck();
        }
    }

    #validateSessionName(buttonChek = true) {
        const session = this.#getSessionname();
        if (session === '') {
            document.querySelector(this.#sessionnameSelector).classList.add('is-invalid');
        } else {
            document.querySelector(this.#sessionnameSelector).classList.remove('is-invalid');
        }

        if (buttonChek) {
            this.#loginButtonCheck();
        }
    }

    #loginButtonCheck() {
        const loginButton = document.querySelector(this.#loginButtonSelector);

        if (this.#getSessionChoice() === 'join') {
            loginButton.disabled = 
                document.querySelector(this.#usernameSelector).classList.contains('is-invalid')
                || this.#getSessionname().length == 0;
        } else {
            let sourcesInvalid = false;
            document.querySelectorAll(this.#sessionProviderSelector).forEach((c) => sourcesInvalid |= c.classList.contains('is-invalid'));

            loginButton.disabled = 
                document.querySelector(this.#usernameSelector).classList.contains('is-invalid')
                || document.querySelector(this.#sessionnameSelector).classList.contains('is-invalid')
                || document.querySelector(this.#sessionMustGenreSelector).classList.contains('is-invalid')
                || document.querySelector(this.#sessionDisabledGenreSelector).classList.contains('is-invalid')
                || document.querySelector(this.#sessionDisabledGenreSelector).classList.contains('is-invalid')
                || sourcesInvalid;
        }
    }

    #getSessionChoice() {
        const checkedChoice = document.querySelector(this.#sessionchoiseSelector + ':checked');
        if (checkedChoice !== undefined && checkedChoice !== null) {
            return checkedChoice.value;
        }
        return '';
    }

    #sessionChoiseChanged() {
        let sessionChoice = this.#getSessionChoice();
        const loginButton = document.querySelector(this.#loginButtonSelector);

        if (sessionChoice === 'create') {
            loginButton.innerHTML = 'Create';
            document.querySelector(this.#sessionCreateSelector).classList.remove('d-none');
            document.querySelector(this.#sessionJoinSelector).classList.add('d-none');
        } else if (sessionChoice == 'join') {
            loginButton.innerHTML = 'Join';
            document.querySelector(this.#sessionCreateSelector).classList.add('d-none');
            document.querySelector(this.#sessionJoinSelector).classList.remove('d-none');
        } else {
            document.querySelector(this.#sessionCreateSelector).classList.add('d-none');
            document.querySelector(this.#sessionJoinSelector).classList.add('d-none');
        }

        this.#validate();
    }

    async #setUsernameValue() {
        let usernameFromCookie = Kinder.getCookie('username');
        const usernameInput = document.querySelector(this.#usernameSelector);

        if (usernameFromCookie !== undefined && usernameFromCookie !== null && usernameFromCookie !== '') {
            usernameInput.value = usernameFromCookie;
            return true;
        } else {
            let users = await Fetcher.getInstance().listUsers();
            const userNames = users.map((u, i) => u.name);
            usernameInput.value = this.#randomUsername(userNames);
            return false;
        }
    }

    async #init() {
        let _this = this;

        const link = document.querySelector('div[name="about-link"]');
        if (link !== undefined && link !== null) {
            link.addEventListener('click', () => {
                window.location = '/about'
            });
        }

        let sessions = Fetcher.getInstance().listSessions();

        const loginButton = document.querySelector(this.#loginButtonSelector);
        loginButton.addEventListener('click', () => {
            _this.#login();
        });

        const usernameInput = document.querySelector(this.#usernameSelector);
        usernameInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter' && !loginButton.disabled) {
                _this.#login();
            }
        });
        usernameInput.addEventListener('input', () => { this.#validateUserName(); });
        this.#setUsernameValue();

        const sessionInput = document.querySelector(this.#sessionnameSelector);
        sessionInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter' && !loginButton.disabled) {
                _this.#login();
            }
        });
        sessionInput.addEventListener('input', () => { this.#validateSessionName(); });

        let settings = await Fetcher.getInstance().settings();
        let filterDefaults = settings.filter_defaults;
        let availableSources = settings.sources_available;
        let availableProvider = settings.provider_available;
        this.#session_max_minutes = settings.end_conditions.max_time;
        this.#session_max_votes = settings.end_conditions.max_votes;
        this.#session_max_matches = settings.end_conditions.max_matches;

        const disabledGenresSelect = document.querySelector(this.#sessionDisabledGenreSelector);
        disabledGenresSelect.addEventListener('change', () => { this.#validateGenres(); });
        const mustGenresSelect = document.querySelector(this.#sessionMustGenreSelector);
        mustGenresSelect.addEventListener('change', () => { this.#validateGenres(); });

        const maxAgeInput = document.querySelector(this.#sessionMaxAgeSelector);
        maxAgeInput.value = filterDefaults.default_max_age;
        maxAgeInput.addEventListener('input', () => { this.#updateAgeAndDurationDisplay(); });

        const maxDuration = document.querySelector(this.#sessionMaxDurationSelector);
        maxDuration.value = filterDefaults.default_max_duration;
        maxDuration.addEventListener('input', () => { this.#updateAgeAndDurationDisplay(); });

        this.#updateAgeAndDurationDisplay();

        const includeWatched = document.querySelector(this.#sessionIncludeWatchedSelector);
        includeWatched.checked = filterDefaults.default_include_watched;

        this.#initProvider(filterDefaults, availableSources, availableProvider);
        await Promise.all([this.#initGenres(filterDefaults)]);
        sessions.then((result) => {
            this.#initNewSessionName(result);
            this.#initJoinSessionSelect(result);
            this.#initSessionRadio(result);
        });
        
        usernameInput.focus();
    }

    #initNewSessionName(sessions) {
        const sessionNames = sessions.map((s, i) => s.name);

        const sessionInput = document.querySelector(this.#sessionnameSelector);
        sessionInput.value = this.#randomSessionname(sessionNames);
    }

    #randomUsername(usedUserNames, recall=0) {
        let username = random_names.superheroes[Math.floor(Math.random() * random_names.superheroes.length)];
        if (usedUserNames.includes(username) && recall < random_names.superheroes.length) {
            return this.#randomUsername(usedUserNames, recall++);
        } else if (usedUserNames.includes(username)) {
            username = '';
        }
        return username;
    }

    #randomSessionname(usedSessionNames, recall=0) {
        const adjective = random_names.adjectives[Math.floor(Math.random() * random_names.adjectives.length)];
        const subject = random_names.subjects[Math.floor(Math.random() * random_names.subjects.length)];
        let sessionName = adjective + ' ' + subject;
        if (usedSessionNames.includes(sessionName) && recall < 10) {
            return this.#randomSessionname(usedSessionNames, recall++);
        } else if (usedSessionNames.includes(sessionName)) {
            sessionName = '';
        }
        return sessionName;
    }

    #initProvider(filterDefaults, availableSources, availableProvider) {
        let providers = availableProvider.reverse();
        let providerContainer = document.querySelector('div[name="movie_provider"] .input-group');
        for (let i=0; i<providers.length; i++) {
            let provider = providers[i];
            const template = document.getElementById('provider-select-template');
            const providerSelect = document.importNode(template.content, true);
            let input = providerSelect.querySelector('input');
            input.name = provider.name;
            input.id = 'provider_' + provider.name;
            input.setAttribute('data-source', provider.source);
            if (!availableSources[provider.source]) {
                input.disabled = true;
            } else {
                input.checked = filterDefaults.default_providers.includes(provider.name);
                input.addEventListener('change', () => { this.#validateProvider(); });
            }
            let label = providerSelect.querySelector('label');
            label.setAttribute('for', 'provider_' + provider.name);
            let image = providerSelect.querySelector('img');
            image.src = 'static/images/logo_' + provider.name + '.png';
            image.alt = provider.name;
            providerContainer.prepend(providerSelect);
        }
    }

    async #initGenres(filterDefaults) {
        const disabledGenres = document.querySelector(this.#sessionDisabledGenreSelector);
        disabledGenres.addEventListener('change', () => { this.#validateGenres(); });
        const mustGenres = document.querySelector(this.#sessionMustGenreSelector);
        mustGenres.addEventListener('change', () => { this.#validateGenres(); });
        const genres = await Fetcher.getInstance().listGenres();
        for (let i=0; i<genres.length; i++) {
            let g = genres[i];
            disabledGenres.appendChild(this.#createGenreOption(g, filterDefaults.default_disabled_genres));
            mustGenres.appendChild(this.#createGenreOption(g, filterDefaults.default_must_genres));
        }
        this.#validateGenres();
    }

    #createGenreOption(genre, preselectedGenres) {
        let option = document.createElement('option');
        option.value = genre.id;
        option.innerHTML = genre.name;
        option.selected = preselectedGenres.includes(genre.name);
        return option;
    }

    #initSessionRadio(sessions) {
        let choices = document.querySelectorAll(this.#sessionchoiseSelector);
        choices.forEach((c) => c.addEventListener('click', () => this.#sessionChoiseChanged()));

        if (sessions.length === 0) {
            document.querySelector(this.#sessionswitchSelector).classList.add('d-none');
            let radio = document.querySelectorAll(this.#sessionchoiseSelector)[0];
            radio.checked = true;
            radio.dispatchEvent(new Event('click'));
        } else {
            document.querySelector(this.#sessionswitchSelector).classList.remove('d-none');
            let radio = document.querySelectorAll(this.#sessionchoiseSelector)[1];
            radio.checked = true;
            radio.dispatchEvent(new Event('click'));
            if (sessions.length === 1) {
                document.querySelector(this.#sessionnamesSelector).disabled = true;
            }
        }
    }

    #initJoinSessionSelect(sessions) {
        const sessionNames = document.querySelector(this.#sessionnamesSelector);

        while (sessionNames.firstChild) {
            sessionNames.removeChild(sessionNames.firstChild);
        }

        for (let i=0; i<sessions.length; i++) {
            let s = sessions[i];
            let option = document.createElement('option');
            option.selected = (i === 0);
            //option.value = s.session_id;
            option.value = s.name;
            option.innerHTML = s.name + ' (' + new Date(s.start_date).toLocaleDateString('de-DE', Kinder.dateTimeOptions) + ')';
            sessionNames.appendChild(option);
        }
    }
}