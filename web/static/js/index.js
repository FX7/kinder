const Kinder = (function(window, document) {
    let login;

    function init() {      
        login = Login.getInstance();
        login.show();        
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        toast: function(message) {
            const container = document.querySelector('div.toast-container[name="toast-container"]');
            // remove old toasts
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }

            const template = document.getElementById('toast-template');
            const clone = document.importNode(template.content, true);
            clone.querySelector('div.toast-body').innerHTML = message;
            container.appendChild(clone);

            let toast = container.querySelector('div.toast[name="toast"]');
            const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toast);
            toastBootstrap.show();
            setTimeout(() => toastBootstrap.hide(), 750);
        },

        setCookie(key, value, days) {
            let expires = "";
            if (days) {
                const date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = "; expires=" + date.toUTCString();
            }
            document.cookie = key + "=" + (value || "") + expires + "; path=/";
        },

        getCookie(key) {
            const keyEQ = key + "=";
            const ca = document.cookie.split(';');
            for (let i = 0; i < ca.length; i++) {
                let c = ca[i];
                while (c.charAt(0) === ' ') c = c.substring(1, c.length);
                if (c.indexOf(keyEQ) === 0) return c.substring(keyEQ.length, c.length);
            }
            return null; // Cookie nicht gefunden
        }
    };
})(window, document);
