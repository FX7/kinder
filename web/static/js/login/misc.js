export class MiscSelection {
    #loginContainer;
    #miscContainer;
    #miscBtn;
    #miscBtnIcon;
    #infoIcon;

    #ageSelection;
    #durationSelection;
    #watchedSelection;
    #providerSelection;

    constructor(loginContainer, ageSelection, durationSelection, watchedSelection, providerSelection) {
        this.#loginContainer = loginContainer;

        this.#ageSelection = ageSelection;
        this.#durationSelection = durationSelection;
        this.#watchedSelection = watchedSelection;
        this.#providerSelection = providerSelection;

        this.#miscContainer = this.#loginContainer.querySelector('div[name="misc-selection"]');
        this.#miscBtn = this.#loginContainer.querySelector('div[name="misc-selection-btn"]');
        this.#miscBtnIcon = this.#miscBtn.querySelector('i[name="misc-selection-btn-icon"]');
        this.#infoIcon = this.#loginContainer.querySelector('i[name="misc-selection-info-icon"]');
        this.#init();
    }

    #init() {
        let _this = this;
        this.#miscBtn.addEventListener('click', () => {
            if (this.#miscContainer.classList.contains('d-none')) {
                _this.#unhideMiscSelection();
            } else {
                _this.#hideMiscSelection();
            }
        });
        this.#loginContainer.addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            if (this.#ageSelection.isHidden() && this.#durationSelection.isHidden() && this.#watchedSelection.isHidden()) {
                this.#miscBtn.classList.add('d-none');
            }
            
        });
        this.#loginContainer.addEventListener('miscellaneousChanged', () => {
            _this.#infoIconDisplay(_this.#providerSelection.getProviders());
        });
        this.#loginContainer.addEventListener('providers.validated', (e) => {
            _this.#infoIconDisplay(e.detail.providers);
        });
    }

    #infoIconDisplay(providers) {
        const age = this.#ageSelection.getMaxAge();
        const duration = this.#durationSelection.getMaxDuration();
        const watched = this.#watchedSelection.getIncludeWatched();

        if (age <= 16 || duration <= 240 || (!watched && providers.includes('kodi'))) {
            this.#infoIcon.classList.remove('d-none');
        } else {
            this.#infoIcon.classList.add('d-none');
        }
    }

    #hideMiscSelection() {
        this.#miscContainer.classList.add('d-none');
        this.#miscBtn.classList.remove('btn-secondary');
        this.#miscBtn.classList.add('btn-outline-secondary');
        this.#miscBtnIcon.classList.remove('bi-caret-down-fill');
        this.#miscBtnIcon.classList.add('bi-caret-right-fill');
    }

    #unhideMiscSelection() {
        this.#miscContainer.classList.remove('d-none');
        this.#miscBtn.classList.remove('btn-outline-secondary');
        this.#miscBtn.classList.add('btn-secondary');
        this.#miscBtnIcon.classList.remove('bi-caret-right-fill');
        this.#miscBtnIcon.classList.add('bi-caret-down-fill');
    }
}