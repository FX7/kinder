class Login {
    static #instance;

    #loginContainerSelector = 'div[name="login-container"]';
    #usernameSelector = this.#loginContainerSelector + ' input[name="username"]';
    #sessionSelector =  this.#loginContainerSelector + ' input[name="session"]';
    #sessionListSelector = this.#loginContainerSelector + ' datalist[name="knownSessions"]';
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

        const session = document.querySelector(this.#sessionSelector);
        session.classList.add('is-invalid');
        session.value = '';

        const button = document.querySelector(this.#loginButtonSelector);
        button.enabled = false;
    }

    #error() {
        document.querySelector(this.#usernameSelector).classList.add('is-invalid')
    }

    async #login() {
        const username = this.#getUsername();

        const result = await Fetcher.getInstance().registerUser(username);
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

    async #init() {
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
        });
        usernameInput.addEventListener('input', () => { this.#validate(); });

        const sessionInput = document.querySelector(this.#sessionSelector);
        sessionInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter' && !loginButton.disabled) {
                _this.#login();
            }
        });
        sessionInput.addEventListener('input', () => { this.#validate(); });

        const sessionList = document.querySelector(this.#sessionListSelector);
        const sessions = await Fetcher.getInstance().listSessions();
        sessions.forEach(s => {
            let option = document.createElement('option');
            // option.value = s.session_id;
            option.value = s.name;
            option.innerHTML = s.name;
            sessionList.appendChild(option);
        });
    }

    static getInstance() {
        if (Login.#instance === undefined || Login.#instance === null) {
            Login.#instance = new Login();
        }
        return Login.#instance;
    }
}