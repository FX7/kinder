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
import { OverlaySelection } from './login/overlay.js';
import { JoinInfo } from './login/joinInfo.js';

export class Login {
    // Selector for the complete login content div
    #loginContainerSelector = 'div[name="login-container"]';
    #loginContainer = document.querySelector(this.#loginContainerSelector);
  
    // Selector for the Session create/join parent div
    #sessionTabsSelector = this.#loginContainerSelector + ' ul[name="session-switch"]';
    #sessionNewTab = this.#sessionTabsSelector + ' a[name="create"]';
    #sessionJoinTab = this.#sessionTabsSelector + ' a[name="join"]';
    // Selector for the Session create div
    #sessionCreateSelector = this.#loginContainerSelector + ' div[name="session-create"]';
    //Selector for the Session join div
    #sessionJoinSelector = this.#loginContainerSelector + ' div[name="session-join"]';
    #sessionJoinContainer = this.#loginContainer.querySelector('div[name="session-join"]');
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
    #overlaySelection;
    #endSelection;
    #joinInfo;

    #startDate = new Date();
    #knownSessionIds = new Set();
    #sessionCheckInterval = null;

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

    async #joinSession(username, session, autoJoin = false) {
        const user = await Fetcher.getInstance().imposeUser(username);
        return {
            user: user,
            session: session
        }
    }

    async #createSession(username, sessionname) {
        const user = await Fetcher.getInstance().imposeUser(username);
        let session = null;
        if (user.error === undefined) {
            session = await Fetcher.getInstance().startSession(
                sessionname,
                user,
                this.#providerSelection.getProviders(),
                this.#genresSelection.getDisabledGenres(),
                this.#genresSelection.getMustGenres(),
                this.#ageSelection.getMaxAge(),
                this.#durationSelection.getMaxDuration(),
                this.#watchedSelection.getIncludeWatched(),
                this.#endSelection.getSessionMaxTime(),
                this.#endSelection.getSessionMaxVotes(),
                this.#endSelection.getSessionMaxMatches(),
                this.#overlaySelection.getOverlayTitle(),
                this.#overlaySelection.getOverlayDuration(),
                this.#overlaySelection.getOverlayGenres(),
                this.#overlaySelection.getOverlayWatched(),
                this.#overlaySelection.getOverlayAge());
        }
        return {
            user: user,
            session: session
        }
    }

    async #login() {
        const username = this.#usernameSelection.getUsername();
        const sessionname = await this.#sessionnameSelection.getSessionname(this.#getSessionChoice());
        // this shouldnt happen but on FF Android you can start / Join, go back
        // and then you can join with empty username.
        if (username === '') {
            // Reload entire site to make the cookie stuff and username generation stuff
            window.location = '/';
            return;
        }
        // this shouldnt happen but on FF Android you can start / Join, go back
        // and then you can join with empty sessionname.
        if (sessionname === '') {
            // User should be there, so only inactivate loginButton by revalidating the sessionname
            this.#sessionnameSelection.validate();
            return;
        }

        const choise = this.#getSessionChoice();
        let result;
        if (choise === 'join') {
            result = await this.#joinSession(username, sessionname);
        } else {
            result = await this.#createSession(username, sessionname);
        }

        let user = result.user;
        let session = result.session;
        this.#loginEvaluation(user, session);
    }

    #loginEvaluation(user, session) {
        if (user && user.error === undefined && session && session.error === undefined) {
            if (this.#sessionCheckInterval !== null) {
                clearInterval(this.#sessionCheckInterval);
            }
            Kinder.setCookie('username', user.name, 14);
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

    #infoIconDisplay(providers) {
        const age = this.#ageSelection.getMaxAge();
        const duration = this.#durationSelection.getMaxDuration();
        const watched = this.#watchedSelection.getIncludeWatched();

        const info = document.querySelector(this.#infoIcon);
        if (age <= 16 || duration <= 240 || (!watched && providers.includes('kodi'))) {
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
        loginContainer.addEventListener('sessionSelectionChanged', () => {
            _this.#updateJoinSessionInfo();
        });
        loginContainer.addEventListener('loginButtonRejoinRequest', () => {
            if (_this.#getSessionChoice() === 'join') {
                loginButton.innerHTML = 'Rejoin';
            }
        });
        loginContainer.addEventListener('loginButtonJoinRequest', () => {
            if (_this.#getSessionChoice() === 'join') {
                loginButton.innerHTML = 'Join';
            }
        });
        loginContainer.addEventListener('miscellaneousChanged', () => {
            _this.#infoIconDisplay(_this.#providerSelection.getProviders());
        });
        loginContainer.addEventListener('providers.validated', (e) => {
            _this.#infoIconDisplay(e.detail.providers);
        });

        let sessions = Fetcher.getInstance().listSessions();
        let settings = Fetcher.getInstance().settings();
        let users = Fetcher.getInstance().listUsers();

        this.#usernameSelection = new UsernameSelection(this.#loginContainer);
        this.#sessionnameSelection = new SessionnameSelection(this.#loginContainer, this.#usernameSelection);
        this.#genresSelection = new GenreSelection(this.#loginContainer);
        this.#ageSelection = new AgeSelection(this.#loginContainer);
        this.#durationSelection = new DurationSelection(this.#loginContainer);
        this.#watchedSelection = new WatchedSelection(this.#loginContainer);
        this.#providerSelection = new ProviderSelection(this.#loginContainer);
        this.#overlaySelection = new OverlaySelection(this.#loginContainer);
        this.#endSelection = new EndConditionSelection(this.#loginContainer);
        this.#joinInfo = new JoinInfo(this.#sessionJoinContainer);

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
    }

    async #updateJoinSessionInfo() {
        const session = await this.#sessionnameSelection.getSessionname('join');
        this.#joinInfo.display(session);
    }

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
        let _this = this;
        let choices = document.querySelectorAll(this.#sessionTabsSelector + ' a');
        choices.forEach((c) => c.addEventListener('click', (e) => _this.#sessionChoiseClick(e)));
        let newTab = document.querySelector(this.#sessionNewTab);
        let joinTab = document.querySelector(this.#sessionJoinTab);
        if (sessions.length === 0) {
            joinTab.classList.remove('active');
            joinTab.classList.add('disabled');
            newTab.classList.add('active');
            newTab.dispatchEvent(new Event('click'));
        } else {
            joinTab.classList.add('active');
            newTab.classList.remove('active');
            joinTab.dispatchEvent(new Event('click'));
        }
        this.#sessionCheckInterval = setInterval(() => { _this.#checkForNewSessions(); }, 3500);
    }

    async #checkForNewSessions() {
        const sessions = await Fetcher.getInstance().listSessions();
        let reInit = false;
        for (let i=0; i<sessions.length; i++) {
            let session = sessions[i];
            if (!this.#knownSessionIds.has(session.session_id)
                && new Date(session.start_date) > this.#startDate) {
                let user = await Fetcher.getInstance().getUser(session.creator_id);
                let title = "<i class='bi bi-people-fill'></i> New session '" + session.name + "' created!";
                let message = this.#createJoinMessage(user, session);
                Kinder.overwriteableToast(message, title, 'session');
                let joinTab = document.querySelector(this.#sessionJoinTab);
                joinTab.classList.remove('disabled');
                reInit = true;
            }
            this.#knownSessionIds.add(session.session_id);
        }
        if (reInit) {
            this.#sessionnameSelection.reInit(sessions, true);
        }
    }

    #createJoinMessage(user, session) {
        let _this = this;
        let message = document.createElement('div');
        message.classList.add('d-flex');

        let titleElement = document.createElement('span')
        titleElement.classList.add('flex-grow-1');
        titleElement.innerHTML = user.name + " startet new session.";
        message.appendChild(titleElement)

        let joinBtn = document.createElement('button');
        joinBtn.type = 'button';
        joinBtn.classList.add('btn', 'btn-secondary', 'btn-sm', 'ms-3');
        joinBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i>';
        message.appendChild(joinBtn);

        joinBtn.addEventListener('click', async () => {
            let result = await _this.#joinSession(_this.#usernameSelection.getUsername(), session, true);
            _this.#loginEvaluation(result.user, result.session);
        });
        return message;
    }
}