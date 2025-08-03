export const random_names = (function(window, document) {

    let adjectives = [
        "happy",
        "sad",
        "bright",
        "dark",
        "quick",
        "slow",
        "beautiful",
        "ugly",
        "tall",
        "short",
        "loud",
        "quiet",
        "smooth",
        "rough",
        "warm",
        "cold",
        "soft",
        "hard",
        "rich",
        "poor"
    ];

    let subjects = [
        "cat",
        "dog",
        "car",
        "house",
        "tree",
        "book",
        "computer",
        "phone",
        "ocean",
        "mountain",
        "city",
        "river",
        "flower",
        "bird",
        "star",
        "planet",
        "child",
        "teacher",
        "friend",
        "stranger",
        "night",
        "afternoon",
        "sunset"
    ];

    function init() {

    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        adjectives: adjectives,
        subjects: subjects,
    };
})(window, document);
