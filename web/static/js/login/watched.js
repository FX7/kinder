export class WatchedSelection {
    #loginContainer;
    #includeWatchedCheckbox;

    constructor(loginContainer) {
        this.#loginContainer = loginContainer;
        this.#includeWatchedCheckbox = this.#loginContainer.querySelector('input[name="include-watched"]');
        this.#init();
    }

    #init() {
        let _this = this;
        this.#loginContainer.addEventListener('providers.validated', (e) => {
            _this.#setDisableWatchedCheckbox(e.detail.providers);
        });
        this.#loginContainer.addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            _this.#initIncludeWatched(settings);
        });
        this.#includeWatchedCheckbox.addEventListener('change', () => {
            _this.#loginContainer.dispatchEvent(new Event('miscellaneousChanged'));
        });
    }

    #initIncludeWatched(settings) {
        let filterDefaults = settings.filter_defaults;
        this.#includeWatchedCheckbox.checked = filterDefaults.include_watched;
        this.#loginContainer.dispatchEvent(new Event('miscellaneousChanged'));
    }

    getIncludeWatched() {
        return this.#includeWatchedCheckbox.checked;
    }

    #setDisableWatchedCheckbox(providers) {
        if (providers.includes('kodi')) {
            this.#includeWatchedCheckbox.disabled = false;
        } else {
            this.#includeWatchedCheckbox.disabled = true;
        }
    }
}