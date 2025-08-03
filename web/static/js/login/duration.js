export class DurationSelection {
    #loginContainer;
    #maxDuration;
    #maxDurationContainer;
    #maxDurationDisplay;

    constructor(loginContainer) {
        this.#loginContainer = loginContainer;
        this.#maxDuration = this.#loginContainer.querySelector('input[name="max-duration"]');
        this.#maxDurationContainer = this.#loginContainer.querySelector('div[name="max-duration-container"]');
        this.#maxDurationDisplay = this.#loginContainer.querySelector('span[name="max-duration-display"]');

        this.#init();
    }

    #init() {
        let _this = this;
        this.#maxDuration.addEventListener('input', () => { this.#updateDurationDisplay(); });
        this.#loginContainer.addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            _this.#initDuration(settings);
        });
    }

    #initDuration(settings) {
        let filterDefaults = settings.filter_defaults;
        let hiddenFilter = settings.filter_hide;

        this.#maxDuration.value = filterDefaults.default_max_duration;
        if (hiddenFilter.hide_max_duration) {
            this.#maxDurationContainer.classList.add('d-none');
        }
        this.#updateDurationDisplay();
    }

    isHidden() {
        return this.#maxDurationContainer.classList.contains('d-none');
    }

    getMaxDuration() {
        let value = parseInt(this.#maxDuration.value)
        switch (value) {
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
        let mdDisplay = maxDuration == Number.MAX_VALUE ? '240+ m' : maxDuration.toString() + ' m';
        this.#maxDurationDisplay.innerHTML = mdDisplay;
        this.#loginContainer.dispatchEvent(new Event('miscellaneousChanged'));
    }
}