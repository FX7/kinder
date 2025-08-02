export class WatchedSelection {
    #loginContainer;
    #includeWatchedCheckbox;
    #includeWatchedContainer;

    constructor(loginContainer) {
        this.#loginContainer = loginContainer;
        this.#includeWatchedCheckbox = this.#loginContainer.querySelector('#include-watched');
        this.#includeWatchedContainer = this.#loginContainer.querySelector('div[name="include-watched-container"]');
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
        let availableSources = settings.sources_available;
        let hiddenFilter = settings.filter_hide;

        this.#includeWatchedCheckbox.checked = filterDefaults.default_include_watched;
        if (hiddenFilter.hide_include_watched || !availableSources.kodi) {
            this.#includeWatchedContainer.classList.add('d-none');
        }
        this.#loginContainer.dispatchEvent(new Event('miscellaneousChanged'));
    }

    isHidden() {
        return this.#includeWatchedContainer.classList.contains('d-none');
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