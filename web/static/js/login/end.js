export class EndConditionSelection {
    #loginContainerSelector;
    #sessionEndConditionContainer;

    #timeLimitCheckboxSelector;
    #voteLimitCheckboxSelector;
    #matchLimitCheckboxSelector;

    #timeLimitContainer;
    #voteLimitContainer;
    #matchLimitContainer;

    #matchLimitSelector;
    #voteLimitSelector;
    #timeLimitSelector;

    constructor(loginContainerSelector) {
        this.#loginContainerSelector = loginContainerSelector;
        this.#sessionEndConditionContainer = loginContainerSelector + ' div[name="end-condition-container"]';

        this.#timeLimitCheckboxSelector = loginContainerSelector + ' input[name="end-time-limit-chckbx"]';
        this.#voteLimitCheckboxSelector = loginContainerSelector + ' input[name="end-vote-limit-chckbx"]';
        this.#matchLimitCheckboxSelector = loginContainerSelector + ' input[name="end-match-limit-chckbx"]';

        this.#timeLimitContainer = loginContainerSelector + ' div[name="end-time-limit-container"]';
        this.#voteLimitContainer = loginContainerSelector + ' div[name="end-vote-limit-container"]';
        this.#matchLimitContainer = loginContainerSelector + ' div[name="end-match-limit-container"]';

        this.#matchLimitSelector = loginContainerSelector + ' input[name="end-match-limit"]';
        this.#voteLimitSelector = loginContainerSelector + ' input[name="end-vote-limit"]';
        this.#timeLimitSelector = loginContainerSelector + ' input[name="end-time-limit"]';

        this.#init();
    }

    #init() {
        let _this = this;
        document.querySelector(this.#loginContainerSelector).addEventListener('settings.loaded', (e) => {
            let settings = e.detail.settings;
            _this.#initEndConditions(settings);
        });
    }

    #initEndConditions(settings) {
        let hiddenFilter = settings.filter_hide;
        let end_conditions = settings.end_conditions;
        let hide = hiddenFilter.hide_end;

        const timeLimitContainer = document.querySelector(this.#timeLimitContainer);
        const timeLimitChckbx = document.querySelector(this.#timeLimitCheckboxSelector);
        const timeLimit = document.querySelector(this.#timeLimitSelector);
        const voteLimitContainer = document.querySelector(this.#voteLimitContainer);
        const voteLimitChckbx = document.querySelector(this.#voteLimitCheckboxSelector);
        const voteLimit = document.querySelector(this.#voteLimitSelector);
        const matchLimitContainer = document.querySelector(this.#matchLimitContainer);
        const matchLimitChckbx = document.querySelector(this.#matchLimitCheckboxSelector);
        const matchLimit = document.querySelector(this.#matchLimitSelector);

        timeLimitChckbx.addEventListener('change', () => {
            if (timeLimitChckbx.checked) {
                timeLimitContainer.classList.remove('d-none');
            } else {
                timeLimitContainer.classList.add('d-none');
            }
            this.validate();
        });
        timeLimit.addEventListener('input', () => {
            this.validate();
        });
        voteLimitChckbx.addEventListener('change', () => {
            if (voteLimitChckbx.checked) {
                voteLimitContainer.classList.remove('d-none');
            } else {
                voteLimitContainer.classList.add('d-none');
            }
            this.validate();
        });
        voteLimit.addEventListener('input', () => {
            this.validate();
        });
        matchLimitChckbx.addEventListener('change', () => {
            if (matchLimitChckbx.checked) {
                matchLimitContainer.classList.remove('d-none');
            } else {
                matchLimitContainer.classList.add('d-none');
            }
            this.validate();
        });
        matchLimit.addEventListener('input', () => {
            this.validate();
        });

        if (end_conditions.max_time > 0) {
            timeLimit.value = end_conditions.max_time;
            timeLimitChckbx.checked = true;
        }
        if (end_conditions.max_votes > 0) {
            voteLimit.value = end_conditions.max_votes;
            voteLimitChckbx.checked = true;
        }
        if (end_conditions.max_matches > 0) {
            matchLimit.value = end_conditions.max_matches;
            matchLimitChckbx.checked = true;
        }
        timeLimitChckbx.dispatchEvent(new Event('change'));
        voteLimitChckbx.dispatchEvent(new Event('change'));
        matchLimitChckbx.dispatchEvent(new Event('change'));

        this.validate();

        const endConditionContainer = document.querySelector(this.#sessionEndConditionContainer);
        if (hide) {
            endConditionContainer.classList.add('d-none');
        }
    }

    isValid() {
        const timeLimitChckbx = document.querySelector(this.#timeLimitCheckboxSelector);
        const timeLimit = document.querySelector(this.#timeLimitSelector);
        const voteLimitChckbx = document.querySelector(this.#voteLimitCheckboxSelector);
        const voteLimit = document.querySelector(this.#voteLimitSelector);
        const matchLimitChckbx = document.querySelector(this.#matchLimitCheckboxSelector);
        const matchLimit = document.querySelector(this.#matchLimitSelector);

        return (!matchLimitChckbx.checked || !matchLimit.classList.contains('is-invalid'))
                && (!voteLimitChckbx.checked || !voteLimit.classList.contains('is-invalid'))
                && (!timeLimitChckbx.checked || !timeLimit.classList.contains('is-invalid'));
    }

    validate(buttonChek = true) {
        const matchLimit = document.querySelector(this.#matchLimitSelector);
        const voteLimit = document.querySelector(this.#voteLimitSelector);
        const timeLimit = document.querySelector(this.#timeLimitSelector);

        if (matchLimit.value === '' || isNaN(parseInt(matchLimit.value)) || parseInt(matchLimit.value) <= 0) {
            matchLimit.classList.add('is-invalid');
        } else {
            matchLimit.classList.remove('is-invalid');
        }
        if (voteLimit.value === '' || isNaN(parseInt(voteLimit.value)) || parseInt(voteLimit.value) <= 0) {
            voteLimit.classList.add('is-invalid');
        } else {
            voteLimit.classList.remove('is-invalid');
        }
        if (timeLimit.value === '' || isNaN(parseInt(timeLimit.value)) || parseInt(timeLimit.value) <= 0) {
            timeLimit.classList.add('is-invalid');
        } else {
            timeLimit.classList.remove('is-invalid');
        }

        if (buttonChek) {
            document.querySelector(this.#loginContainerSelector).dispatchEvent(new Event('loginButtonCheckRequest'));
        }
    }

    getSessionMaxTime() {
        const timeLimitChckbx = document.querySelector(this.#timeLimitCheckboxSelector);
        if (timeLimitChckbx.checked) {
            return parseInt(document.querySelector(this.#timeLimitSelector).value);
        }
        return -1;
    }

    getSessionMaxVotes() {
        const voteLimitChckbx = document.querySelector(this.#voteLimitCheckboxSelector);
        if (voteLimitChckbx.checked) {
            return parseInt(document.querySelector(this.#voteLimitSelector).value);
        }
        return -1;
    }

    getSessionMaxMatches() {
        const matchLimitChckbx = document.querySelector(this.#matchLimitCheckboxSelector);
        if (matchLimitChckbx.checked) {
            return parseInt(document.querySelector(this.#matchLimitSelector).value);
        }
        return -1;
    }
}