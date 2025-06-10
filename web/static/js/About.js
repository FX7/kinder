class About {
    constructor() {
        this.#init();
    }

    #init() {
        const link = document.querySelector('div[name="about-link"]');
        if (link !== undefined && link !== null) {
            link.addEventListener('click', () => {
                this.#show();
            });
        }
    }

    async #show() {
        window.location = '/about'
    }
}