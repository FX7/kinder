export class WatchedSelection {
    #loginContainer;
    #includeWatchedCheckbox;
    #includeWatchedContainer;

    constructor(loginContainerSelector) {
        this.#loginContainer = document.querySelector(loginContainerSelector);
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
    }

    #initIncludeWatched(settings) {
        let filterDefaults = settings.filter_defaults;
        let availableSources = settings.sources_available;
        let hiddenFilter = settings.filter_hide;

        this.#includeWatchedCheckbox.addEventListener('change', () => {
            this.#loginContainer.dispatchEvent(new Event('miscellaneousChanged'));
        });
        this.#includeWatchedCheckbox.checked = filterDefaults.default_include_watched;
        if (hiddenFilter.hide_include_watched || !availableSources.kodi) {
            this.#includeWatchedContainer.classList.add('d-none');
        }
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