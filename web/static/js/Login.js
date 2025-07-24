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
    #sessionDisabledGenreContainer = this.#loginContainerSelector + ' div[name="disabled-genres-container"]';
    #sessionMustGenreSelector = this.#loginContainerSelector + ' select[name="must-genres"]';
    #sessionMustGenreContainer = this.#loginContainerSelector + ' div[name="must-genres-container"]';
    #sessionMaxAgeSelector = this.#loginContainerSelector + ' input[name="max-age"]';
    #sessionMaxAgeContainer = this.#loginContainerSelector + ' div[name="max-age-container"]'
    #sessionMaxAgeDisplaySelector = this.#loginContainerSelector + ' span[name="max-age-display"]';
    #sessionMaxDurationSelector = this.#loginContainerSelector + ' input[name="max-duration"]';
    #sessionMaxDurationContainer = this.#loginContainerSelector + ' div[name="max-duration-container"]';
    #sessionMaxDurationDisplaySelector = this.#loginContainerSelector + ' span[name="max-duration-display"]';
    #sessionIncludeWatchedSelector = this.#loginContainerSelector + ' #include-watched';
    #sessionIncludeWatchedContainer = this.#loginContainerSelector + ' div[name="include-watched-container"]';
    #sessionProviderSelector = this.#loginContainerSelector + ' div[name="movie_provider"] input[type="checkbox"]';
    #sessionProviderContainer = this.#loginContainerSelector + ' div[name="movie_provider-container"]';
    #sessionEndConditionContainer = this.#loginContainerSelector + ' div[name="end-condition-container"]';
    // Selector for the Session create/join parent div
    #sessionTabsSelector = this.#loginContainerSelector + ' ul[name="session-switch"]';
    #sessionNewTab = this.#sessionTabsSelector + ' a[name="create"]';
    #sessionJoinTab = this.#sessionTabsSelector + ' a[name="join"]';
    // Selector for the Session create div
    #sessionCreateSelector = this.#loginContainerSelector + ' div[name="session-create"]';
    //Selector for the Session join div
    #sessionJoinSelector = this.#loginContainerSelector + ' div[name="session-join"]';
    #loginButtonSelector = this.#loginContainerSelector + ' button.btn-primary';

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

        document.querySelector(this.#sessionNewTab).classList.remove('active');
        let joinTab = document.querySelector(this.#sessionJoinTab);
        joinTab.classList.add('active');
        joinTab.dispatchEvent(new Event('click'));

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
            // window.location = '/?login=' + this.#getSessionChoice();
            window.location = '/';
            return;
            // cause of loop on FF Android, just redirect to login page :/
            // let wasFromCookie = this.#setUsernameValue();
            // if (wasFromCookie) {
            //     // If we could set the username successfully from cookie
            //     // then restart the login process (rejoin session)
            //     this.#login();
            // }
            // return;
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
        const timeLimitChckbx = document.querySelector(this.#loginContainerSelector + ' input[name="end-time-limit-chckbx"]');
        if (timeLimitChckbx.checked) {
            return parseInt(document.querySelector(this.#loginContainerSelector + ' input[name="end-time-limit"]').value);
        }
        return -1;
    }

    #getSessionMaxVotes() {
        const voteLimitChckbx = document.querySelector(this.#loginContainerSelector + ' input[name="end-vote-limit-chckbx"]');
        if (voteLimitChckbx.checked) {
            return parseInt(document.querySelector(this.#loginContainerSelector + ' input[name="end-vote-limit"]').value);
        }
        return -1;
    }

    #getSessionMaxMatches() {
        const matchLimitChckbx = document.querySelector(this.#loginContainerSelector + ' input[name="end-match-limit-chckbx"]');
        if (matchLimitChckbx.checked) {
            return parseInt(document.querySelector(this.#loginContainerSelector + ' input[name="end-match-limit"]').value);
        }
        return -1;
    }

    #updateAgeAndDurationDisplay() {
        const maxAge = this.#getMaxAge();
        let maDisplay = maxAge == Number.MAX_VALUE ? '18+' : maxAge.toString();
        document.querySelector(this.#sessionMaxAgeDisplaySelector).innerHTML = maDisplay;

        const maxDuration = this.#getMaxDuration();
        let mdDisplay = maxDuration == Number.MAX_VALUE ? '240+' : maxDuration.toString();
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

        return this.#loginButtonCheck();
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

        return !loginButton.disabled;
    }

    #getSessionChoice() {
        const activeTab = document.querySelector(this.#sessionTabsSelector + ' a.active');
        if (activeTab !== undefined && activeTab !== null) {
            return activeTab.name;
        }
        return '';
    }

    #sessionChoiseClick(e) {
        let sessionChoice = e.target.name;
        const loginButton = document.querySelector(this.#loginButtonSelector);
        let newTab = document.querySelector(this.#sessionNewTab);
        let joinTab = document.querySelector(this.#sessionJoinTab);
        let createContainer = document.querySelector(this.#sessionCreateSelector);
        let joinContainer = document.querySelector(this.#sessionJoinSelector);


        if (sessionChoice === 'create') {
            loginButton.innerHTML = 'Create';
            createContainer.classList.remove('d-none');
            joinContainer.classList.add('d-none');
            newTab.classList.add('active');
            joinTab.classList.remove('active');
        } else if (sessionChoice == 'join') {
            createContainer.classList.add('d-none');
            joinContainer.classList.remove('d-none');
            newTab.classList.remove('active');
            joinTab.classList.add('active');
            this.#setJoinRejoinBySessionSelection();
        } else {
            createContainer.classList.add('d-none');
            joinContainer.classList.add('d-none');
        }

        this.#validate();
    }

    async #setUsernameValue() {
        let usernameFromCookie = Kinder.getCookie('username');
        const usernameInput = document.querySelector(this.#usernameSelector);

        if (usernameFromCookie !== undefined && usernameFromCookie !== null && usernameFromCookie.trim().length > 0 && usernameFromCookie.trim() !== '') {
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
        let hiddenFilter = settings.filter_hide;

        const disabledGenresSelect = document.querySelector(this.#sessionDisabledGenreSelector);
        disabledGenresSelect.addEventListener('change', () => { this.#validateGenres(); });
        if (hiddenFilter.hide_disabled_genres) {
            document.querySelector(this.#sessionDisabledGenreContainer).classList.add('d-none');
        }
        const mustGenresSelect = document.querySelector(this.#sessionMustGenreSelector);
        mustGenresSelect.addEventListener('change', () => { this.#validateGenres(); });
        if (hiddenFilter.hide_must_genres) {
            document.querySelector(this.#sessionMustGenreContainer).classList.add('d-none');
        }

        const maxAgeInput = document.querySelector(this.#sessionMaxAgeSelector);
        maxAgeInput.value = filterDefaults.default_max_age;
        maxAgeInput.addEventListener('input', () => { this.#updateAgeAndDurationDisplay(); });
        if (hiddenFilter.hide_max_age) {
            document.querySelector(this.#sessionMaxAgeContainer).classList.add('d-none');
        }

        const maxDuration = document.querySelector(this.#sessionMaxDurationSelector);
        maxDuration.value = filterDefaults.default_max_duration;
        maxDuration.addEventListener('input', () => { this.#updateAgeAndDurationDisplay(); });
        if (hiddenFilter.hide_max_duration) {
            document.querySelector(this.#sessionMaxDurationContainer).classList.add('d-none');
        }

        this.#updateAgeAndDurationDisplay();

        const includeWatched = document.querySelector(this.#sessionIncludeWatchedSelector);
        includeWatched.checked = filterDefaults.default_include_watched;
        if (hiddenFilter.hide_include_watched || !availableSources.kodi) {
            document.querySelector(this.#sessionIncludeWatchedContainer).classList.add('d-none');
        }

        this.#initProvider(filterDefaults, availableSources, availableProvider, hiddenFilter.hide_provider);
        this.#initEndConditions(settings.end_conditions, hiddenFilter.hide_end);
        await Promise.all([this.#initGenres(filterDefaults)]);
        sessions.then((result) => {
            this.#initNewSessionName(result);
            this.#initJoinSessionSelect(result);
            this.#initSessionNewExistTabs(result);
        });
        
        usernameInput.focus();
        this.#checkLoginParameter();
    }

    #checkLoginParameter() {
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);
        const login = params.get('login');
        if (login !== undefined && login !== null && login === 'join' && this.#validate()) {
            this.#login();
        }
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

    #initProvider(filterDefaults, availableSources, availableProvider, hide) {
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
        if (hide) {
            document.querySelector(this.#sessionProviderContainer).classList.add('d-none');
        }
    }

    #validateEndConditions(buttonChek = true) {
        const matchLimit = document.querySelector(this.#loginContainerSelector + ' input[name="end-match-limit"]');
        const voteLimit = document.querySelector(this.#loginContainerSelector + ' input[name="end-vote-limit"]');
        const timeLimit = document.querySelector(this.#loginContainerSelector + ' input[name="end-time-limit"]');

        if (matchLimit.value === '' || isNaN(parseInt(matchLimit.value)) || parseInt(matchLimit.value) <= 0) {
            matchLimit.classList.add('is-invalid');
        } else {
            matchLimit.classList.remove('is-invalid');
        }
        if (voteLimit.value === '' || isNaN(parseInt(voteLimit.value)) || parseInt(voteLimit.value) <= 0) {
            voteLimit.classList.add('is-invalid');
        } else {
            voteLimit.classList.remove('is-invalid');
        }
        if (timeLimit.value === '' || isNaN(parseInt(timeLimit.value)) || parseInt(timeLimit.value) <= 0) {
            timeLimit.classList.add('is-invalid');
        } else {
            timeLimit.classList.remove('is-invalid');
        }

        if (buttonChek) {
            this.#loginButtonCheck();
        }
    }

    #initEndConditions(end_conditions, hide) {
        // 'max_time' : max_time,
        // 'max_votes': max_votes,
        // 'max_matches': max_matches
        const timeLimitChckbx = document.querySelector(this.#loginContainerSelector + ' input[name="end-time-limit-chckbx"]');
        const timeLimit = document.querySelector(this.#loginContainerSelector + ' input[name="end-time-limit"]');
        const voteLimitChckbx = document.querySelector(this.#loginContainerSelector + ' input[name="end-vote-limit-chckbx"]');
        const voteLimit = document.querySelector(this.#loginContainerSelector + ' input[name="end-vote-limit"]');
        const matchLimitChckbx = document.querySelector(this.#loginContainerSelector + ' input[name="end-match-limit-chckbx"]');
        const matchLimit = document.querySelector(this.#loginContainerSelector + ' input[name="end-match-limit"]');
        const matchLimitContainer = document.querySelector(this.#loginContainerSelector + ' div[name="end-match-limit-container"]');
        timeLimitChckbx.addEventListener('change', () => {
            if (timeLimitChckbx.checked) {
                timeLimit.classList.remove('d-none');
            } else {
                timeLimit.classList.add('d-none');
            }
        });
        timeLimit.addEventListener('input', () => {
            this.#validateEndConditions();
        });
        voteLimitChckbx.addEventListener('change', () => {
            if (voteLimitChckbx.checked) {
                voteLimit.classList.remove('d-none');
            } else {
                voteLimit.classList.add('d-none');
            }
        });
        voteLimit.addEventListener('input', () => {
            this.#validateEndConditions();
        });
        matchLimitChckbx.addEventListener('change', () => {
            if (matchLimitChckbx.checked) {
                matchLimitContainer.classList.remove('d-none');
            } else {
                matchLimitContainer.classList.add('d-none');
            }
        });
        matchLimit.addEventListener('input', () => {
            this.#validateEndConditions();
        });

        if (end_conditions.max_time > 0) {
            timeLimit.value = end_conditions.max_time;
            timeLimitChckbx.checked = true;
        }
        if (end_conditions.max_votes > 0) {
            voteLimit.value = end_conditions.max_votes;
            voteLimitChckbx.checked = true;
        }
        if (end_conditions.max_matches > 0) {
            matchLimit.value = end_conditions.max_matches;
            matchLimitChckbx.checked = true;
        }
        timeLimitChckbx.dispatchEvent(new Event('change'));
        voteLimitChckbx.dispatchEvent(new Event('change'));
        matchLimitChckbx.dispatchEvent(new Event('change'));

        this.#validateEndConditions();

        const endConditionContainer = document.querySelector(this.#sessionEndConditionContainer);
        if (hide) {
            endConditionContainer.classList.add('d-none');
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

    #initSessionNewExistTabs(sessions) {
        let choices = document.querySelectorAll(this.#sessionTabsSelector + ' a');
        choices.forEach((c) => c.addEventListener('click', (e) => this.#sessionChoiseClick(e)));
        let newTab = document.querySelector(this.#sessionNewTab);
        let joinTab = document.querySelector(this.#sessionJoinTab);
        if (sessions.length === 0) {
            document.querySelector(this.#sessionTabsSelector).classList.add('d-none');
            joinTab.classList.remove('active');
            newTab.classList.add('active');
            newTab.dispatchEvent(new Event('click'));
        } else {
            document.querySelector(this.#sessionTabsSelector).classList.remove('d-none');
            joinTab.classList.add('active');
            newTab.classList.remove('active');
            joinTab.dispatchEvent(new Event('click'));
            if (sessions.length === 1) {
                document.querySelector(this.#sessionnamesSelector).disabled = true;
            }
        }
    }

    async #setJoinRejoinBySessionSelection() {
        const loginButton = document.querySelector(this.#loginButtonSelector);
        loginButton.innerHTML = 'Join';
        const sessionName = this.#getSessionname();
        const session = await this.#getMatchingSession(sessionName);
        if (session !== undefined && session !== null)
        {
            const status = await Fetcher.getInstance().getSessionStatus(session.session_id);
            for (let i=0; i<status.user_ids.length; i++) {
                let user = await Fetcher.getInstance().getUser(status.user_ids[i]);
                // because it can take a while to fetch all users and session
                // and meanwhile the username changed, or the choice (create/join)
                // changed, so double check it here
                if (user.name === this.#getUsername()) {
                    if (this.#getSessionChoice() === 'join') {
                        loginButton.innerHTML = 'Rejoin';
                    }
                    break;
                }
            };
        }
    }

    #initJoinSessionSelect(sessions) {
        const sessionNames = document.querySelector(this.#sessionnamesSelector);
        sessionNames.addEventListener('change', () => {
            this.#setJoinRejoinBySessionSelection();
        });

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