const Kinder = (function(window, document) {
    let login;
    

    // Initialisierungsmethode
    function init() {      
        login = Login.getInstance();
    }

    // Event Listener für DOMContentLoaded
    document.addEventListener('DOMContentLoaded', init);

    return {
        publicMethod: function() {
            privateMethod();
        }
    };
})(window, document);
