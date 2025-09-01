import { DurationSelection } from "./duration.js";
import { WatchedSelection } from "./watched.js";
import { AgeSelection } from "./age.js";
import { ReleaseYears } from "./releaseYears.js";
import { Kinder } from "../index.js";

export class MiscSelection {
    #loginContainer;
    #miscContentContainer
    #miscContainer;
    #miscBtn;
    #miscBtnIcon;
    #infoIcon;

    #ageSelection;
    #durationSelection;
    #watchedSelection;
    #providerSelection;
    #yearsSelection;
    #ratingAverageSelection;
    #ratingAverageDisplay;

    constructor(loginContainer, providerSelection) {
        this.#loginContainer = loginContainer;
        this.#miscContentContainer = loginContainer.querySelector('div[name="misc-content-container"]');

        this.#ageSelection = new AgeSelection(loginContainer);
        this.#durationSelection = new DurationSelection(loginContainer);
        this.#watchedSelection = new WatchedSelection(loginContainer);
        this.#providerSelection = providerSelection;
        this.#yearsSelection = new ReleaseYears(loginContainer);
        this.#ratingAverageSelection = this.#miscContentContainer.querySelector('input[name="rating-average"]');
        this.#ratingAverageDisplay = this.#miscContentContainer.querySelector('span[name="rating-average-display"]');

        this.#miscContainer = this.#loginContainer.querySelector('div[name="misc-selection"]');
        this.#miscBtn = this.#loginContainer.querySelector('button[name="misc-selection-btn"]');
        this.#miscBtnIcon = this.#miscBtn.querySelector('i[name="misc-selection-btn-icon"]');
        this.#infoIcon = this.#loginContainer.querySelector('i[name="misc-selection-changed-icon"]');
        this.#init();
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
        this.#loginContainer.addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            if (this.#ageSelection.isHidden()
              && this.#durationSelection.isHidden()
              && this.#watchedSelection.isHidden()
              && this.#yearsSelection.isHidden()) {
                this.#miscBtn.classList.add('d-none');
            }
            
        });
        this.#loginContainer.addEventListener('miscellaneousChanged', () => {
            _this.#infoIconDisplay(_this.#providerSelection.getProviders());
            _this.#btnColorAfterValidate();
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

    #infoIconDisplay(providers) {
        const age = this.#ageSelection.getMaxAge();
        const duration = this.#durationSelection.getMaxDuration();
        const watched = this.#watchedSelection.getIncludeWatched();
        const minYear = this.#yearsSelection.getMinYear();
        const maxYear = this.#yearsSelection.getMaxYear();
        const ratingAverage = this.getRatingAverage();

        if (age <= 16
            || duration <= 240
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
            max_age: this.#ageSelection.getMaxAge(),
            max_duration: this.#durationSelection.getMaxDuration(),
            include_watched: this.#watchedSelection.getIncludeWatched(),
            max_year: this.#yearsSelection.getMaxYear(),
            min_year: this.#yearsSelection.getMinYear(),
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
        this.#yearsSelection.validate(buttonChek);
    }

    #updateRatingAverageDisplay() {
        let raDisplay = Kinder.ratingAverageToDisplay(this.getRatingAverage());
        this.#ratingAverageDisplay.innerHTML = raDisplay;
        this.#loginContainer.dispatchEvent(new Event('miscellaneousChanged'));
    }

    isValid() {
        return this.#yearsSelection.isValid();
    }

    #btnColorAfterValidate() {
        const outline = this.#miscContainer.classList.contains('d-none');
        let suffix = this.isValid() ? 'secondary' : 'danger';
        this.#miscBtn.classList.remove('btn-secondary', 'btn-danger', 'btn-outline-danger', 'btn-danger', 'btn-outline-secondary', 'btn-outline-danger');
        this.#miscBtn.classList.add('btn-' + (outline ? 'outline-' : '') + suffix);
    }
}