export class AgeSelection {
    #loginContainer;
    #maxAge;
    #maxAgeDisplay;

    constructor(loginContainer) {
        this.#loginContainer = loginContainer;
        this.#maxAge = this.#loginContainer.querySelector('input[name="max-age"]');
        this.#maxAgeDisplay = this.#loginContainer.querySelector('span[name="max-age-display"]');

        this.#init();
    }

    #init() {
        let _this = this;
        this.#maxAge.addEventListener('input', () => { this.#updateAgeDisplay(); });
        this.#loginContainer.addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            _this.#initAge(settings);
        });
    }

    #initAge(settings) {
        let filterDefaults = settings.filter_defaults;
        this.#maxAge.value = filterDefaults.max_age;
        this.#updateAgeDisplay();
    }

    #updateAgeDisplay() {
        const maxAge = this.getMaxAge();
        let maDisplay = maxAge == Number.MAX_VALUE ? '18+' : maxAge.toString();
        this.#maxAgeDisplay.innerHTML = maDisplay;
        this.#loginContainer.dispatchEvent(new Event('miscellaneousChanged'));
    }

    getMaxAge() {
        let value = parseInt(this.#maxAge.value)
        switch (value) {
            case 0:
                return 0;
            case 1:
                return 6;
            case 2:
                return 12;
            case 3:
                return 16;
            case 4:
            default:
                return Number.MAX_VALUE;
        }
    }
}