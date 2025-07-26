export class WatchedSelection {
    #loginContainerSelector;
    #sessionIncludeWatchedSelector;
    #sessionIncludeWatchedContainer;

    constructor(loginContainerSelector) {
        this.#loginContainerSelector = loginContainerSelector;
        this.#sessionIncludeWatchedSelector = loginContainerSelector + ' #include-watched';
        this.#sessionIncludeWatchedContainer = loginContainerSelector + ' div[name="include-watched-container"]';
        this.#init();
    }

    #init() {
        let _this = this;
        document.querySelector(this.#loginContainerSelector).addEventListener('providers.validated', (e) => {
            _this.#setDisableWatchedCheckbox(e.detail.providers);
        });

        document.querySelector(this.#loginContainerSelector).addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            _this.#initIncludeWatched(settings);
        });
    }

    #initIncludeWatched(settings) {
        let _this = this;
        let filterDefaults = settings.filter_defaults;
        let availableSources = settings.sources_available;
        let hiddenFilter = settings.filter_hide;

        const includeWatched = document.querySelector(this.#sessionIncludeWatchedSelector);
        includeWatched.addEventListener('change', () => {
            document.querySelector(_this.#loginContainerSelector).dispatchEvent(new Event('miscellaneousChanged'));
        });
        includeWatched.checked = filterDefaults.default_include_watched;
        if (hiddenFilter.hide_include_watched || !availableSources.kodi) {
            document.querySelector(this.#sessionIncludeWatchedContainer).classList.add('d-none');
        }
    }

    isHidden() {
        return document.querySelector(this.#sessionIncludeWatchedContainer).classList.contains('d-none');
    }

    getIncludeWatched() {
        return document.querySelector(this.#sessionIncludeWatchedSelector).checked;
    }

    #setDisableWatchedCheckbox(providers) {
        if (providers.includes('kodi')) {
            document.querySelector(this.#sessionIncludeWatchedSelector).disabled = false;
        } else {
            document.querySelector(this.#sessionIncludeWatchedSelector).disabled = true;
        }
    }
}