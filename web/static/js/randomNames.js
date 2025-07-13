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

    let superheroes = [
        "Spider-Man",
        "Wonder Woman",
        "Batman",
        "Superman",
        "Iron Man",
        "Captain Marvel",
        "Black Panther",
        "Thor",
        "Hulk",
        "Flash",
        "Green Lantern",
        "Aquawoman",
        "Deadpool",
        "Wolverine",
        "Storm",
        "Doctor Strange",
        "Black Widow",
        "Green Arrow",
        "Daredevil",
        "Catwoman"
    ];

    function init() {

    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        adjectives: adjectives,
        subjects: subjects,
        superheroes: superheroes
    };
})(window, document);
