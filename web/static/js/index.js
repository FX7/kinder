import { Voter } from './Voter.js';
import { SessionStatus } from './SessionStatus.js';
import { Login } from './Login.js';
import { Fetcher } from './Fetcher.js';

export const Kinder = (function(window, document) {
    let session = null;
    let user = null;

    let lastOverwriteableToast = null;

    function toast(message, title = '', overwriteable = true) {
        const container = document.querySelector('div.toast-container[name="toast-container"]');
        const template = document.getElementById('toast-template');
        const clone = document.importNode(template.content, true);
        const body = clone.querySelector('div.toast-body');
        if (message instanceof Element) {
            body.appendChild(message);
        } else {
            body.innerHTML = message;
        }
        let toast = clone.querySelector('div.toast[name="toast"]');
        
        if (!overwriteable || title !== undefined || title !== null || title !== '') {
            clone.querySelector('div.toast-header').classList.remove('d-none');
            clone.querySelector('.me-auto').innerHTML = title;
        } 

        let options = {
            autohide: false,
            delay: 30000
        }
        container.appendChild(clone);
        const toastBootstrap = new bootstrap.Toast(toast, options);

        if (overwriteable && lastOverwriteableToast !== undefined && lastOverwriteableToast !== null) {
            lastOverwriteableToast.dispose();
        }
        toastBootstrap.show();
        if (overwriteable) {
            lastOverwriteableToast = toastBootstrap;
        }
        return toast;
    }

    async function init() {
        try {
            if (window.location.href.endsWith('about')) {

            } else if (window.location.href.endsWith('vote')) {
                let mySession = null;
                let myUser = null;
                try {
                    mySession = await Kinder.getSession();
                    myUser = await Kinder.getUser();
                } catch(e) {
                    console.log('No valid user/session from cookie received => back to login...');
                    window.location = '/';
                }
                new Voter(mySession, myUser).show();
                new SessionStatus(mySession, myUser)
            } else {
                let login = new Login();
            }
        } catch (e) {
            Kinder.masterError(e);
        }
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        dateTimeOptions: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' },
        shortDateTimeOptions: { weekday: 'long', hour: '2-digit', minute: '2-digit' },

        setSession(newSession) {
            session = newSession;
            Kinder.setCookie('session_id', newSession.session_id, 1);
        },

        setUser(newUser) {
            user = newUser;
            Kinder.setCookie('user_id', newUser.user_id, 1);
        },

        getSession: async function() {
            if (session === null) {
                let session_id = Kinder.getCookie('session_id');
                if (session_id === undefined || session_id === null || session_id === '') {
                    throw new Error('No Session id from cookie');
                }
                let maybeSession = await Fetcher.getInstance().getSession(session_id);
                if (maybeSession === undefined || maybeSession === null || maybeSession.error) {
                    throw new Error('No Session with id ' + session_id + ' found!');
                }
                session = maybeSession;
            }
            return session;
        },

        getUser: async function() {
            if (user === null) {
                let user_id = Kinder.getCookie('user_id');
                if (user_id === undefined || user_id === null || user_id === '') {
                    throw new Error('No User id from cookie');
                }
                let maybeUser = await Fetcher.getInstance().getUser(user_id);
                if (maybeUser === undefined || maybeUser === null || maybeUser.error) {
                    throw new Error('No User with id ' + user_id + ' found!');
                }
                user = maybeUser;
            }
            return user;
        },

        masterError: function(details) {
            let masterError = document.querySelector('div[name="master-error-container"]');
            const detailContainer = masterError.querySelector('p[name="details"]');
            if (details !== undefined && details !== null && details !== '') {
                detailContainer.innerHTML = details.toString();
                console.error(details.toString());
            } else {
                detailContainer.innerHTML = '';
            }
            masterError.classList.remove('d-none');
        },

        persistantToast: function(message, title = null) {
            return toast(message, title, false);
        },


        overwriteableToast: function(message, title = null) {
            return toast(message, title, true);
        },

        setCookie: function(key, value, days) {
            let expires = "";
            if (days) {
                const date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = "; expires=" + date.toUTCString();
            }
            document.cookie = key + "=" + (value || "") + expires + "; path=/";
        },

        getCookie: function(key) {
            const keyEQ = key + "=";
            const ca = document.cookie.split(';');
            for (let i = 0; i < ca.length; i++) {
                let c = ca[i];
                while (c.charAt(0) === ' ') c = c.substring(1, c.length);
                if (c.indexOf(keyEQ) === 0) return c.substring(keyEQ.length, c.length);
            }
            return null; // Cookie nicht gefunden
        },

        buildMovieTitle: function(title, year) {
            if (title === undefined || title === null) {
                return null;
            }
            if (year && year > 0) {
                return title + ' (' + year + ')';
            } else {
                return title;
            }
        },
    };
})(window, document);
