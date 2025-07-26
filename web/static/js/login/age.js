export class AgeSelection {
    #loginContainerSelector;
    #sessionMaxAgeSelector;
    #sessionMaxAgeContainer;
    #sessionMaxAgeDisplaySelector;

    constructor(loginContainerSelector) {
        this.#loginContainerSelector = loginContainerSelector;
        this.#sessionMaxAgeSelector = loginContainerSelector + ' input[name="max-age"]';
        this.#sessionMaxAgeContainer = loginContainerSelector + ' div[name="max-age-container"]'
        this.#sessionMaxAgeDisplaySelector = loginContainerSelector + ' span[name="max-age-display"]';

        this.#init();
    }

    #init() {
        let _this = this;
        const maxAgeInput = document.querySelector(this.#sessionMaxAgeSelector);
        maxAgeInput.addEventListener('input', () => { this.#updateAgeDisplay(); });

        document.querySelector(this.#loginContainerSelector).addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            _this.#initAge(settings);
        });
    }

    #initAge(settings) {
        let filterDefaults = settings.filter_defaults;
        let hiddenFilter = settings.filter_hide;

        const maxAgeInput = document.querySelector(this.#sessionMaxAgeSelector);
        maxAgeInput.value = filterDefaults.default_max_age;
        maxAgeInput.addEventListener('input', () => { this.#updateAgeDisplay(); });
        if (hiddenFilter.hide_max_age) {
            document.querySelector(this.#sessionMaxAgeContainer).classList.add('d-none');
        }
        this.#updateAgeDisplay();
    }

    isHidden() {
        return document.querySelector(this.#sessionMaxAgeContainer).classList.contains('d-none');
    }

    #updateAgeDisplay() {
        const maxAge = this.getMaxAge();
        let maDisplay = maxAge == Number.MAX_VALUE ? '18+' : maxAge.toString();
        document.querySelector(this.#sessionMaxAgeDisplaySelector).innerHTML = maDisplay;
        document.querySelector(this.#loginContainerSelector).dispatchEvent(new Event('miscellaneousChanged'));
    }

    getMaxAge() {
        let value = parseInt(document.querySelector(this.#sessionMaxAgeSelector).value)
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