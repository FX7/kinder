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
    #loginContainerSelector = 'div[name="login-container"]';
    // complete login content div
    #loginContainer = document.querySelector('div[name="login-container"]');
  
    // Selector for the Session create/join parent div
    #sessionTabsSelector = this.#loginContainerSelector + ' ul[name="session-switch"]';
    #sessionNewTab = document.querySelector(this.#sessionTabsSelector + ' a[name="create"]');
    #sessionJoinTab = document.querySelector(this.#sessionTabsSelector + ' a[name="join"]');
    // Session create div
    #sessionCreateContainer = this.#loginContainer.querySelector('div[name="session-create"]');
    // Session join div
    #sessionJoinContainer = this.#loginContainer.querySelector('div[name="session-join"]');

    #loginButton = this.#loginContainer.querySelector('button.btn-primary');

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

        this.#loginButton.enabled = false;

        let sessions = await Fetcher.getInstance().listSessions();
        this.#sessionnameSelection.reInit(sessions);

        this.#sessionNewTab.classList.remove('active');
        this.#sessionJoinTab.classList.add('active');
        this.#sessionJoinTab.dispatchEvent(new Event('click'));

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
        let userInvalid = !this.#usernameSelection.isValid();
        let sessionInvalid = !this.#sessionnameSelection.isValid();
        let sourcesInvalid = !this.#providerSelection.isValid();
        let genresInvalid = !this.#genresSelection.isValid();
        let endInvalid = !this.#endSelection.isValid();
        if (this.#getSessionChoice() === 'join') {
            this.#loginButton.disabled = userInvalid;
        } else {
            this.#loginButton.disabled = 
                userInvalid
                || sessionInvalid
                || endInvalid
                || genresInvalid
                || sourcesInvalid;
        }

        return !this.#loginButton.disabled;
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

        if (sessionChoice === 'create') {
            this.#loginButton.innerHTML = 'Create';
            this.#sessionCreateContainer.classList.remove('d-none');
            this.#sessionJoinContainer.classList.add('d-none');
            this.#sessionNewTab.classList.add('active');
            this.#sessionJoinTab.classList.remove('active');
        } else if (sessionChoice == 'join') {
            this.#loginButton.innerHTML = 'Join';
            this.#sessionCreateContainer.classList.add('d-none');
            this.#sessionJoinContainer.classList.remove('d-none');
            this.#sessionNewTab.classList.remove('active');
            this.#sessionJoinTab.classList.add('active');
            this.#sessionnameSelection.setJoinRejoinBySessionSelection();
        } else {
            this.#sessionCreateContainer.classList.add('d-none');
            this.#sessionJoinContainer.classList.add('d-none');
        }

        this.#validate();
    }

    async #init() {
        let _this = this;
        this.#loginButton.addEventListener('click', () => {
            _this.#login();
        });
        const link = document.querySelector('div[name="about-link"]');
        if (link !== undefined && link !== null) {
            link.addEventListener('click', () => {
                window.location = '/about'
            });
        }

        this.#loginContainer.addEventListener('loginButtonCheckRequest', () => {
            _this.#loginButtonCheck();
        });
        this.#loginContainer.addEventListener('loginRequest', () => {
            if (!_this.#loginButton.disabled) {
                _this.#login();
            }
        });
        this.#loginContainer.addEventListener('sessionSelectionChanged', () => {
            _this.#updateJoinSessionInfo();
        });
        this.#loginContainer.addEventListener('loginButtonRejoinRequest', () => {
            if (_this.#getSessionChoice() === 'join') {
                _this.#loginButton.innerHTML = 'Rejoin';
            }
        });
        this.#loginContainer.addEventListener('loginButtonJoinRequest', () => {
            if (_this.#getSessionChoice() === 'join') {
                _this.#loginButton.innerHTML = 'Join';
            }
        });
        this.#loginContainer.addEventListener('miscellaneousChanged', () => {
            _this.#infoIconDisplay(_this.#providerSelection.getProviders());
        });
        this.#loginContainer.addEventListener('providers.validated', (e) => {
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
            _this.#loginContainer.dispatchEvent(new CustomEvent('sessions.loaded', {
                detail: {
                    sessions: data
                }
            }));
        });
        
        this.#usernameSelection.focus();

        settings.then((data) => {
            _this.#loginContainer.dispatchEvent(new CustomEvent('settings.loaded', {
                detail: {
                    settings: data
                }
            }));

            if (this.#ageSelection.isHidden() && this.#durationSelection.isHidden() && this.#watchedSelection.isHidden()) {
                document.querySelector(this.#miscSelectionBtn).classList.add('d-none');
            }
        });

        users.then((data) => {
            _this.#loginContainer.dispatchEvent(new CustomEvent('users.loaded', {
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
        if (sessions.length === 0) {
            this.#sessionJoinTab.classList.remove('active');
            this.#sessionJoinTab.classList.add('disabled');
            this.#sessionNewTab.classList.add('active');
            this.#sessionNewTab.dispatchEvent(new Event('click'));
        } else {
            this.#sessionJoinTab.classList.add('active');
            this.#sessionNewTab.classList.remove('active');
            this.#sessionJoinTab.dispatchEvent(new Event('click'));
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
                this.#sessionJoinTab.classList.remove('disabled');
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