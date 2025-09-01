export class ReleaseYears {
    #loginContainer;
    #minYear;
    #maxYear;

    constructor(loginContainer) {
        this.#loginContainer = loginContainer;
        this.#minYear = this.#loginContainer.querySelector('input[name="min-year"]');
        this.#maxYear = this.#loginContainer.querySelector('input[name="max-year"]');

        this.#init();
    }

    #init() {
        let _this = this;
        this.#minYear.addEventListener('input', () => { this.validate(); });
        this.#maxYear.addEventListener('input', () => { this.validate(); });
        this.#minYear.setAttribute('max', new Date().getFullYear().toString());
        this.#maxYear.setAttribute('max', new Date().getFullYear().toString());
        this.#loginContainer.addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            _this.#initYears(settings);
        });
    }

    #initYears(settings) {
        let filterDefaults = settings.filter_defaults;
        this.#minYear.value = filterDefaults.min_year;
        this.#maxYear.value = filterDefaults.max_year;
        this.validate();
    }

    isValid() {
        return !this.#minYear.classList.contains('is-invalid') &&
               !this.#maxYear.classList.contains('is-invalid');
    }

    getMinYear() {
        let value = parseInt(this.#minYear.value);
        return isNaN(value) ? 1900 : value;
    }

    getMaxYear() {
        let value = parseInt(this.#maxYear.value);
        return isNaN(value) ? new Date().getFullYear() : value;
    }

    #isValidYear(value) {
        let year = new Date().getFullYear();
        let parsedValue = parseInt(value);
        return !isNaN(parsedValue) && parsedValue >= 1900 && parsedValue <= year && /^\d+$/.test(value);
    }

    validate(buttonChek = true) {
        if (!this.#isValidYear(this.#minYear.value)) {
            this.#minYear.classList.add('is-invalid');
        } else {
            this.#minYear.classList.remove('is-invalid');
        }

        if (!this.#isValidYear(this.#maxYear.value)) {
            this.#maxYear.classList.add('is-invalid');
        } else {
            this.#maxYear.classList.remove('is-invalid');
        }

        this.#loginContainer.dispatchEvent(new Event('miscellaneousChanged'));
        if (buttonChek) {
            this.#loginContainer.dispatchEvent(new Event('loginButtonCheckRequest'));
        }
    }
}