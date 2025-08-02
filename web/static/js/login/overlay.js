export class OverlaySelection {
    #loginContainer;
    #overlayContainer;
    #overlayTitleCheckbox;
    #overlayDurationCheckbox;
    #overlayGenresCheckbox;
    #overlayWatchedContainer;
    #overlayWatchedCheckbox;
    #overlayAgeCheckbox;
    #overlayBtn;
    #overlayBtnIcon;
    #infoIcon;

    constructor(loginContainer) {
        this.#loginContainer = loginContainer;
        this.#overlayContainer = this.#loginContainer.querySelector('div[name="overlay-selection"]');
        this.#overlayTitleCheckbox = this.#overlayContainer.querySelector('input[name="overlay-title"]');
        this.#overlayDurationCheckbox = this.#overlayContainer.querySelector('input[name="overlay-duration"]');
        this.#overlayGenresCheckbox = this.#overlayContainer.querySelector('input[name="overlay-genres"]');
        this.#overlayWatchedContainer = this.#overlayContainer.querySelector('div[name="overlay-watched-container"]');
        this.#overlayWatchedCheckbox = this.#overlayContainer.querySelector('input[name="overlay-watched"]');
        this.#overlayAgeCheckbox = this.#overlayContainer.querySelector('input[name="overlay-age"]');
        this.#overlayBtn = this.#loginContainer.querySelector('div[name="overlay-selection-btn"]');
        this.#overlayBtnIcon = this.#overlayBtn.querySelector('i[name="overlay-selection-btn-icon"]');
        this.#infoIcon = this.#loginContainer.querySelector('i[name="overlay-selection-info-icon"]');
        this.#init();
    }

    #init() {
        let _this = this;
        this.#overlayBtn.addEventListener('click', () => {
            if (this.#overlayContainer.classList.contains('d-none')) {
                _this.#unhideOverlaySelection();
            } else {
                _this.#hideOverlaySelection();
            }
        });
        this.#loginContainer.addEventListener('providers.validated', (e) => {
            _this.#setDisableWatchedCheckbox(e.detail.providers);
        });
        this.#loginContainer.addEventListener('settings.loaded', (e) => {
            _this.#initOverlays(e.detail.settings);
        });
        this.#overlayTitleCheckbox.addEventListener('change', () => {
            _this.#infoIconDisplay();
        });
        this.#overlayDurationCheckbox.addEventListener('change', () => {
            _this.#infoIconDisplay();
        });
        this.#overlayGenresCheckbox.addEventListener('change', () => {
            _this.#infoIconDisplay();
        });
        this.#overlayWatchedCheckbox.addEventListener('change', () => {
            _this.#infoIconDisplay();
        });
        this.#overlayAgeCheckbox.addEventListener('change', () => {
            _this.#infoIconDisplay();
        });
    }

    #setDisableWatchedCheckbox(providers) {
        this.#overlayWatchedCheckbox.disabled = !providers.includes('kodi');
        this.#infoIconDisplay();
    }

    #infoIconDisplay() {
        if (this.getOverlayTitle()
            || this.getOverlayDuration()
            || this.getOverlayGenres()
            || (this.getOverlayWatched() && !this.#overlayWatchedContainer.classList.contains('d-none') && !this.#overlayWatchedCheckbox.disabled)
            || this.getOverlayAge()) {
            this.#infoIcon.classList.remove('d-none');
        } else {
            this.#infoIcon.classList.add('d-none');
        }
    }

    #initOverlays(settings) {
        let overlays = settings.overlays;
        let hiddenFilter = settings.filter_hide;

        this.#overlayTitleCheckbox.checked = overlays.title;
        this.#overlayDurationCheckbox.checked = overlays.runtime;
        this.#overlayGenresCheckbox.checked = overlays.genres;
        this.#overlayWatchedCheckbox.checked = overlays.watched;
        this.#overlayAgeCheckbox.checked = overlays.age;

        let availableSources = settings.sources_available;
        if (!availableSources.kodi) {
            this.#overlayWatchedContainer.classList.add('d-none');
        }

        this.#infoIconDisplay();

        if (hiddenFilter.hide_overlay) {
            this.#overlayBtn.classList.add('d-none');
        }
    }

    #hideOverlaySelection() {
        this.#overlayContainer.classList.add('d-none');
        this.#overlayBtn.classList.remove('btn-secondary', 'btn-danger', 'btn-outline-danger');
        this.#overlayBtn.classList.add('btn-outline-secondary');
        this.#overlayBtnIcon.classList.remove('bi-caret-down-fill');
        this.#overlayBtnIcon.classList.add('bi-caret-right-fill');
    }

    #unhideOverlaySelection() {
        this.#overlayContainer.classList.remove('d-none');
        this.#overlayBtn.classList.remove('btn-danger', 'btn-outline-secondary', 'btn-outline-danger');
        this.#overlayBtn.classList.add('btn-secondary');
        this.#overlayBtnIcon.classList.remove('bi-caret-right-fill');
        this.#overlayBtnIcon.classList.add('bi-caret-down-fill');
    }

    getOverlays() {
        return {
            title: this.getOverlayTitle(),
            duration: this.getOverlayDuration(),
            genres: this.getOverlayGenres(),
            watched: this.getOverlayWatched(),
            age: this.getOverlayAge()
        };
    }

    getOverlayTitle() {
        return this.#overlayTitleCheckbox.checked;
    }
    getOverlayDuration() {
        return this.#overlayDurationCheckbox.checked;
    }
    getOverlayGenres() {
        return this.#overlayGenresCheckbox.checked;
    }
    getOverlayWatched() {
        return this.#overlayWatchedCheckbox.checked;
    }
    getOverlayAge() {
        return this.#overlayAgeCheckbox.checked;
    }
}
