const Kinder = (function(window, document) {
    let login;

    function init() {      
        login = Login.getInstance();
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
        }
    };
})(window, document);
