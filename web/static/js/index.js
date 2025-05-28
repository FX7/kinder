const Kinder = (function(window, document) {
    let login;
    

    // Initialisierungsmethode
    function init() {      
        login = Login.getInstance();
    }

    // Event Listener für DOMContentLoaded
    document.addEventListener('DOMContentLoaded', init);

    return {
        toast: function(message) {
            const template = document.getElementById('toast-template');
            const clone = document.importNode(template.content, true);
            clone.querySelector('div.toast-body').innerHTML = message;
            const container = document.querySelector('div.toast-container[name="toast-container"]');
            container.appendChild(clone);

            let toast = container.querySelector('div.toast[name="toast"]');
            const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toast);
            toastBootstrap.show();
        }
    };
})(window, document);
