import { Kinder } from '../index.js';
import { Fetcher } from '../Fetcher.js';

export class UsernameSelection {
    #loginContainer;
    #usernameInput;

    constructor(loginContainer) {
        this.#loginContainer = loginContainer;
        this.#usernameInput = this.#loginContainer.querySelector('input[name="username"]');
        this.#init();
    }

    #init() {
        let _this = this;
        this.#usernameInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                _this.#loginContainer.dispatchEvent(new Event('loginRequest'));
            }
        });
        this.#usernameInput.addEventListener('input', () => { 
            _this.#loginContainer.dispatchEvent(new Event('username.changed'));
            _this.validate();
        });
        this.#loginContainer.addEventListener('users.loaded', async (e) => {
            let users = e.detail.users;
            await _this.#setUsernameValue(users);
            _this.validate();
        });
    }

    focus() {
        this.#usernameInput.focus();
    }

    isValid() {
        return !this.#usernameInput.classList.contains('is-invalid');
    }

    validate(buttonChek = true) {
        const username = this.getUsername();
        if (username === '') {
            this.#usernameInput.classList.add('is-invalid');
        } else {
            this.#usernameInput.classList.remove('is-invalid');
        }

        if (buttonChek) {
            this.#loginContainer.dispatchEvent(new Event('loginButtonCheckRequest'));
        }
    }

    setInvalid() {
        this.#usernameInput.classList.add('is-invalid');
    }

    getUsername() {
        const username = this.#usernameInput.value.trim();
        return username;
    }

    async #setUsernameValue(users) {
        let usernameFromCookie = Kinder.getCookie('username');

        if (usernameFromCookie !== undefined && usernameFromCookie !== null && usernameFromCookie.trim().length > 0 && usernameFromCookie.trim() !== '') {
            this.#usernameInput.value = usernameFromCookie;
            return true;
        } else {
            const userNames = users.map((u, i) => u.name);
            this.#usernameInput.value = await this.#randomUsername(userNames);
            return false;
        }
    }

    async #randomUsername(usedUserNames) {
        const usernameSuggestions = await Fetcher.getInstance().usernameSuggestions();
        let random = Kinder.randomMember(usedUserNames, usernameSuggestions);
        if (random !== null && random !== undefined && random.trim() !== '') {
            return random;
        }
        return '';
    }
}