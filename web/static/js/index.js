const Kinder = (function(window, document) {
    let login;

    function init() {      
        login = Login.getInstance();
        login.show();        
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        toast: function(message, title = '', timeout=900) {
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
            
            let autohide = timeout > 0;
            if (!autohide) {
                clone.querySelector('div.toast-header').classList.remove('d-none');
                clone.querySelector('.me-auto').innerHTML = title;
            } 

            let options = {
                autohide: autohide,
                delay: timeout
            }
            container.appendChild(clone);
            const toastBootstrap = new bootstrap.Toast(toast, options);
            toastBootstrap.show();
            return toast;
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
