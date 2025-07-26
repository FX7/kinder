import { Fetcher } from "../Fetcher.js";

export class GenreSelection {
    #loginContainerSelector;
    #sessionDisabledGenreSelector;
    #sessionDisabledGenreContainer;
    #sessionMustGenreSelector;
    #sessionMustGenreContainer;

    #genreSelectionBtn;
    #genreSelectionBtnIcon;
    #genreSelection;

    constructor(loginContainerSelector) {
        this.#loginContainerSelector = loginContainerSelector;
        this.#sessionDisabledGenreSelector = loginContainerSelector + ' select[name="disabled-genres"]';
        this.#sessionDisabledGenreContainer = loginContainerSelector + ' div[name="disabled-genres-container"]';
        this.#sessionMustGenreSelector = loginContainerSelector + ' select[name="must-genres"]';
        this.#sessionMustGenreContainer = loginContainerSelector + ' div[name="must-genres-container"]';

        this.#genreSelectionBtn = loginContainerSelector + ' div[name="genre-selection-btn"]';
        this.#genreSelectionBtnIcon = loginContainerSelector + ' i[name="genre-selection-btn-icon"]';
        this.#genreSelection = loginContainerSelector + ' div[name="genre-selection"]';
        this.#init();
    }

    #init() {
        let _this = this;
        const disabledGenresSelect = document.querySelector(this.#sessionDisabledGenreSelector);
        disabledGenresSelect.addEventListener('change', () => { this.validate(); });
        document.querySelector(this.#loginContainerSelector).addEventListener('providers.validated', (e) => {
            _this.#setDisabledGenreByProvider(e.detail.providers);
        });

        document.querySelector(this.#loginContainerSelector).addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            _this.#initGenres(settings);
        });

        const genreBtn = document.querySelector(this.#genreSelectionBtn);
        genreBtn.addEventListener('click', () => {
            const genreSelection = document.querySelector(this.#genreSelection);
            if (genreSelection.classList.contains('d-none')) {
                _this.#unhideGenreSelection();
            } else {
                _this.#hideGenreSelection();
            }
        });
    }

    #hideGenreSelection() {
        const genreSelection = document.querySelector(this.#genreSelection);
        const genreBtn = document.querySelector(this.#genreSelectionBtn);
        const genreBtnIcon = document.querySelector(this.#genreSelectionBtnIcon);

        let suffix = this.isValid() ? 'secondary' : 'danger';
        genreSelection.classList.add('d-none');
        genreBtn.classList.remove('btn-secondary', 'btn-danger', 'btn-outline-danger');
        genreBtn.classList.add('btn-outline-' + suffix);
        genreBtnIcon.classList.remove('bi-caret-down-fill');
        genreBtnIcon.classList.add('bi-caret-right-fill');
    }

    #unhideGenreSelection() {
        const genreSelection = document.querySelector(this.#genreSelection);
        const genreBtn = document.querySelector(this.#genreSelectionBtn);
        const genreBtnIcon = document.querySelector(this.#genreSelectionBtnIcon);

        let suffix = this.isValid() ? 'secondary' : 'danger';
        genreSelection.classList.remove('d-none');
        genreBtn.classList.remove('btn-danger', 'btn-outline-secondary', 'btn-outline-danger');
        genreBtn.classList.add('btn-' + suffix);
        genreBtnIcon.classList.remove('bi-caret-right-fill');
        genreBtnIcon.classList.add('bi-caret-down-fill');
    }

    async #initGenres(settings) {
        let filterDefaults = settings.filter_defaults;
        let hiddenFilter = settings.filter_hide;

        const mustGenres = document.querySelector(this.#sessionMustGenreSelector);
        mustGenres.addEventListener('change', () => { this.validate(); });
        const disabledGenres = document.querySelector(this.#sessionDisabledGenreSelector);
        disabledGenres.addEventListener('change', () => { this.validate(); });
        mustGenres.addEventListener('change', () => { this.validate(); });
        const genres = await Fetcher.getInstance().listGenres();
        for (let i=0; i<genres.length; i++) {
            let g = genres[i];
            disabledGenres.appendChild(this.#createGenreOption(g, filterDefaults.default_disabled_genres));
            mustGenres.appendChild(this.#createGenreOption(g, filterDefaults.default_must_genres));
        }

        this.validate();

        if (hiddenFilter.hide_disabled_genres && this.isValid()) {
            document.querySelector(this.#sessionDisabledGenreContainer).classList.add('d-none');
        }
        if (hiddenFilter.hide_must_genres && this.isValid()) {
            document.querySelector(this.#sessionMustGenreContainer).classList.add('d-none');
        }
        if (hiddenFilter.hide_disabled_genres && hiddenFilter.hide_must_genres && this.isValid()) {
            document.querySelector(this.#genreSelectionBtn).classList.add('d-none');
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
        return this.#getGenres(this.#sessionDisabledGenreSelector);
    }

    getMustGenres() {
        return this.#getGenres(this.#sessionMustGenreSelector);
    }

    #getGenres(selector) {
        var result = [];
        const select = document.querySelector(selector);
        for (let i=0; i< select.options.length; i++) {
            let opt = select.options[i];
            if (opt.selected && !opt.classList.contains('d-none')) {
                result.push(opt.value);
            }
        }
        return result;
    }

    #getDisabledGenreOptions() {
        return this.#getGenreOptions(this.#sessionDisabledGenreSelector);
    }

    #getMustGenreOptions() {
        return this.#getGenreOptions(this.#sessionMustGenreSelector);
    }

    #getGenreOptions(selector) {
        return document.querySelector(selector).options;
    }

    async #setDisabledGenreByProvider(providers) {
        const disabledGenres = this.#getDisabledGenreOptions();
        const mustGenres = this.#getMustGenreOptions();
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
            // This check is enough for my setup, because alls kodi genres are also tmdb genres
            // and only (some?) emby genres are standing alone. So they will be hidden
            // if emby is deselected
            if (genre.sources.length == 1 && !providers.includes(genre.sources[0]) && genre.sources[0] !== 'tmdb') {
                mgOption.classList.add('d-none');
                dgOption.classList.add('d-none');
            } else {
                dgOption.classList.remove('d-none');
                mgOption.classList.remove('d-none');
            }
        }
        this.validate();
    }

    isValid() {
        return !document.querySelector(this.#sessionDisabledGenreSelector).classList.contains('is-invalid')
                && !document.querySelector(this.#sessionDisabledGenreSelector).classList.contains('is-invalid');
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
            document.querySelector(this.#sessionDisabledGenreSelector).classList.add('is-invalid');
            document.querySelector(this.#sessionMustGenreSelector).classList.add('is-invalid');
        } else {
            document.querySelector(this.#sessionDisabledGenreSelector).classList.remove('is-invalid');
            document.querySelector(this.#sessionMustGenreSelector).classList.remove('is-invalid');
        }

        const genreSelection = document.querySelector(this.#genreSelection);
        const genreBtn = document.querySelector(this.#genreSelectionBtn);
        const outline = genreSelection.classList.contains('d-none');
        let suffix = this.isValid() ? 'secondary' : 'danger';
        genreBtn.classList.remove('btn-secondary', 'btn-danger', 'btn-outline-danger', 'btn-danger', 'btn-outline-secondary', 'btn-outline-danger');
        genreBtn.classList.add('btn-' + (outline ? 'outline-' : '') + suffix);

        if (buttonChek) {
            document.querySelector(this.#loginContainerSelector).dispatchEvent(new Event('loginButtonCheckRequest'));
        }
    }
}