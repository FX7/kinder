export class EndConditionSelection {
    #loginContainer;
    #endConditionContainer;
    #endBtn;
    #endBtnIcon;
    #infoIcon;

    #timeLimitCheckbox;
    #voteLimitCheckbox;
    #matchLimitCheckbox;

    #timeLimitContainer;
    #voteLimitContainer;
    #matchLimitContainer;

    #matchLimitInput;
    #voteLimitInput;
    #timeLimitInput;

    constructor(loginContainer) {
        this.#loginContainer = loginContainer;
        this.#endConditionContainer = this.#loginContainer.querySelector('div[name="end-condition-container"]');
        this.#endBtn = this.#loginContainer.querySelector('button[name="end-condition-btn"]');
        this.#endBtnIcon = this.#loginContainer.querySelector('i[name="end-condition-btn-icon"]');
        this.#infoIcon = this.#loginContainer.querySelector('i[name="end-condition-changed-icon"]');

        this.#timeLimitCheckbox = this.#loginContainer.querySelector('input[name="end-time-limit-chckbx"]');
        this.#voteLimitCheckbox = this.#loginContainer.querySelector('input[name="end-vote-limit-chckbx"]');
        this.#matchLimitCheckbox = this.#loginContainer.querySelector('input[name="end-match-limit-chckbx"]');

        this.#timeLimitContainer = this.#loginContainer.querySelector('div[name="end-time-limit-container"]');
        this.#voteLimitContainer = this.#loginContainer.querySelector('div[name="end-vote-limit-container"]');
        this.#matchLimitContainer = this.#loginContainer.querySelector('div[name="end-match-limit-container"]');

        this.#matchLimitInput = this.#loginContainer.querySelector('input[name="end-match-limit"]');
        this.#voteLimitInput = this.#loginContainer.querySelector('input[name="end-vote-limit"]');
        this.#timeLimitInput = this.#loginContainer.querySelector('input[name="end-time-limit"]');

        this.#init();
    }

    #init() {
        let _this = this;
        this.#loginContainer.addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            _this.#initEndConditions(settings);
        });

        this.#endBtn.addEventListener('click', () => {
            if (this.#endConditionContainer.classList.contains('d-none')) {
                _this.#unhideEndConditions();
            } else {
                _this.#hideEndConditions();
            }
        });
        this.#loginContainer.addEventListener('settings.unhide', (e) => {
            if (e.detail.settings !== 'end') {
                _this.#hideEndConditions();
            }
        });
    }

    #hideEndConditions() {
        let suffix = this.isValid() ? 'secondary' : 'danger';
        this.#endConditionContainer.classList.add('d-none');
        this.#endBtn.classList.remove('btn-secondary', 'btn-danger', 'btn-outline-danger');
        this.#endBtn.classList.add('btn-outline-' + suffix);
        this.#endBtnIcon.classList.remove('bi-caret-down-fill');
        this.#endBtnIcon.classList.add('bi-caret-right-fill');
    }

    #unhideEndConditions() {
        let suffix = this.isValid() ? 'secondary' : 'danger';
        this.#endConditionContainer.classList.remove('d-none');
        this.#endBtn.classList.remove('btn-danger', 'btn-outline-secondary', 'btn-outline-danger');
        this.#endBtn.classList.add('btn-' + suffix);
        this.#endBtnIcon.classList.remove('bi-caret-right-fill');
        this.#endBtnIcon.classList.add('bi-caret-down-fill');
        this.#loginContainer.dispatchEvent(new CustomEvent('settings.unhide', {
            detail: {
                settings: 'end'
            }
        }));
    }

    #initEndConditions(settings) {
        let end_conditions = settings.end_conditions;

        this.#timeLimitCheckbox.addEventListener('change', () => {
            if (this.#timeLimitCheckbox.checked) {
                this.#timeLimitContainer.classList.remove('d-none');
            } else {
                this.#timeLimitContainer.classList.add('d-none');
            }
            this.validate();
        });
        this.#timeLimitInput.addEventListener('input', () => {
            this.validate();
        });
        this.#voteLimitCheckbox.addEventListener('change', () => {
            if (this.#voteLimitCheckbox.checked) {
                this.#voteLimitContainer.classList.remove('d-none');
            } else {
                this.#voteLimitContainer.classList.add('d-none');
            }
            this.validate();
        });
        this.#voteLimitInput.addEventListener('input', () => {
            this.validate();
        });
        this.#matchLimitCheckbox.addEventListener('change', () => {
            if (this.#matchLimitCheckbox.checked) {
                this.#matchLimitContainer.classList.remove('d-none');
            } else {
                this.#matchLimitContainer.classList.add('d-none');
            }
            this.validate();
        });
        this.#matchLimitInput.addEventListener('input', () => {
            this.validate();
        });

        if (end_conditions.max_minutes > 0 || !this.#isNumber(end_conditions.max_minutes)) {
            this.#timeLimitInput.value = end_conditions.max_minutes;
            this.#timeLimitCheckbox.checked = true;
        }
        if (end_conditions.max_votes > 0 || !this.#isNumber(end_conditions.max_votes)) {
            this.#voteLimitInput.value = end_conditions.max_votes;
            this.#voteLimitCheckbox.checked = true;
        }
        if (end_conditions.max_matches > 0 || !this.#isNumber(end_conditions.max_matches)) {
            this.#matchLimitInput.value = end_conditions.max_matches;
            this.#matchLimitCheckbox.checked = true;
        }
        this.#timeLimitCheckbox.dispatchEvent(new Event('change'));
        this.#voteLimitCheckbox.dispatchEvent(new Event('change'));
        this.#matchLimitCheckbox.dispatchEvent(new Event('change'));

        this.validate();

        if (settings.filter_hide.end && this.isValid()) {
            this.#endConditionContainer.classList.add('d-none');
            this.#endBtn.classList.add('d-none');
        }
    }

    #isNumber(str) {
        const num = parseInt(str, 10);
        return !isNaN(num) && num.toString() === str;
    }

    isValid() {
        return (!this.#matchLimitCheckbox.checked || !this.#matchLimitInput.classList.contains('is-invalid'))
                && (!this.#voteLimitCheckbox.checked || !this.#voteLimitInput.classList.contains('is-invalid'))
                && (!this.#timeLimitCheckbox.checked || !this.#timeLimitInput.classList.contains('is-invalid'));
    }

    validate(buttonChek = true) {
        if (this.#matchLimitInput.value === '' || isNaN(parseInt(this.#matchLimitInput.value)) || parseInt(this.#matchLimitInput.value) <= 0) {
            this.#matchLimitInput.classList.add('is-invalid');
        } else {
            this.#matchLimitInput.classList.remove('is-invalid');
        }
        if (this.#voteLimitInput.value === '' || isNaN(parseInt(this.#voteLimitInput.value)) || parseInt(this.#voteLimitInput.value) <= 0) {
            this.#voteLimitInput.classList.add('is-invalid');
        } else {
            this.#voteLimitInput.classList.remove('is-invalid');
        }
        if (this.#timeLimitInput.value === '' || isNaN(parseInt(this.#timeLimitInput.value)) || parseInt(this.#timeLimitInput.value) <= 0) {
            this.#timeLimitInput.classList.add('is-invalid');
        } else {
            this.#timeLimitInput.classList.remove('is-invalid');
        }

        this.#btnColorAfterValidate();
        this.#infoIconDisplay();

        if (buttonChek) {
            this.#loginContainer.dispatchEvent(new Event('loginButtonCheckRequest'));
        }
    }

    #btnColorAfterValidate() {
        const outline = this.#endConditionContainer.classList.contains('d-none');
        let suffix = this.isValid() ? 'secondary' : 'danger';
        this.#endBtn.classList.remove('btn-secondary', 'btn-danger', 'btn-outline-danger', 'btn-danger', 'btn-outline-secondary', 'btn-outline-danger');
        this.#endBtn.classList.add('btn-' + (outline ? 'outline-' : '') + suffix);
    }

    #infoIconDisplay() {
        if (this.getSessionMaxMatches() !== -1 || this.getSessionMaxTime() !== -1 || this.getSessionMaxVotes() !== -1) {
            this.#infoIcon.classList.remove('d-none');
        } else {
            this.#infoIcon.classList.add('d-none');
        }
    }

    getEndConditions() {
        return {
            max_minutes: this.getSessionMaxTime(),
            max_votes: this.getSessionMaxVotes(),
            max_matches: this.getSessionMaxMatches()
        };
    }

    getSessionMaxTime() {
        if (this.#timeLimitCheckbox.checked) {
            return parseInt(this.#timeLimitInput.value);
        }
        return -1;
    }

    getSessionMaxVotes() {
        if (this.#voteLimitCheckbox.checked) {
            return parseInt(this.#voteLimitInput.value);
        }
        return -1;
    }

    getSessionMaxMatches() {
        if (this.#matchLimitCheckbox.checked) {
            return parseInt(this.#matchLimitInput.value);
        }
        return -1;
    }
}