class Login {
    static #instance;

    /**
     * Selector for the complete login content div
     */
    #loginContainerSelector = 'div[name="login-container"]';

    /**
     * Selector for the username input
     */
    #usernameSelector = this.#loginContainerSelector + ' input[name="username"]';

    /**
     * Selector for the new sessionname input
     */
    #sessionnameSelector =  this.#loginContainerSelector + ' input[name="sessionname"]';

    /**
     * Selector for the joining sessionname select
     */
    #sessionnamesSelector = this.#loginContainerSelector + ' select[name="sessinonames"]';

    /**
     * Selector for the disabled genres select
     */
    #sessionDisabledGenreSelector = this.#loginContainerSelector + ' select[name="disabled-genres"]';

    /**
     * Selector for the Session create/join radios
     */
    #sessionchoiseSelector = this.#loginContainerSelector + ' input[name="sessionchoise"]';

    /**
     * Selector for the Session create/join parent div
     */
    #sessionswitchSelector = this.#loginContainerSelector + ' div[name="session-switch"]';

    /**
     * Selector for the Session create div
     */
    #sessionCreateSelector = this.#loginContainerSelector + ' div[name="session-create"]';

    /**
     * Selector for the Session join div
     */
    #sessionJoinSelector = this.#loginContainerSelector + ' div[name="session-join"]';

    /**
     * Selector for the Session join button
     */
    #loginButtonSelector = this.#loginContainerSelector + ' button.btn-primary';

    constructor() {
        this.#init();
    }

    show() {
        document.querySelector(this.#loginContainerSelector).classList.remove('d-none');
    }

    hide() {
        document.querySelector(this.#loginContainerSelector).classList.add('d-none');

        const username = document.querySelector(this.#usernameSelector);
        username.classList.remove('is-invalid');
        username.value = '';

        const session = document.querySelector(this.#sessionnameSelector);
        session.classList.add('is-invalid');
        session.value = '';

        const button = document.querySelector(this.#loginButtonSelector);
        button.enabled = false;
    }

    #errorUser() {
        document.querySelector(this.#usernameSelector).classList.add('is-invalid')
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

        const user = await Fetcher.getInstance().imposeUser(username);
        let session = null;
        if (user.error === undefined) {
            session = await this.#getMatchingSession(sessionname);
            if (session === null) {
                let disabledGenres = this.#getDisabledGenres();
                session = await Fetcher.getInstance().startSession(sessionname, disabledGenres);
            }
        }
        if (user && user.error === undefined && session && session.error === undefined) {
            Kinder.setCookie('username', username, 14);
            this.hide();
            new Voter(session, user).show();
            new SessionStatus(session);
        }
        else if (user.error) {
            this.#errorUser();
        } else if (session.error) {
            Kinder.toast('Error creating voting session!');
        } else {
            Kinder.toast('Unknown error!');
        }
    }

    #getUsername() {
        const username = document.querySelector(this.#usernameSelector).value.toLowerCase().trim();
        return username;
    }

    #getDisabledGenres() {
        var result = [];
        const select = document.querySelector(this.#sessionDisabledGenreSelector);
        for (let i=0; i< select.options.length; i++) {
            let opt = select.options[i];
            if (opt.selected) {
                result.push(opt.value);
            }
        }
        return result;
    }

    #getSessionname() {
        if (this.#getSessionChoice() === 'create') {
            return document.querySelector(this.#sessionnameSelector).value.toLowerCase().trim();
        } else {
            return document.querySelector(this.#sessionnamesSelector).value.toLowerCase().trim();
        }
    }

    async #validate() {
        const loginButton = document.querySelector(this.#loginButtonSelector);

        const username = this.#getUsername();
        const session = this.#getSessionname();

        if (username === '') {
            document.querySelector(this.#usernameSelector).classList.add('is-invalid');
        } else {
            document.querySelector(this.#usernameSelector).classList.remove('is-invalid');
        }
        if (session === '') {
            document.querySelector(this.#sessionnameSelector).classList.add('is-invalid');
        } else {
            document.querySelector(this.#sessionnameSelector).classList.remove('is-invalid');
        }

        if (this.#getSessionChoice() == 'join' || await this.#getMatchingSession(session) !== null) {
            loginButton.innerHTML = 'Join';
            document.querySelector(this.#sessionDisabledGenreSelector).disabled = true;
        } else {
            loginButton.innerHTML = 'Create';
            document.querySelector(this.#sessionDisabledGenreSelector).disabled = false;
        }

        loginButton.disabled = username === '' || session == '';
    }

    #getSessionChoice() {
        return document.querySelector(this.#sessionchoiseSelector + ':checked').value;
    }

    #sessionChoiseChanged() {
        let sessionChoice = this.#getSessionChoice();

        if (sessionChoice === 'create') {
            document.querySelector(this.#sessionCreateSelector).classList.remove('d-none');
            document.querySelector(this.#sessionJoinSelector).classList.add('d-none');
        } else {
            document.querySelector(this.#sessionCreateSelector).classList.add('d-none');
            document.querySelector(this.#sessionJoinSelector).classList.remove('d-none');
        }

        this.#validate();
    }

    async #init() {
        let _this = this;
        let username = Kinder.getCookie('username');

        const loginButton = document.querySelector(this.#loginButtonSelector);
        loginButton.addEventListener('click', () => {
            _this.#login();
        });

        const usernameInput = document.querySelector(this.#usernameSelector);
        usernameInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter' && !loginButton.disabled) {
                _this.#login();
            } else {
                usernameInput.value = usernameInput.value.toLowerCase();
            }
        });
        usernameInput.addEventListener('input', () => { this.#validate(); });
        if (username !== undefined && username !== null) {
            usernameInput.value = username;
        }

        const sessionInput = document.querySelector(this.#sessionnameSelector);
        sessionInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter' && !loginButton.disabled) {
                _this.#login();
            } else {
                sessionInput.value = sessionInput.value.toLowerCase();
            }
        });
        sessionInput.addEventListener('input', () => { this.#validate(); });

        await Promise.all([this.#initSessionNames(), this.#initDisabledGenres()]);
        await this.#initSessionRadio();
        usernameInput.focus();
    }

    async #initDisabledGenres() {
        const disabledGenres = document.querySelector(this.#sessionDisabledGenreSelector);
        const genres = await Fetcher.getInstance().listGenres();
        for (let i=0; i<genres.length; i++) {
            let g = genres[i];
            let option = document.createElement('option');
            option.value = g.genreid;
            option.innerHTML = g.label;
            disabledGenres.appendChild(option);
        }
    }

    async #initSessionRadio() {
        let choices = document.querySelectorAll(this.#sessionchoiseSelector);
        choices.forEach((c) => c.addEventListener('click', () => this.#sessionChoiseChanged()));

        const sessions = await Fetcher.getInstance().listSessions();
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

    async #initSessionNames() {
        const sessionNames = document.querySelector(this.#sessionnamesSelector);
        const sessions = await Fetcher.getInstance().listSessions();
        for (let i=0; i<sessions.length; i++) {
            let s = sessions[i];
            let option = document.createElement('option');
            option.selected = (i === 0);
            //option.value = s.session_id;
            option.value = s.name;
            option.innerHTML = s.name;
            sessionNames.appendChild(option);
        }
    }

    static getInstance() {
        if (Login.#instance === undefined || Login.#instance === null) {
            Login.#instance = new Login();
        }
        return Login.#instance;
    }
}