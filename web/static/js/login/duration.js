export class DurationSelection {
    #loginContainerSelector;
    #sessionMaxDurationSelector;
    #sessionMaxDurationContainer;
    #sessionMaxDurationDisplaySelector;

    constructor(loginContainerSelector) {
        this.#loginContainerSelector = loginContainerSelector;
        this.#sessionMaxDurationSelector = loginContainerSelector + ' input[name="max-duration"]';
        this.#sessionMaxDurationContainer = loginContainerSelector + ' div[name="max-duration-container"]';
        this.#sessionMaxDurationDisplaySelector = loginContainerSelector + ' span[name="max-duration-display"]';

        this.#init();
    }

    #init() {
        let _this = this;
        const maxDuration = document.querySelector(this.#sessionMaxDurationSelector);
        maxDuration.addEventListener('input', () => { this.#updateDurationDisplay(); });
        
        document.querySelector(this.#loginContainerSelector).addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            _this.#initDuration(settings);
        });
    }

    #initDuration(settings) {
        let filterDefaults = settings.filter_defaults;
        let hiddenFilter = settings.filter_hide;

        const maxDuration = document.querySelector(this.#sessionMaxDurationSelector);
        maxDuration.value = filterDefaults.default_max_duration;
        if (hiddenFilter.hide_max_duration) {
            document.querySelector(this.#sessionMaxDurationContainer).classList.add('d-none');
        }
        this.#updateDurationDisplay();
    }

    getMaxDuration() {
        let value = parseInt(document.querySelector(this.#sessionMaxDurationSelector).value)
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
        let mdDisplay = maxDuration == Number.MAX_VALUE ? '240+' : maxDuration.toString();
        document.querySelector(this.#sessionMaxDurationDisplaySelector).innerHTML = mdDisplay;
    }
}