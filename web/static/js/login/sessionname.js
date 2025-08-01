import { random_names } from '../randomNames.js';
import { Fetcher } from "../Fetcher.js";

export class SessionnameSelection {
    #loginContainer;
    #usernameSelection;
    #sessionnameInput;
    #sessionnamesSelect;

    constructor(loginContainerSelector, usernameSelection) {
        this.#loginContainer = document.querySelector(loginContainerSelector);
        this.#usernameSelection = usernameSelection;
        this.#sessionnameInput = this.#loginContainer.querySelector('input[name="sessionname"]');
        this.#sessionnamesSelect = this.#loginContainer.querySelector('select[name="sessinonames"]');
        this.#init();
    }

    #init() {
        let _this = this;
        this.#sessionnameInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                this.#loginContainer.dispatchEvent(new Event('loginRequest'));
            }
        });
        this.#sessionnameInput.addEventListener('input', () => { _this.validate(); });
        this.#loginContainer.addEventListener('username.changed', () => {
            _this.setJoinRejoinBySessionSelection();
        });
        this.#loginContainer.addEventListener('sessions.loaded', (e) => {
            let sessions = e.detail.sessions;
            _this.#initCreateSessionInput(sessions);
            _this.#initJoinSessionDropdown(sessions);
            _this.validate();
        });
        this.#sessionnamesSelect.addEventListener('change', () => {
            this.setJoinRejoinBySessionSelection();
        });
    }

    reInit(sessions, preserveJoinSelected=false) {
        this.#initCreateSessionInput(sessions);
        this.#initJoinSessionDropdown(sessions, preserveJoinSelected);
    }

    #initCreateSessionInput(sessions) {
        const sessionNames = sessions.map((s, i) => s.name);
        if (this.#sessionnameInput.value.trim() === '' || sessionNames.includes(this.#sessionnameInput.value.trim())) {
            this.#sessionnameInput.value = this.#randomSessionname(sessionNames);
        }
    }

    #initJoinSessionDropdown(sessions, preserveJoinSelected=false) {
        // remove everything first, for reinit
        let previousSelected = null;
        while (this.#sessionnamesSelect.firstChild) {
            if (previousSelected === null && this.#sessionnamesSelect.firstChild.selected) {
                previousSelected = parseInt(this.#sessionnamesSelect.firstChild.value);
            }
            this.#sessionnamesSelect.removeChild(this.#sessionnamesSelect.firstChild);
        }
        for (let i=0; i<sessions.length; i++) {
            let s = sessions[i];
            let option = document.createElement('option');
            let selected = (preserveJoinSelected && previousSelected !== null && previousSelected === s.session_id) || (!preserveJoinSelected && i === 0);
            option.selected = selected;
            option.value = s.session_id;
            option.innerHTML = s.name;
            this.#sessionnamesSelect.appendChild(option);
        }
        this.#sessionnamesSelect.disabled = sessions.length <= 1;
        this.setJoinRejoinBySessionSelection();
    }

    async setJoinRejoinBySessionSelection() {
        this.#loginContainer.dispatchEvent(new Event('sessionSelectionChanged'));
        const sessionId = this.#sessionnamesSelect.value.trim();
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
                if (user.name === this.#usernameSelection.getUsername()) {
                    this.#loginContainer.dispatchEvent(new Event('loginButtonRejoinRequest'));
                    wasRejoin = true;
                    break;
                }
            }
        }
        if (!wasRejoin) {
            this.#loginContainer.dispatchEvent(new Event('loginButtonJoinRequest'));
        }
    }
    
    async getSessionname(choice) {
        if (choice === 'create') {
            return this.#sessionnameInput.value.trim();
        } else if (choice === 'join') {
            let id = parseInt(this.#sessionnamesSelect.value.trim());
            if (isNaN(id)) {
                return null;
            }
            return await Fetcher.getInstance().getSession(id);
        }
        return '';
    }

    isValid() {
        return !this.#sessionnameInput.classList.contains('is-invalid');
    }

    validate(buttonChek = true) {
        let _this = this;
        const sessionname = this.#sessionnameInput.value.trim();
        if (sessionname === '') {
            this.#sessionnameInput.classList.add('is-invalid');
            if (buttonChek) {
                this.#loginContainer.dispatchEvent(new Event('loginButtonCheckRequest'));
            }
        } else {
            const session = Fetcher.getInstance().getSessionByName(sessionname);
            session.then((data) => {
                // cause the input can change while the request is running
                const sessionnameNow = this.#sessionnameInput.value.trim()
                if (sessionname !== sessionnameNow) {
                    _this.validate(buttonChek);
                    return;
                }
                if (data === undefined || data === null) {
                    _this.#sessionnameInput.classList.remove('is-invalid');
                } else {
                    _this.#sessionnameInput.classList.add('is-invalid');
                }
                if (buttonChek) {
                    this.#loginContainer.dispatchEvent(new Event('loginButtonCheckRequest'));
                }
            });
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