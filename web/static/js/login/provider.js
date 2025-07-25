export class ProviderSelection {
    #loginContainerSelector;
    #sessionProviderSelector;
    #sessionProviderContainer;

    constructor(loginContainerSelector) {
        this.#loginContainerSelector = loginContainerSelector;
        this.#sessionProviderSelector = loginContainerSelector + ' div[name="movie_provider"] input[type="checkbox"]';
        this.#sessionProviderContainer = loginContainerSelector + ' div[name="movie_provider-container"]';
        this.#init();
    }

    #init() {
        let _this = this;
        document.querySelector(this.#loginContainerSelector).addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            _this.#initProvider(settings);
        });
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

        if (buttonChek) {
            document.querySelector(this.#loginContainerSelector).dispatchEvent(new Event('loginButtonCheckRequest'));
        }
    }
}