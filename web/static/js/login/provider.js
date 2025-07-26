export class ProviderSelection {
    #loginContainerSelector;
    #sessionProviderSelector;
    #sessionProviderContainer;

    #providerBtn;
    #providerBtnIcon;

    constructor(loginContainerSelector) {
        this.#loginContainerSelector = loginContainerSelector;
        this.#sessionProviderSelector = loginContainerSelector + ' div[name="movie_provider"] input[type="checkbox"]';
        this.#sessionProviderContainer = loginContainerSelector + ' div[name="movie_provider-container"]';
        this.#providerBtn = loginContainerSelector + ' div[name="provider-selection-btn"]';
        this.#providerBtnIcon = loginContainerSelector + ' i[name="provider-selection-btn-icon"]';
        this.#init();
    }

    #init() {
        let _this = this;
        document.querySelector(this.#loginContainerSelector).addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            _this.#initProvider(settings);
        });

        const providerBtn = document.querySelector(this.#providerBtn);
        providerBtn.addEventListener('click', () => {
            const providerContainer = document.querySelector(this.#sessionProviderContainer);
            if (providerContainer.classList.contains('d-none')) {
                _this.#unhideProviderSelection();
            } else {
                _this.#hideProviderSelection();
            }
        });
    }

    #hideProviderSelection() {
        const providerContainer = document.querySelector(this.#sessionProviderContainer);
        const providerBtn = document.querySelector(this.#providerBtn);
        const providerBtnIcon = document.querySelector(this.#providerBtnIcon);

        let suffix = this.isValid() ? 'secondary' : 'danger';
        providerContainer.classList.add('d-none');
        providerBtn.classList.remove('btn-secondary', 'btn-danger', 'btn-outline-danger');
        providerBtn.classList.add('btn-outline-' + suffix);
        providerBtnIcon.classList.remove('bi-dash');
        providerBtnIcon.classList.add('bi-plus');
    }

    #unhideProviderSelection() {
        const providerContainer = document.querySelector(this.#sessionProviderContainer);
        const providerBtn = document.querySelector(this.#providerBtn);
        const providerBtnIcon = document.querySelector(this.#providerBtnIcon);

        let suffix = this.isValid() ? 'secondary' : 'danger';
        providerContainer.classList.remove('d-none');
        providerBtn.classList.remove('btn-danger', 'btn-outline-secondary', 'btn-outline-danger');
        providerBtn.classList.add('btn-' + suffix);
        providerBtnIcon.classList.remove('bi-plus');
        providerBtnIcon.classList.add('bi-dash');
    }

    #initProvider(settings) {
        let filterDefaults = settings.filter_defaults;
        let availableSources = settings.sources_available;
        let availableProvider = settings.provider_available;
        let hiddenFilter = settings.filter_hide;

        let providers = availableProvider.reverse();
        let providerContainer = document.querySelector('div[name="movie_provider"] .input-group');
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
            document.querySelector(this.#sessionProviderContainer).classList.add('d-none');
        }
        this.validate();
    }

    getProviders() {
        let providers = [];
        let checked_provider = document.querySelectorAll(this.#sessionProviderSelector + ':checked');
        checked_provider.forEach((c) => providers.push(c.name))
        return providers;
    }

    isValid() {
        let sourcesInvalid = false;
        document.querySelectorAll(this.#sessionProviderSelector).forEach((c) => sourcesInvalid |= c.classList.contains('is-invalid'));
        return !sourcesInvalid;
    }

    validate(buttonChek = true) {
        const providers = this.getProviders();
        document.querySelectorAll(this.#sessionProviderSelector).forEach((s) => {
            if (providers.length <= 0) {
                s.classList.add('is-invalid');
            } else {
                s.classList.remove('is-invalid');
            }
        });
        document.querySelector(this.#loginContainerSelector).dispatchEvent(new CustomEvent('providers.validated', {
            detail: {
                providers: providers
            }
        }));

        const providerContainer = document.querySelector(this.#sessionProviderContainer);
        const providerBtn = document.querySelector(this.#providerBtn);
        const outline = providerContainer.classList.contains('d-none');
        let suffix = this.isValid() ? 'secondary' : 'danger';
        providerBtn.classList.remove('btn-secondary', 'btn-danger', 'btn-outline-danger', 'btn-danger', 'btn-outline-secondary', 'btn-outline-danger');
        providerBtn.classList.add('btn-' + (outline ? 'outline-' : '') + suffix);

        if (buttonChek) {
            document.querySelector(this.#loginContainerSelector).dispatchEvent(new Event('loginButtonCheckRequest'));
        }
    }
}