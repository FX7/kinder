export class OverlaySelection {
    #loginContainerSelector;
    #overlay_title;
    #overlay_duration;
    #overlay_genres;
    #overlay_watched;
    #overlay_age;

    #overlayContainer;
    #overlayBtn;
    #overlayBtnIcon;
    #infoIcon;

    constructor(loginContainerSelector) {
        this.#loginContainerSelector = loginContainerSelector;
        this.#overlayContainer = loginContainerSelector + ' div[name="overlay-selection"]';
        this.#overlay_title = this.#overlayContainer + ' input[name="overlay-title"]';
        this.#overlay_duration = this.#overlayContainer + ' input[name="overlay-duration"]';
        this.#overlay_genres = this.#overlayContainer + ' input[name="overlay-genres"]';
        this.#overlay_watched = this.#overlayContainer + ' input[name="overlay-watched"]';
        this.#overlay_age = this.#overlayContainer + ' input[name="overlay-age"]';
        this.#overlayBtn = loginContainerSelector + ' div[name="overlay-selection-btn"]';
        this.#overlayBtnIcon = this.#overlayBtn + ' i[name="overlay-selection-btn-icon"]';
        this.#infoIcon = this.#loginContainerSelector + ' i[name="overlay-selection-info-icon"]';
        this.#init();
    }

    #init() {
        let _this = this;
        const overlayBtn = document.querySelector(this.#overlayBtn);
        overlayBtn.addEventListener('click', () => {
            const overlayContainer = document.querySelector(this.#overlayContainer);
            if (overlayContainer.classList.contains('d-none')) {
                _this.#unhideOverlaySelection();
            } else {
                _this.#hideOverlaySelection();
            }
        });
        document.querySelector(this.#loginContainerSelector).addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            _this.#initOverlays(settings);
        });

        document.querySelector(this.#overlay_title).addEventListener('change', () => {
            _this.#infoIconDisplay();
        });
        document.querySelector(this.#overlay_duration).addEventListener('change', () => {
            _this.#infoIconDisplay();
        });
        document.querySelector(this.#overlay_genres).addEventListener('change', () => {
            _this.#infoIconDisplay();
        });
        document.querySelector(this.#overlay_watched).addEventListener('change', () => {
            _this.#infoIconDisplay();
        });
        document.querySelector(this.#overlay_age).addEventListener('change', () => {
            _this.#infoIconDisplay();
        }); 
    }

    #infoIconDisplay() {
        const info = document.querySelector(this.#infoIcon);
        if (this.getOverlayTitle()
            || this.getOverlayDuration()
            || this.getOverlayGenres()
            || this.getOverlayWatched()
            || this.getOverlayAge()) {
            info.classList.remove('d-none');
        } else {
            info.classList.add('d-none');
        }
    }

    #initOverlays(settings) {
        let overlays = settings.overlays;

        document.querySelector(this.#overlay_title).checked = overlays.overlay_title;
        document.querySelector(this.#overlay_duration).checked = overlays.overlay_runtime;
        document.querySelector(this.#overlay_genres).checked = overlays.overlay_genres;
        document.querySelector(this.#overlay_watched).checked = overlays.overlay_watched;
        document.querySelector(this.#overlay_age).checked = overlays.overlay_age;
        this.#infoIconDisplay();
    }

    #hideOverlaySelection() {
        const overlayContainer = document.querySelector(this.#overlayContainer);
        const overlayBtn = document.querySelector(this.#overlayBtn);
        const overlayBtnIcon = document.querySelector(this.#overlayBtnIcon);

        overlayContainer.classList.add('d-none');
        overlayBtn.classList.remove('btn-secondary', 'btn-danger', 'btn-outline-danger');
        overlayBtn.classList.add('btn-outline-secondary');
        overlayBtnIcon.classList.remove('bi-caret-down-fill');
        overlayBtnIcon.classList.add('bi-caret-right-fill');
    }

    #unhideOverlaySelection() {
        const overlayContainer = document.querySelector(this.#overlayContainer);
        const overlayBtn = document.querySelector(this.#overlayBtn);
        const overlayBtnIcon = document.querySelector(this.#overlayBtnIcon);

        overlayContainer.classList.remove('d-none');
        overlayBtn.classList.remove('btn-danger', 'btn-outline-secondary', 'btn-outline-danger');
        overlayBtn.classList.add('btn-secondary');
        overlayBtnIcon.classList.remove('bi-caret-right-fill');
        overlayBtnIcon.classList.add('bi-caret-down-fill');
    }

    getOverlayTitle() {
        return document.querySelector(this.#overlay_title).checked;
    }
    getOverlayDuration() {
        return document.querySelector(this.#overlay_duration).checked;
    }
    getOverlayGenres() {
        return document.querySelector(this.#overlay_genres).checked;
    }
    getOverlayWatched() {
        return document.querySelector(this.#overlay_watched).checked;
    }
    getOverlayAge() {
        return document.querySelector(this.#overlay_age).checked;
    }

    getAll() {
        return {
            overlay_title: this.getOverlayTitle(),
            overlay_duration: this.getOverlayDuration(),
            overlay_genres: this.getOverlayGenres(),
            overlay_watched: this.getOverlayWatched(),
            overlay_age: this.getOverlayAge()
        };
    }
}
