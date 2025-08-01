import { Kinder } from '../index.js';
import { Fetcher } from '../Fetcher.js';

export class UsernameSelection {
    #loginContainerSelector;
    #usernameInput;

    constructor(loginContainerSelector) {
        this.#loginContainerSelector = loginContainerSelector;
        this.#usernameInput = this.#loginContainerSelector + ' input[name="username"]';
        this.#init();
    }

    #init() {
        let _this = this;
        const usernameInput = document.querySelector(this.#usernameInput);
        usernameInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                document.querySelector(_this.#loginContainerSelector).dispatchEvent(new Event('loginRequest'));
            }
        });
        usernameInput.addEventListener('input', () => { 
            document.querySelector(_this.#loginContainerSelector).dispatchEvent(new Event('username.changed'));
            _this.validate();
        });
        document.querySelector(this.#loginContainerSelector).addEventListener('users.loaded', async (e) => {
            let users = e.detail.users;
            await _this.#setUsernameValue(users);
            _this.validate();
        });
    }

    focus() {
        const username = document.querySelector(this.#usernameInput);
        username.focus();
    }

    isValid() {
        return !document.querySelector(this.#usernameInput).classList.contains('is-invalid');
    }

    validate(buttonChek = true) {
        const username = this.getUsername();
        if (username === '') {
            document.querySelector(this.#usernameInput).classList.add('is-invalid');
        } else {
            document.querySelector(this.#usernameInput).classList.remove('is-invalid');
        }

        if (buttonChek) {
            document.querySelector(this.#loginContainerSelector).dispatchEvent(new Event('loginButtonCheckRequest'));
        }
    }

    setInvalid() {
        document.querySelector(this.#usernameInput).classList.add('is-invalid');
    }

    getUsername() {
        const username = document.querySelector(this.#usernameInput).value.trim();
        return username;
    }

    async #setUsernameValue(users) {
        let usernameFromCookie = Kinder.getCookie('username');
        const usernameInput = document.querySelector(this.#usernameInput);

        if (usernameFromCookie !== undefined && usernameFromCookie !== null && usernameFromCookie.trim().length > 0 && usernameFromCookie.trim() !== '') {
            usernameInput.value = usernameFromCookie;
            return true;
        } else {
            const userNames = users.map((u, i) => u.name);
            usernameInput.value = await this.#randomUsername(userNames);
            return false;
        }
    }

    async #randomUsername(usedUserNames, recall=0) {
        const usernameSuggestions = await Fetcher.getInstance().usernameSuggestions();
        let username = usernameSuggestions[Math.floor(Math.random() * usernameSuggestions.length)];
        if (usedUserNames.includes(username) && recall < usernameSuggestions.length) {
            return await this.#randomUsername(usedUserNames, recall++);
        } else if (usedUserNames.includes(username)) {
            username = '';
        }
        return username;
    }
}