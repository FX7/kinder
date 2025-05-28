class Login {
    static #instance;

    #loginContainerSelector = 'div[name="login-container"]';
    #usernameSelector = this.#loginContainerSelector + ' input[name="username"]';
    #sessionSelector =  this.#loginContainerSelector + ' input[name="session"]';
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

        const button = document.querySelector(this.#loginButtonSelector);
        button.enabled = false;
    }

    #error() {
        document.querySelector(this.#usernameSelector).classList.add('is-invalid')
    }

    async #login() {
        const username = this.#getUsername();

        const result = await Fetcher.getInstance().register(username);
        if (result.error) {
            this.#error();
        } else {
            this.hide();
        }
    }

    #getUsername() {
        const username = document.querySelector(this.#usernameSelector).value.trim();
        return username;
    }

    #getSession() {
        const session = document.querySelector(this.#sessionSelector).value.trim();
        return session;
    }

    #validate() {
        const loginButton = document.querySelector(this.#loginButtonSelector);

        const username = this.#getUsername();
        const session = this.#getSession();

        if (session === '') {
            document.querySelector(this.#sessionSelector).classList.add('is-invalid')
        } else {
            document.querySelector(this.#sessionSelector).classList.remove('is-invalid')
        }

        loginButton.disabled = username === '' || session == '';
    }

    #init() {
        let _this = this;

        const loginButton = document.querySelector(this.#loginButtonSelector);
        loginButton.addEventListener('click', () => {
            _this.#login();
        });

        const usernameInput = document.querySelector(this.#usernameSelector);
        usernameInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter' && !loginButton.disabled) {
                _this.#login();
            }
            _this.#validate();
        });

        const sessionInput = document.querySelector(this.#sessionSelector);
        sessionInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter' && !loginButton.disabled) {
                _this.#login();
            }
            _this.#validate();
        });
    }

    static getInstance() {
        if (Login.#instance === undefined || Login.#instance === null) {
            Login.#instance = new Login();
        }
        return Login.#instance;
    }
}