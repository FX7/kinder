import { Kinder } from "../index.js";

export class TMDBDiscover {

    #loginContainer;
    #discoverContentContainer;
    #discoverContainer;

    #discoverBtn;
    #discoverBtnIcon;
    #infoIcon;

    #orderBySelect;
    #orderDirectionSelect;
    #totalInput;
    #regionSelect;
    #languageInput;

    #discover;

    #onlyLettersRegex = /^[A-Za-z]+$/; 

    constructor(loginContainer) {
        this.#loginContainer = loginContainer;
        this.#discoverContentContainer = loginContainer.querySelector('div[name="discover-content-container"]');
        this.#discoverContainer = loginContainer.querySelector('div[name="discover-selection"]');
        this.#discoverBtn = loginContainer.querySelector('button[name="discover-selection-btn"]');
        this.#discoverBtnIcon = loginContainer.querySelector('i[name="discover-selection-btn-icon"]');
        this.#infoIcon = this.#loginContainer.querySelector('i[name="discover-selection-changed-icon"]');
        
        this.#orderBySelect = this.#discoverContainer.querySelector('select[name="order-by"]');
        this.#orderDirectionSelect = this.#discoverContainer.querySelector('select[name="order-direction"');
        this.#totalInput = this.#discoverContainer.querySelector('input[name="total"]');
        this.#regionSelect = this.#discoverContainer.querySelector('select[name="region"]');
        this.#languageInput = this.#discoverContainer.querySelector('input[name="language"]');

        this.#init();
    }

    #init() {
        let _this = this;
        this.#discoverBtn.addEventListener('click', () => {
            if (this.#discoverContainer.classList.contains('d-none')) {
                _this.#unhideDiscoverSelection();
            } else {
                _this.#hideDiscoverSelection();
            }
        });
        this.#loginContainer.addEventListener('settings.unhide', (e) => {
            if (e.detail.settings !== 'discover') {
                _this.#hideDiscoverSelection();
            }
        });
        this.#orderBySelect.addEventListener('change', () => { _this.#infoIconDisplay(); });
        this.#orderDirectionSelect.addEventListener('change', () => { _this.#infoIconDisplay(); });
        this.#totalInput.addEventListener('input', () => {
            _this.validate();
        });

        this.#loginContainer.addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            _this.#initDiscover(settings);
        });
        this.#loginContainer.addEventListener('providers.validated', (e) => {
            _this.#discoverBtnCheck(e.detail.providers);
        });
        const tooltips = this.#discoverContentContainer.querySelectorAll('[data-bs-toggle="tooltip"]');
        [...tooltips].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    }

    #discoverBtnCheck(providers) {
        const sources = providers.map((v, i) => { return Kinder.providerToSource(v); });
        this.#discoverBtn.disabled = !sources.includes('tmdb');
        this.#infoIconDisplay();
    }

    #hideDiscoverSelection() {
        let suffix = this.isValid() ? 'secondary' : 'danger';
        this.#discoverContainer.classList.add('d-none');
        this.#discoverBtn.classList.remove('btn-secondary', 'btn-danger', 'btn-outline-danger');
        this.#discoverBtn.classList.add('btn-outline-' + suffix);
        this.#discoverBtnIcon.classList.remove('bi-caret-down-fill');
        this.#discoverBtnIcon.classList.add('bi-caret-right-fill');
        this.#btnColorAfterValidate();
    }

    #unhideDiscoverSelection() {
        let suffix = this.isValid() ? 'secondary' : 'danger';
        this.#discoverContainer.classList.remove('d-none');
        this.#discoverBtn.classList.remove('btn-danger', 'btn-outline-secondary', 'btn-outline-danger');
        this.#discoverBtn.classList.add('btn-' + suffix);
        this.#discoverBtnIcon.classList.remove('bi-caret-right-fill');
        this.#discoverBtnIcon.classList.add('bi-caret-down-fill');
        this.#btnColorAfterValidate();
        this.#loginContainer.dispatchEvent(new CustomEvent('settings.unhide', {
            detail: {
                settings: 'discover'
            }
        }));
    }

    #infoIconDisplay() {
        if (this.#discover === undefined || this.#discover === null) {
            return;
        }

        if (this.#discoverBtn.disabled) {
            this.#infoIcon.classList.add('d-none');
            return;
        }

        const order_by = this.getSortBy();
        const order_direction = this.getSortOrder();
        const total = this.getTotal();
        const region = this.getRegion();
        const language = this.getLanguage();

        if (total !== this.#discover.total
            || order_by !== this.#discover.sort_by
            || order_direction !== this.#discover.sort_order
            || region !== this.#discover.region
            || language !== this.#discover.language) {
            this.#infoIcon.classList.remove('d-none');
        } else {
            this.#infoIcon.classList.add('d-none');
        }
    }

    #btnColorAfterValidate() {
        const outline = this.#discoverContainer.classList.contains('d-none');
        let suffix = this.isValid() ? 'secondary' : 'danger';
        this.#discoverBtn.classList.remove('btn-secondary', 'btn-danger', 'btn-outline-danger', 'btn-danger', 'btn-outline-secondary', 'btn-outline-danger');
        this.#discoverBtn.classList.add('btn-' + (outline ? 'outline-' : '') + suffix);
    }

    #initDiscover(settings) {
        this.#discover = settings.discover;
        this.#orderBySelect.value = this.#discover.sort_by;
        this.#orderDirectionSelect.value = this.#discover.sort_order;
        this.#totalInput.value = this.#discover.total;
        this.#initLanguage();
        this.#initRegions(settings.regions);
        this.validate(true);
    }

    #initLanguage() {
        let _this = this;
        this.#languageInput.value = this.#discover.language;
        this.#languageInput.addEventListener('input', () => {
            _this.validate();
            let language = _this.getLanguage();
            if (language !== null) {
                _this.#loginContainer.dispatchEvent(new CustomEvent('language.changed', {
                    detail: {
                    language: language
                    }
                }));
            }
        });
    }

    #initRegions(regions) {
        let _this = this;
        for (const region of regions) {
            let option = document.createElement('option');
            option.value = region.iso;
            option.innerText = region.name;
            if (this.#discover.region === region.iso) {
                option.selected = true;
            }
            this.#regionSelect.appendChild(option);
        }
        this.#regionSelect.addEventListener('change', () => { 
            _this.#infoIconDisplay();
            _this.#loginContainer.dispatchEvent(new CustomEvent('region.changed', {
                detail: {
                    region: _this.getRegion()
                }
            }));
        });
        this.#loginContainer.dispatchEvent(new CustomEvent('region.changed', {
            detail: {
                region: this.getRegion()
            }
        }));
    }

    isValid() {
        return !this.#totalInput.classList.contains('is-invalid')
            && !this.#languageInput.classList.contains('is-invalid');
    }

    validate(buttonChek = true) {
        let total = parseInt(this.#totalInput.value);
        let language = this.getLanguage();
        if (isNaN(total) || total.toString() !== this.#totalInput.value || total <= 0 || total > 1000) {
            this.#totalInput.classList.add('is-invalid');
        } else {
            this.#totalInput.classList.remove('is-invalid');
        }
        if (language === null || language === undefined) {
            this.#languageInput.classList.add('is-invalid');
        } else {
            this.#languageInput.classList.remove('is-invalid');
        }
        this.#btnColorAfterValidate();
        this.#infoIconDisplay();

        if (buttonChek) {
            this.#loginContainer.dispatchEvent(new Event('loginButtonCheckRequest'));
        }
    }

    getSortBy() {
        return this.#orderBySelect.value;
    }

    getSortOrder() {
        return this.#orderDirectionSelect.value;
    }

    getTotal() {
        return this.#totalInput.value;
    }

    getDiscover() {
        return {
            sort_by: this.getSortBy(),
            sort_order: this.getSortOrder(),
            total: this.getTotal(),
            region: this.getRegion(),
            language: this.getLanguage()
        };
    }

    getRegion() {
        return this.#regionSelect.value;
    }

    getLanguage() {
        let language = this.#languageInput.value;
        if (language !== undefined && language !== null && language !== ''
            && language.length === 5 && language.charAt(2) === '-') {
            let split = language.split('-');
            if (split[0].length === 2 && split[1].length === 2
                && split[0] === split[0].toLowerCase() && split[1] === split[1].toUpperCase()
                && this.#onlyLettersRegex.test(split[0]) && this.#onlyLettersRegex.test(split[1])) {
                return language;
            }
            
        }
        return null;
    }
}