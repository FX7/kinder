export class AgeSelection {
    #loginContainer;
    #maxAge;
    #maxAgeContainer;
    #maxAgeDisplay;

    constructor(loginContainerSelector) {
        this.#loginContainer = document.querySelector(loginContainerSelector);
        this.#maxAge = this.#loginContainer.querySelector('input[name="max-age"]');
        this.#maxAgeContainer = this.#loginContainer.querySelector('div[name="max-age-container"]');
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
        let hiddenFilter = settings.filter_hide;

        this.#maxAge.value = filterDefaults.default_max_age;
        if (hiddenFilter.hide_max_age) {
            this.#maxAgeContainer.classList.add('d-none');
        }
        this.#updateAgeDisplay();
    }

    isHidden() {
        return this.#maxAgeContainer.classList.contains('d-none');
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