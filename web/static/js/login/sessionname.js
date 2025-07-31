import { Kinder } from '../index.js';
import { random_names } from '../randomNames.js';
import { Fetcher } from "../Fetcher.js";

export class SessionnameSelection {
    #loginContainerSelector;
    #usernameSelection;
    // Selector for the new sessionname input
    #sessionnameSelector;
    // Selector for the joining sessionname select
    #sessionnamesSelector;

    constructor(loginContainerSelector, usernameSelection) {
        this.#loginContainerSelector = loginContainerSelector;
        this.#usernameSelection = usernameSelection;
        this.#sessionnameSelector = loginContainerSelector + ' input[name="sessionname"]';
        this.#sessionnamesSelector = loginContainerSelector + ' select[name="sessinonames"]';

        this.#init();
    }

    #init() {
        let _this = this;
        const sessionInput = document.querySelector(this.#sessionnameSelector);
        sessionInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                document.querySelector(this.#loginContainerSelector).dispatchEvent(new Event('loginRequest'));
            }
        });
        sessionInput.addEventListener('input', () => { _this.validate(); });

        document.querySelector(_this.#loginContainerSelector).addEventListener('username.changed', () => {
            _this.setJoinRejoinBySessionSelection();
        });

        document.querySelector(this.#loginContainerSelector).addEventListener('sessions.loaded', (e) => {
            let sessions = e.detail.sessions;
            _this.#initCreateSessionInput(sessions);
            _this.#initJoinSessionDropdown(sessions);
            _this.validate();
        });
        const sessionNames = document.querySelector(this.#sessionnamesSelector);
        sessionNames.addEventListener('change', () => {
            this.setJoinRejoinBySessionSelection();
        });
    }

    reInit(sessions, preserveJoinSelected=false) {
        this.#initCreateSessionInput(sessions);
        this.#initJoinSessionDropdown(sessions, preserveJoinSelected);
    }

    #initCreateSessionInput(sessions) {
        const sessionNames = sessions.map((s, i) => s.name);

        const sessionInput = document.querySelector(this.#sessionnameSelector);
        if (sessionInput.value.trim() === '' || sessionNames.includes(sessionInput.value.trim())) {
            sessionInput.value = this.#randomSessionname(sessionNames);
        }
    }

    #initJoinSessionDropdown(sessions, preserveJoinSelected=false) {
        const sessionNames = document.querySelector(this.#sessionnamesSelector);

        // remove everything first, for reinit
        let previousSelected = null;
        while (sessionNames.firstChild) {
            if (previousSelected === null && sessionNames.firstChild.selected) {
                previousSelected = parseInt(sessionNames.firstChild.value);
            }
            sessionNames.removeChild(sessionNames.firstChild);
        }

        for (let i=0; i<sessions.length; i++) {
            let s = sessions[i];
            let option = document.createElement('option');
            let selected = (preserveJoinSelected && previousSelected !== null && previousSelected === s.session_id) || (!preserveJoinSelected && i === 0);
            option.selected = selected;
            option.value = s.session_id;
            option.innerHTML = s.name;
            sessionNames.appendChild(option);
        }

        sessionNames.disabled = sessions.length <= 1;

        this.setJoinRejoinBySessionSelection();
    }

    async setJoinRejoinBySessionSelection() {
        document.querySelector(this.#loginContainerSelector).dispatchEvent(new Event('sessionSelectionChanged'));
        const sessionId = document.querySelector(this.#sessionnamesSelector).value.trim();
        let session = null;
        if (sessionId !== undefined && sessionId !== null && sessionId !== '') {
            session = await Fetcher.getInstance().getSession(sessionId);
        }
        let wasRejoin = false;
        if (session !== undefined && session !== null)
        {
            const status = await Fetcher.getInstance().getSessionStatus(session.session_id);
            let user_ids = [].concat(status.user_ids).concat(session.creator_id);
            for (let i=0; i<user_ids.length; i++) {
                let user = await Fetcher.getInstance().getUser(user_ids[i]);
                // because it can take a while to fetch all users and session
                // and meanwhile the username changed, or the choice (create/join)
                // changed, so double check it here
                if (user.name === this.#usernameSelection.getUsername()) {
                    document.querySelector(this.#loginContainerSelector).dispatchEvent(new Event('loginButtonRejoinRequest'));
                    wasRejoin = true;
                    break;
                }
            }
        }
        if (!wasRejoin) {
            document.querySelector(this.#loginContainerSelector).dispatchEvent(new Event('loginButtonJoinRequest'));
        }
    }
    
    async getSessionname(choice) {
        if (choice === 'create') {
            return document.querySelector(this.#sessionnameSelector).value.trim();
        } else if (choice === 'join') {
            let id = parseInt(document.querySelector(this.#sessionnamesSelector).value.trim());
            if (isNaN(id)) {
                return null;
            }
            return await Fetcher.getInstance().getSession(id);
        }
        return '';
    }

    isValid() {
        return !document.querySelector(this.#sessionnameSelector).classList.contains('is-invalid');
    }

    async validate(buttonChek = true) {
        const sessionname = document.querySelector(this.#sessionnameSelector).value.trim();
        if (sessionname === '') {
            document.querySelector(this.#sessionnameSelector).classList.add('is-invalid');
        } else {
            const session = await Fetcher.getInstance().getSessionByName(sessionname);
            if (session === undefined || session === null) {
                document.querySelector(this.#sessionnameSelector).classList.remove('is-invalid');
            } else {
                document.querySelector(this.#sessionnameSelector).classList.add('is-invalid');
            }
        }

        if (buttonChek) {
            document.querySelector(this.#loginContainerSelector).dispatchEvent(new Event('loginButtonCheckRequest'));
        }
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
}