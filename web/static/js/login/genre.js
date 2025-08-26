import { Fetcher } from "../Fetcher.js";
import { Kinder } from "../index.js";

export class GenreSelection {
    #loginContainer;
    #disabledGenreSelect;
    #disabledGenreContainer;
    #mustGenreSelect;
    #mustGenreContainer;
    #genreBtn;
    #genreBtnIcon;
    #infoIcon;
    #mustInfoIcon;
    #disabledInfoIcon;
    #genreSelectionContainer;

    #genreOptionsBuild = false;

    constructor(loginContainer) {
        this.#loginContainer = loginContainer;
        this.#disabledGenreSelect = this.#loginContainer.querySelector('select[name="disabled-genres"]');
        this.#disabledGenreContainer = this.#loginContainer.querySelector('div[name="disabled-genres-container"]');
        this.#mustGenreSelect = this.#loginContainer.querySelector('select[name="must-genres"]');
        this.#mustGenreContainer = this.#loginContainer.querySelector('div[name="must-genres-container"]');
        this.#genreBtn = this.#loginContainer.querySelector('button[name="genre-selection-btn"]');
        this.#genreBtnIcon = this.#loginContainer.querySelector('i[name="genre-selection-btn-icon"]');
        this.#infoIcon = this.#loginContainer.querySelector('i[name="genre-selection-changed-icon"]');
        this.#mustInfoIcon = this.#mustGenreContainer.querySelector('span[name="info-icon"]');
        this.#disabledInfoIcon = this.#disabledGenreContainer.querySelector('span[name="info-icon"]');
        this.#genreSelectionContainer = this.#loginContainer.querySelector('div[name="genre-selection"]');
        this.#init();
    }

    #init() {
        let _this = this;
        this.#disabledGenreSelect.addEventListener('change', () => { this.validate(); });
        this.#loginContainer.addEventListener('providers.validated', (e) => {
            _this.#setDisabledGenreByProvider(e.detail.providers);
        });
        this.#loginContainer.addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            _this.#initGenres(settings);
        });
        this.#genreBtn.addEventListener('click', () => {
            if (this.#genreSelectionContainer.classList.contains('d-none')) {
                _this.#unhideGenreSelection();
            } else {
                _this.#hideGenreSelection();
            }
        });
        this.#loginContainer.addEventListener('settings.unhide', (e) => {
            if (e.detail.settings !== 'genre') {
                _this.#hideGenreSelection();
            }
        });
        const tooltips = this.#genreSelectionContainer.querySelectorAll('[data-bs-toggle="tooltip"]');
        [...tooltips].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    }

    #hideGenreSelection() {
        let suffix = this.isValid() ? 'secondary' : 'danger';
        this.#genreSelectionContainer.classList.add('d-none');
        this.#genreBtn.classList.remove('btn-secondary', 'btn-danger', 'btn-outline-danger');
        this.#genreBtn.classList.add('btn-outline-' + suffix);
        this.#genreBtnIcon.classList.remove('bi-caret-down-fill');
        this.#genreBtnIcon.classList.add('bi-caret-right-fill');
    }

    #unhideGenreSelection() {
        let suffix = this.isValid() ? 'secondary' : 'danger';
        this.#genreSelectionContainer.classList.remove('d-none');
        this.#genreBtn.classList.remove('btn-danger', 'btn-outline-secondary', 'btn-outline-danger');
        this.#genreBtn.classList.add('btn-' + suffix);
        this.#genreBtnIcon.classList.remove('bi-caret-right-fill');
        this.#genreBtnIcon.classList.add('bi-caret-down-fill');
        this.#loginContainer.dispatchEvent(new CustomEvent('settings.unhide', {
            detail: {
                settings: 'genre'
            }
        }));
    }

    async #initGenres(settings) {
        let filterDefaults = settings.filter_defaults;
        let hiddenFilter = settings.filter_hide;

        this.#mustGenreSelect.addEventListener('change', () => { this.validate(); });
        this.#disabledGenreSelect.addEventListener('change', () => { this.validate(); });
        const genres = await Fetcher.getInstance().listGenres();
        for (let i=0; i<genres.length; i++) {
            let g = genres[i];
            this.#disabledGenreSelect.appendChild(this.#createGenreOption(g, filterDefaults.disabled_genres));
            this.#mustGenreSelect.appendChild(this.#createGenreOption(g, filterDefaults.must_genres));
        }

        this.validate();
        this.#genreOptionsBuild = true;

        if (hiddenFilter.disabled_genres && this.isValid()) {
            this.#disabledGenreContainer.classList.add('d-none');
        }
        if (hiddenFilter.must_genres && this.isValid()) {
            this.#mustGenreContainer.classList.add('d-none');
        }
        if (hiddenFilter.disabled_genres && hiddenFilter.must_genres && this.isValid()) {
            this.#genreBtn.classList.add('d-none');
        }
    }

    #createGenreOption(genre, preselectedGenres) {
        let option = document.createElement('option');
        option.value = genre.id;
        option.innerHTML = genre.name;
        option.selected = preselectedGenres.includes(genre.name);
        return option;
    }

    getDisabledGenres() {
        return this.#getGenres(this.#disabledGenreSelect);
    }

    getMustGenres() {
        return this.#getGenres(this.#mustGenreSelect);
    }

    #getGenres(select) {
        var result = [];
        for (let i=0; i< select.options.length; i++) {
            let opt = select.options[i];
            if (opt.selected && !opt.classList.contains('d-none')) {
                result.push(opt.value);
            }
        }
        return result;
    }

    #getDisabledGenreOptions() {
        return this.#disabledGenreSelect.options;
    }

    #getMustGenreOptions() {
        return this.#mustGenreSelect.options;
    }

    async #setDisabledGenreByProvider(providers) {
        let _this = this;
        if (!this.#genreOptionsBuild) {
            setTimeout(() => {_this.#setDisabledGenreByProvider(providers)}, 500);
        }
        const disabledGenres = this.#getDisabledGenreOptions();
        const mustGenres = this.#getMustGenreOptions();
        const sources = [...new Set(providers.map((v, i) => { return Kinder.providerToSource(v); }))];
        for (let d=0; d<disabledGenres.length; d++) {
            let dgOption = disabledGenres[d];
            let mgOption = mustGenres[d];
            //  {
            //     "id": id,
            //     "name": name,
            //     "kodi_id": kodi_id,
            //     "tmdb_id": tmdb_id,
            //     "emby_id": emby_id,
            //     "sources": sources
            // }
            let genre = await Fetcher.getInstance().getGenreById(dgOption.value);
            if (genre.sources.includes('tmdb') || sources.some(value => genre.sources.includes(value))) { // tmdb genres are always shown
                dgOption.classList.remove('d-none');
                mgOption.classList.remove('d-none');
            } else {
                mgOption.classList.add('d-none');
                dgOption.classList.add('d-none');
            }
        }
        this.validate();
    }

    isValid() {
        return !this.#disabledGenreSelect.classList.contains('is-invalid')
                && !this.#mustGenreSelect.classList.contains('is-invalid');
    }

    validate(buttonChek = true) {
        const disabledGenres = this.getDisabledGenres();
        const mustGenres = this.getMustGenres();

        let genresOverlap = false;
        disabledGenres.forEach((g) => {
            if (mustGenres.includes(g)) {
                genresOverlap = true;
            }
        });

        if (genresOverlap) {
            this.#disabledGenreSelect.classList.add('is-invalid');
            this.#mustGenreSelect.classList.add('is-invalid');
        } else {
            this.#disabledGenreSelect.classList.remove('is-invalid');
            this.#mustGenreSelect.classList.remove('is-invalid');
        }

        this.#btnColorAfterValidate();
        this.#infoIconDisplay(disabledGenres, mustGenres);

        if (buttonChek) {
            this.#loginContainer.dispatchEvent(new Event('loginButtonCheckRequest'));
        }
    }

    #btnColorAfterValidate() {
        const outline = this.#genreSelectionContainer.classList.contains('d-none');
        let suffix = this.isValid() ? 'secondary' : 'danger';
        this.#genreBtn.classList.remove('btn-secondary', 'btn-danger', 'btn-outline-danger', 'btn-danger', 'btn-outline-secondary', 'btn-outline-danger');
        this.#genreBtn.classList.add('btn-' + (outline ? 'outline-' : '') + suffix);
    }

    #infoIconDisplay(disabledGenres, mustGenres) {
        if (disabledGenres.length > 0 || mustGenres.length > 0) {
            this.#infoIcon.classList.remove('d-none');
        } else {
            this.#infoIcon.classList.add('d-none');
        }
        if (disabledGenres.length > 0) {
            this.#disabledInfoIcon.classList.remove('d-none');
        } else {
            this.#disabledInfoIcon.classList.add('d-none');
        }
        if (mustGenres.length > 0) {
            this.#mustInfoIcon.classList.remove('d-none');
        } else {
            this.#mustInfoIcon.classList.add('d-none');
        }
    }
}