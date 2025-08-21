import { Fetcher } from './Fetcher.js';
import { Kinder } from './index.js';

export class Join {
    #infoContainer;;
    #sessionHash;
    #redirectText = 'No session with hash _HASH_ found!<br>Will be redirected to <a href="/">start page</a> in _SECONDS_ seconds ...';

    constructor(sessionhash) {
        this.#sessionHash = sessionhash;
        this.#infoContainer = document.querySelector('div[name="info"]');
    }

    async join() {
        let session = await Fetcher.getInstance().getSessionByHash(this.#sessionHash)
        if (session === undefined || session === null) {
            this.#redirect();
            return;
        }
        Kinder.setSession(session);

        try {
            let user = await Kinder.getUser();
            window.location = '/vote'
        } catch (e) {
            let users = await Fetcher.getInstance().listUsers();
            const nameSuggestions = await Fetcher.getInstance().usernameSuggestions();
            const usernames = users.map((u, i) => u.name);
            let username = Kinder.randomMember(usernames, nameSuggestions);
            if (username === null) {
                throw new Error('No username could be fetched!');
            }
            let user = await Fetcher.getInstance().imposeUser(username);
            Kinder.setUser(user);
            window.location = '/vote'
        }
    }

    #redirect(timeout=10000) {
        if (timeout <= 0) {
            window.location = '/';
            return;
        }
        let infoText = this.#redirectText.replace('_HASH_', this.#sessionHash).replace('_SECONDS_', (timeout/1000).toString());
        this.#infoContainer.innerHTML = infoText;
        setTimeout(() => { this.#redirect(timeout-1000); }, 1000);
    }
}