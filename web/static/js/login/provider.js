export class ProviderSelection {
    #loginContainer;
    #sessionProviderContainer;
    #providerCheckboxes;
    #providerBtn;
    #providerBtnIcon;
    #infoIcon;

    constructor(loginContainer) {
        this.#loginContainer = loginContainer;
        this.#sessionProviderContainer = this.#loginContainer.querySelector('div[name="movie_provider-container"]');
        this.#providerBtn = this.#loginContainer.querySelector('div[name="provider-selection-btn"]');
        this.#providerBtnIcon = this.#providerBtn.querySelector('i[name="provider-selection-btn-icon"]');
        this.#infoIcon = this.#loginContainer.querySelector('i[name="provider-selection-info-icon"]');
        this.#providerCheckboxes = () => this.#loginContainer.querySelectorAll('div[name="movie_provider"] input[type="checkbox"]');
        this.#init();
    }

    #init() {
        let _this = this;
        this.#loginContainer.addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            _this.#initProvider(settings);
        });
        this.#providerBtn.addEventListener('click', () => {
            if (this.#sessionProviderContainer.classList.contains('d-none')) {
                _this.#unhideProviderSelection();
            } else {
                _this.#hideProviderSelection();
            }
        });
    }

    #hideProviderSelection() {
        let suffix = this.isValid() ? 'secondary' : 'danger';
        this.#sessionProviderContainer.classList.add('d-none');
        this.#providerBtn.classList.remove('btn-secondary', 'btn-danger', 'btn-outline-danger');
        this.#providerBtn.classList.add('btn-outline-' + suffix);
        this.#providerBtnIcon.classList.remove('bi-caret-down-fill');
        this.#providerBtnIcon.classList.add('bi-caret-right-fill');
    }

    #unhideProviderSelection() {
        let suffix = this.isValid() ? 'secondary' : 'danger';
        this.#sessionProviderContainer.classList.remove('d-none');
        this.#providerBtn.classList.remove('btn-danger', 'btn-outline-secondary', 'btn-outline-danger');
        this.#providerBtn.classList.add('btn-' + suffix);
        this.#providerBtnIcon.classList.remove('bi-caret-right-fill');
        this.#providerBtnIcon.classList.add('bi-caret-down-fill');
    }

    #initProvider(settings) {
        let filterDefaults = settings.filter_defaults;
        let availableSources = settings.sources_available;
        let availableProvider = settings.provider_available;
        let hiddenFilter = settings.filter_hide;

        let providers = availableProvider.reverse();
        let providerContainer = this.#loginContainer.querySelector('div[name="movie_provider"] .input-group');
        for (let i=0; i<providers.length; i++) {
            let provider = providers[i];
            const template = document.getElementById('provider-select-template');
            const providerSelect = document.importNode(template.content, true);
            let input = providerSelect.querySelector('input');
            input.name = provider.name;
            input.id = 'provider_' + provider.name;
            input.setAttribute('data-source', provider.source);
            if (!availableSources[provider.source]) {
                input.disabled = true;
            } else {
                input.checked = filterDefaults.default_providers.includes(provider.name);
                input.addEventListener('change', () => { this.validate(); });
            }
            let label = providerSelect.querySelector('label');
            label.setAttribute('for', 'provider_' + provider.name);
            let image = providerSelect.querySelector('img');
            image.src = 'static/images/logo_' + provider.name + '.png';
            image.alt = provider.name;
            providerContainer.prepend(providerSelect);
        }
        if (hiddenFilter.hide_provider) {
            this.#sessionProviderContainer.classList.add('d-none');
        }
        this.validate();
    }

    getProviders() {
        let providers = [];
        this.#providerCheckboxes().forEach((c) => {
            if (c.checked) providers.push(c.name);
        });
        return providers;
    }

    isValid() {
        let sourcesInvalid = false;
        this.#providerCheckboxes().forEach((c) => sourcesInvalid |= c.classList.contains('is-invalid'));
        return !sourcesInvalid;
    }

    validate(buttonChek = true) {
        const providers = this.getProviders();
        this.#providerCheckboxes().forEach((s) => {
            if (providers.length <= 0) {
                s.classList.add('is-invalid');
            } else {
                s.classList.remove('is-invalid');
            }
        });
        this.#loginContainer.dispatchEvent(new CustomEvent('providers.validated', {
            detail: {
                providers: providers
            }
        }));
        this.#btnColorAfterValidate();
        this.#infoIconDisplay(providers);
        if (buttonChek) {
            this.#loginContainer.dispatchEvent(new Event('loginButtonCheckRequest'));
        }
    }

    #btnColorAfterValidate() {
        const outline = this.#sessionProviderContainer.classList.contains('d-none');
        let suffix = this.isValid() ? 'secondary' : 'danger';
        this.#providerBtn.classList.remove('btn-secondary', 'btn-danger', 'btn-outline-danger', 'btn-danger', 'btn-outline-secondary', 'btn-outline-danger');
        this.#providerBtn.classList.add('btn-' + (outline ? 'outline-' : '') + suffix);
    }

    #infoIconDisplay(providers) {
        if (providers.length) {
            this.#infoIcon.classList.remove('d-none');
        } else {
            this.#infoIcon.classList.add('d-none');
        }
    }
}