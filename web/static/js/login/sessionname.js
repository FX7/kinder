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
    }

    reInit(sessions) {
        this.#initCreateSessionInput(sessions);
        this.#initJoinSessionDropdown(sessions);
    }

    #initCreateSessionInput(sessions) {
        const sessionNames = sessions.map((s, i) => s.name);

        const sessionInput = document.querySelector(this.#sessionnameSelector);
        sessionInput.value = this.#randomSessionname(sessionNames);
    }

    #initJoinSessionDropdown(sessions) {
        const sessionNames = document.querySelector(this.#sessionnamesSelector);
        sessionNames.addEventListener('change', () => {
            this.setJoinRejoinBySessionSelection();
        });

        // remove everything first, for reinit
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
        if (sessions.length <= 1) {
            sessionNames.disabled = true;
        }
        this.setJoinRejoinBySessionSelection();
    }

    async setJoinRejoinBySessionSelection() {
        const sessionName = document.querySelector(this.#sessionnamesSelector).value.trim();
        const session = await Fetcher.getInstance().getMatchingSession(sessionName);
        let wasRejoin = false;
        if (session !== undefined && session !== null)
        {
            const status = await Fetcher.getInstance().getSessionStatus(session.session_id);
            for (let i=0; i<status.user_ids.length; i++) {
                let user = await Fetcher.getInstance().getUser(status.user_ids[i]);
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
    
    getSessionname(choice) {
        if (choice === 'create') {
            return document.querySelector(this.#sessionnameSelector).value.trim();
        } else if (choice === 'join') {
            return document.querySelector(this.#sessionnamesSelector).value.trim();
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
            const session = await Fetcher.getInstance().getMatchingSession(sessionname);
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