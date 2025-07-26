import { Kinder } from './index.js';
import { Fetcher } from './Fetcher.js';
import { ProviderSelection } from './login/provider.js';
import { GenreSelection } from './login/genre.js';
import { WatchedSelection } from './login/watched.js';
import { AgeSelection } from './login/age.js';
import { DurationSelection } from './login/duration.js';
import { UsernameSelection } from './login/username.js';
import { EndConditionSelection } from './login/end.js';
import { SessionnameSelection } from './login/sessionname.js';

export class Login {
    // Selector for the complete login content div
    #loginContainerSelector = 'div[name="login-container"]';
  
    // Selector for the Session create/join parent div
    #sessionTabsSelector = this.#loginContainerSelector + ' ul[name="session-switch"]';
    #sessionNewTab = this.#sessionTabsSelector + ' a[name="create"]';
    #sessionJoinTab = this.#sessionTabsSelector + ' a[name="join"]';
    // Selector for the Session create div
    #sessionCreateSelector = this.#loginContainerSelector + ' div[name="session-create"]';
    //Selector for the Session join div
    #sessionJoinSelector = this.#loginContainerSelector + ' div[name="session-join"]';
    #loginButtonSelector = this.#loginContainerSelector + ' button.btn-primary';

    #miscSelectionBtn = this.#loginContainerSelector + ' div[name="misc-selection-btn"]';
    #miscSelectionBtnIcon = this.#loginContainerSelector + ' i[name="misc-selection-btn-icon"]';
    #infoIcon = this.#loginContainerSelector + ' i[name="misc-selection-info-icon"]';
    #miscSelection = this.#loginContainerSelector + ' div[name="misc-selection"]';

    #usernameSelection;
    #sessionnameSelection;
    #providerSelection;
    #genresSelection;
    #watchedSelection;
    #ageSelection;
    #durationSelection;
    #endSelection;

    constructor() {
        this.#init();
    }

    async #loginSuccess() {
        this.#usernameSelection.focus();
        // username.classList.remove('is-invalid');
        // username.value = '';

        // const session = document.querySelector(this.#sessionnameSelector);
        // session.classList.add('is-invalid');
        // session.value = '';

        const button = document.querySelector(this.#loginButtonSelector);
        button.enabled = false;

        let sessions = await Fetcher.getInstance().listSessions();
        this.#sessionnameSelection.reInit(sessions);

        document.querySelector(this.#sessionNewTab).classList.remove('active');
        let joinTab = document.querySelector(this.#sessionJoinTab);
        joinTab.classList.add('active');
        joinTab.dispatchEvent(new Event('click'));

        window.location = '/vote'
    }

    async #login() {
        const username = this.#usernameSelection.getUsername();
        const sessionname = this.#sessionnameSelection.getSessionname(this.#getSessionChoice());
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
            this.#sessionnameSelection.validate();
            return;
        }

        const user = await Fetcher.getInstance().imposeUser(username);
        let session = null;
        if (user.error === undefined) {
            session = await Fetcher.getInstance().getMatchingSession(sessionname);
            if (session === null) {
                session = await Fetcher.getInstance().startSession(
                    sessionname,
                    this.#providerSelection.getProviders(),
                    this.#genresSelection.getDisabledGenres(),
                    this.#genresSelection.getMustGenres(),
                    this.#ageSelection.getMaxAge(),
                    this.#durationSelection.getMaxDuration(),
                    this.#watchedSelection.getIncludeWatched(),
                    this.#endSelection.getSessionMaxTime(),
                    this.#endSelection.getSessionMaxVotes(),
                    this.#endSelection.getSessionMaxMatches());
            }
        }
        if (user && user.error === undefined && session && session.error === undefined) {
            Kinder.setCookie('username', username, 14);
            Kinder.setSession(session);
            Kinder.setUser(user);
            this.#loginSuccess();
        }
        else if (user.error) {
            this.#usernameSelection.setInvalid();
        } else if (session.error) {
            Kinder.persistantToast('Error creating voting session!', '!!! Error !!!');
        } else {
            Kinder.persistantToast('Unknown error!', '!!! Error !!!');
        }
    }

    #validate() {
        this.#usernameSelection.validate(false);
        this.#sessionnameSelection.validate(false);
        this.#genresSelection.validate(false);
        this.#providerSelection.validate(false);
        this.#endSelection.validate(false);

        return this.#loginButtonCheck();
    }

    #infoIconDisplay() {
        const age = this.#ageSelection.getMaxAge();
        const duration = this.#durationSelection.getMaxDuration();
        const watched = this.#watchedSelection.getIncludeWatched();

        const info = document.querySelector(this.#infoIcon);
        if (age <= 16 || duration <= 240 || !watched) {
            info.classList.remove('d-none');
        } else {
            info.classList.add('d-none');
        }
    }

    #loginButtonCheck() {
        const loginButton = document.querySelector(this.#loginButtonSelector);

        let userInvalid = !this.#usernameSelection.isValid();
        let sessionInvalid = !this.#sessionnameSelection.isValid();
        let sourcesInvalid = !this.#providerSelection.isValid();
        let genresInvalid = !this.#genresSelection.isValid();
        let endInvalid = !this.#endSelection.isValid();
        if (this.#getSessionChoice() === 'join') {
            loginButton.disabled = userInvalid;
        } else {
            loginButton.disabled = 
                userInvalid
                || sessionInvalid
                || endInvalid
                || genresInvalid
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
            loginButton.innerHTML = 'Join';
            createContainer.classList.add('d-none');
            joinContainer.classList.remove('d-none');
            newTab.classList.remove('active');
            joinTab.classList.add('active');
            this.#sessionnameSelection.setJoinRejoinBySessionSelection();
        } else {
            createContainer.classList.add('d-none');
            joinContainer.classList.add('d-none');
        }

        this.#validate();
    }

    async #init() {
        let _this = this;
        const loginButton = document.querySelector(this.#loginButtonSelector);
        loginButton.addEventListener('click', () => {
            _this.#login();
        });
        const link = document.querySelector('div[name="about-link"]');
        if (link !== undefined && link !== null) {
            link.addEventListener('click', () => {
                window.location = '/about'
            });
        }

        const loginContainer = document.querySelector(this.#loginContainerSelector);
        loginContainer.addEventListener('loginButtonCheckRequest', () => {
            _this.#loginButtonCheck();
        });
        loginContainer.addEventListener('loginRequest', () => {
            if (!loginButton.disabled) {
                _this.#login();
            }
        });
        loginContainer.addEventListener('loginButtonRejoinRequest', () => {
            if (this.#getSessionChoice() === 'join') {
                loginButton.innerHTML = 'Rejoin';
            }
        });
        loginContainer.addEventListener('loginButtonJoinRequest', () => {
            if (this.#getSessionChoice() === 'join') {
                loginButton.innerHTML = 'Join';
            }
        });
        loginContainer.addEventListener('miscellaneousChanged', () => {
            _this.#infoIconDisplay();
        });

        let sessions = Fetcher.getInstance().listSessions();
        let settings = Fetcher.getInstance().settings();
        let users = Fetcher.getInstance().listUsers();

        this.#usernameSelection = new UsernameSelection(this.#loginContainerSelector);
        this.#sessionnameSelection = new SessionnameSelection(this.#loginContainerSelector, this.#usernameSelection);
        this.#genresSelection = new GenreSelection(this.#loginContainerSelector);
        this.#ageSelection = new AgeSelection(this.#loginContainerSelector);
        this.#durationSelection = new DurationSelection(this.#loginContainerSelector);
        this.#watchedSelection = new WatchedSelection(this.#loginContainerSelector);
        this.#providerSelection = new ProviderSelection(this.#loginContainerSelector);
        this.#endSelection = new EndConditionSelection(this.#loginContainerSelector);

        const miscBtn = document.querySelector(this.#miscSelectionBtn);
        miscBtn.addEventListener('click', () => {
            const miscSelection = document.querySelector(this.#miscSelection);
            if (miscSelection.classList.contains('d-none')) {
                _this.#unhideMiscSelection();
            } else {
                _this.#hideMiscSelection();
            }
        });

        sessions.then((data) => {
            this.#initSessionNewExistTabs(data);
            document.querySelector(this.#loginContainerSelector).dispatchEvent(new CustomEvent('sessions.loaded', {
                detail: {
                    sessions: data
                }
            }));
        });
        
        this.#usernameSelection.focus();

        settings.then((data) => {
            document.querySelector(this.#loginContainerSelector).dispatchEvent(new CustomEvent('settings.loaded', {
                detail: {
                    settings: data
                }
            }));

            if (this.#ageSelection.isHidden() && this.#durationSelection.isHidden() && this.#watchedSelection.isHidden()) {
                document.querySelector(this.#miscSelectionBtn).classList.add('d-none');
            }
        });

        users.then((data) => {
            document.querySelector(this.#loginContainerSelector).dispatchEvent(new CustomEvent('users.loaded', {
                detail: {
                    users: data
                }
            }));
        });

        // this.#checkLoginParameter();
    }

    // #checkLoginParameter() {
    //     const url = new URL(window.location.href);
    //     const params = new URLSearchParams(url.search);
    //     const login = params.get('login');
    //     if (login !== undefined && login !== null && login === 'join' && this.#validate()) {
    //         this.#login();
    //     }
    // }

    #hideMiscSelection() {
        const miscSelection = document.querySelector(this.#miscSelection);
        const miscBtn = document.querySelector(this.#miscSelectionBtn);
        const miscBtnIcon = document.querySelector(this.#miscSelectionBtnIcon);

        miscSelection.classList.add('d-none');
        miscBtn.classList.remove('btn-secondary');
        miscBtn.classList.add('btn-outline-secondary');
        miscBtnIcon.classList.remove('bi-caret-down-fill');
        miscBtnIcon.classList.add('bi-caret-right-fill');
    }

    #unhideMiscSelection() {
        const miscSelection = document.querySelector(this.#miscSelection);
        const miscBtn = document.querySelector(this.#miscSelectionBtn);
        const miscBtnIcon = document.querySelector(this.#miscSelectionBtnIcon);

        miscSelection.classList.remove('d-none');
        miscBtn.classList.remove('btn-outline-secondary');
        miscBtn.classList.add('btn-secondary');
        miscBtnIcon.classList.remove('bi-caret-right-fill');
        miscBtnIcon.classList.add('bi-caret-down-fill');
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
        }
    }
}