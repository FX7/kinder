import { Kinder } from "../index.js";

export class MiscSelection {
    #loginContainer;
    #miscContentContainer
    #miscContainer;
    #miscBtn;
    #miscBtnIcon;
    #infoIcon;

    #minAge;
    #maxAge;
    #minAgeDisplay;
    #maxAgeDisplay;
    #minDuration;
    #maxDuration;
    #minDurationDisplay;
    #maxDurationDisplay;
    #includeWatchedCheckbox;
    #minYear;
    #maxYear;

    #providerSelection;
    #ratingAverageSelection;
    #ratingAverageDisplay;

    constructor(loginContainer, providerSelection) {
        this.#loginContainer = loginContainer;
        this.#miscContentContainer = loginContainer.querySelector('div[name="misc-content-container"]');

        this.#minAge = this.#loginContainer.querySelector('input[name="min-age"]');
        this.#maxAge = this.#loginContainer.querySelector('input[name="max-age"]');
        this.#minAgeDisplay = this.#loginContainer.querySelector('span[name="min-age-display"]');
        this.#maxAgeDisplay = this.#loginContainer.querySelector('span[name="max-age-display"]');
        this.#minDuration = this.#loginContainer.querySelector('input[name="min-duration"]');
        this.#maxDuration = this.#loginContainer.querySelector('input[name="max-duration"]');
        this.#minDurationDisplay = this.#loginContainer.querySelector('span[name="min-duration-display"]');
        this.#maxDurationDisplay = this.#loginContainer.querySelector('span[name="max-duration-display"]');
        this.#includeWatchedCheckbox = this.#loginContainer.querySelector('input[name="include-watched"]');
        this.#minYear = this.#loginContainer.querySelector('input[name="min-year"]');
        this.#maxYear = this.#loginContainer.querySelector('input[name="max-year"]');

        this.#providerSelection = providerSelection;
        this.#ratingAverageSelection = this.#miscContentContainer.querySelector('input[name="rating-average"]');
        this.#ratingAverageDisplay = this.#miscContentContainer.querySelector('span[name="rating-average-display"]');

        this.#miscContainer = this.#loginContainer.querySelector('div[name="misc-selection"]');
        this.#miscBtn = this.#loginContainer.querySelector('button[name="misc-selection-btn"]');
        this.#miscBtnIcon = this.#miscBtn.querySelector('i[name="misc-selection-btn-icon"]');
        this.#infoIcon = this.#loginContainer.querySelector('i[name="misc-selection-changed-icon"]');
        this.#init();
    }

    #update() {
        this.#infoIconDisplay(this.#providerSelection.getProviders());
        this.#btnColorAfterValidate();
    }

    #updateAgeDisplay() {
        const maxAge = this.getMaxAge();
        let maxDisplay = maxAge == Number.MAX_VALUE ? '18+' : maxAge.toString();
        this.#maxAgeDisplay.innerHTML = maxDisplay;

        const minAge = this.getMinAge();
        let minDisplay = minAge == Number.MAX_VALUE ? '18+' : minAge.toString();
        this.#minAgeDisplay.innerHTML = minDisplay;
        
        this.#update();
    }

    #initMisc(settings) {
        let filterDefaults = settings.filter_defaults;
        let hiddenFilter = settings.filter_hide;

        this.#includeWatchedCheckbox.checked = filterDefaults.include_watched;
        this.#minAge.value = filterDefaults.min_age;
        this.#maxAge.value = filterDefaults.max_age;
        this.#minDuration.value = filterDefaults.min_duration;
        this.#maxDuration.value = filterDefaults.max_duration;
        this.#minYear.value = filterDefaults.min_year;
        this.#maxYear.value = filterDefaults.max_year;
        this.#ratingAverageSelection.value = filterDefaults.vote_average;

        this.validate();
        this.#updateAgeDisplay();
        this.#updateDurationDisplay();
        this.#updateRatingAverageDisplay();

        if (hiddenFilter.miscellaneous && this.isValid()) {
            this.#miscBtn.classList.add('d-none')
        }
    }

    #init() {
        let _this = this;
        this.#miscBtn.addEventListener('click', () => {
            if (this.#miscContainer.classList.contains('d-none')) {
                _this.#unhideMiscSelection();
            } else {
                _this.#hideMiscSelection();
            }
        });
        this.#minAge.addEventListener('input', () => { this.#updateAgeDisplay(); });
        this.#maxAge.addEventListener('input', () => { this.#updateAgeDisplay(); });
        this.#minDuration.addEventListener('input', () => { this.#updateDurationDisplay(); });
        this.#maxDuration.addEventListener('input', () => { this.#updateDurationDisplay(); });
        this.#loginContainer.addEventListener('providers.validated', (e) => {
            _this.#setDisableWatchedCheckbox(e.detail.providers);
        });
        this.#includeWatchedCheckbox.addEventListener('change', () =>  {this.#update(); });
        this.#minYear.addEventListener('input', () => { this.validate(); });
        this.#maxYear.addEventListener('input', () => { this.validate(); });
        this.#minYear.setAttribute('max', new Date().getFullYear().toString());
        this.#maxYear.setAttribute('max', new Date().getFullYear().toString());
        this.#loginContainer.addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            _this.#initMisc(settings);
        });
        this.#loginContainer.addEventListener('providers.validated', (e) => {
            _this.#infoIconDisplay(e.detail.providers);
            _this.#btnColorAfterValidate();
        });
        this.#loginContainer.addEventListener('settings.unhide', (e) => {
            if (e.detail.settings !== 'misc') {
                _this.#hideMiscSelection();
            }
        });
        this.#ratingAverageSelection.addEventListener('input', () => {
            _this.#updateRatingAverageDisplay();
        });
        const tooltips = this.#miscContentContainer.querySelectorAll('[data-bs-toggle="tooltip"]');
        [...tooltips].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    }

    #setDisableWatchedCheckbox(providers) {
        if (providers.includes('kodi')) {
            this.#includeWatchedCheckbox.disabled = false;
        } else {
            this.#includeWatchedCheckbox.disabled = true;
        }
    }

    getIncludeWatched() {
        return this.#includeWatchedCheckbox.checked;
    }

    getMinAge() {
        return this.#getAge(this.#minAge.value);
    }

    getMaxAge() {
        return this.#getAge(this.#maxAge.value);
    }

    #getAge(stringValue) {
        let value = parseInt(stringValue)
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

    getMinDuration() {
        return this.#getDuration(this.#minDuration.value);
    }

    getMaxDuration() {
        return this.#getDuration(this.#maxDuration.value);
    }

    #getDuration(stringValue) {
        let value = parseInt(stringValue)
        switch (value) {
            case -1:
                return 0;
            case 0:
                return 30;
            case 1:
                return 60;
            case 2:
                return 90;
            case 3:
                return 120;
            case 4:
                return 135;
            case 5:
                return 150;
            case 6:
                return 165;
            case 7:
                return 180;
            case 8:
                return 210
            case 9:
                return 240
            case 10:
            default:
                return Number.MAX_VALUE
        }
    }

    #updateDurationDisplay() {
        const maxDuration = this.getMaxDuration();
        let maxDisplay = maxDuration == Number.MAX_VALUE ? '240+' : maxDuration.toString();
        this.#maxDurationDisplay.innerHTML = maxDisplay;

        const minDuration = this.getMinDuration();
        let minDisplay = minDuration == Number.MAX_VALUE ? '240+' : minDuration.toString();
        this.#minDurationDisplay.innerHTML = minDisplay;

        this.#update();
    }

    #infoIconDisplay(providers) {
        const minAge = this.getMinAge();
        const maxAge = this.getMaxAge();
        const minDuration = this.getMinDuration();
        const maxDuration = this.getMaxDuration();
        const watched = this.getIncludeWatched();
        const minYear = this.getMinYear();
        const maxYear = this.getMaxYear();
        const ratingAverage = this.getRatingAverage();

        if (minAge > 0
            || maxAge <= 16
            || minDuration > 0
            || maxDuration <= 240
            || minYear > 1900
            || maxYear < new Date().getFullYear()
            || (!watched && providers.includes('kodi')) 
            || ratingAverage > 0) {
            this.#infoIcon.classList.remove('d-none');
        } else {
            this.#infoIcon.classList.add('d-none');
        }
    }

    #hideMiscSelection() {
        this.#miscContainer.classList.add('d-none');
        this.#miscBtn.classList.remove('btn-secondary');
        this.#miscBtn.classList.add('btn-outline-secondary');
        this.#miscBtnIcon.classList.remove('bi-caret-down-fill');
        this.#miscBtnIcon.classList.add('bi-caret-right-fill');
        this.#btnColorAfterValidate();
    }

    #unhideMiscSelection() {
        this.#miscContainer.classList.remove('d-none');
        this.#miscBtn.classList.remove('btn-outline-secondary');
        this.#miscBtn.classList.add('btn-secondary');
        this.#miscBtnIcon.classList.remove('bi-caret-right-fill');
        this.#miscBtnIcon.classList.add('bi-caret-down-fill');
        this.#btnColorAfterValidate();
        this.#loginContainer.dispatchEvent(new CustomEvent('settings.unhide', {
            detail: {
                settings: 'misc'
            }
        }));
    }

    getMiscFilter() {
        return {
            min_age: this.getMinAge(),
            max_age: this.getMaxAge(),
            min_duration: this.getMinDuration(),
            max_duration: this.getMaxDuration(),
            include_watched: this.getIncludeWatched(),
            max_year: this.getMaxYear(),
            min_year: this.getMinYear(),
            vote_average: this.getRatingAverage()
        };
    }

    getRatingAverage() {
        let rating = parseInt(this.#ratingAverageSelection.value);
        if (isNaN(rating) || rating < 0 || rating > 10) {
            return 0;
        } else {
            return rating;
        }
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

        this.#update();

        if (buttonChek) {
            this.#loginContainer.dispatchEvent(new Event('loginButtonCheckRequest'));
        }
    }

    #updateRatingAverageDisplay() {
        let raDisplay = Kinder.ratingAverageToDisplay(this.getRatingAverage());
        this.#ratingAverageDisplay.innerHTML = raDisplay;
        this.#update();
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

    #btnColorAfterValidate() {
        const outline = this.#miscContainer.classList.contains('d-none');
        let suffix = this.isValid() ? 'secondary' : 'danger';
        this.#miscBtn.classList.remove('btn-secondary', 'btn-danger', 'btn-outline-danger', 'btn-danger', 'btn-outline-secondary', 'btn-outline-danger');
        this.#miscBtn.classList.add('btn-' + (outline ? 'outline-' : '') + suffix);
    }
}