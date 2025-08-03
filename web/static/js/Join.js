import { Fetcher } from './Fetcher.js';
import { Kinder } from './index.js';

export class Join {
    #sessionHash;

    constructor(sessionhash) {
        this.#sessionHash = sessionhash;
    }

    async join() {
        let session = await Fetcher.getInstance().getSessionByHash(this.#sessionHash)
        if (session === undefined || session === null) {
            throw new Error('No session with hash ' + this.#sessionHash + ' found!');
        }
        let users = await Fetcher.getInstance().listUsers();
        const nameSuggestions = await Fetcher.getInstance().usernameSuggestions();
        const usernames = users.map((u, i) => u.name);
        let username = Kinder.randomMember(usernames, nameSuggestions);
        if (username === null) {
            throw new Error('No username could be fetched!');
        }
        let user = await Fetcher.getInstance().imposeUser(username);
        Kinder.setSession(session);
        Kinder.setUser(user);
        window.location = '/vote'
    }
}