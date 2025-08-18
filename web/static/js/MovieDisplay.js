import { Kinder } from './index.js';

export class MovieDisplay {
    #movieContainerSelector;
    #movie;
    #session;

    #image;

    constructor(movieContainerSelector, movie, session) {
        this.#movieContainerSelector = movieContainerSelector;
        this.#movie = movie;
        this.#session = session;
    }

    getImage() {
        return document.querySelector('div[name="image-container"]');
    }

    build() {
        const movieDisplay = document.querySelector(this.#movieContainerSelector);

        let title = this.#createTitleOverlay();
        let provider = this.#createProviderOverlay();
        this.#image = this.#createMovieImageElement();
        this.#createTrailerButton(this.#image);
        let genres = this.#createGenreOverlays();
        let duration = this.#createDurationOverlay();
        let watched = this.#createWatchedOverlay();
        let ratingStar = this.#createRatingStarOverlay();
        let age = this.#createAgeOverlay();
        let plot = this.#createMoviePlotElement();

        let imageOverlays = this.#image.querySelector('div[name="image-overlays"]');
        const spinner = movieDisplay.querySelector('div[name="spinner"]');
        if (spinner !== undefined && spinner !== null) {
            spinner.remove()
        }
        movieDisplay.appendChild(this.#image);
        genres.forEach((g) => imageOverlays.querySelector('.top-left-overlay').appendChild(g));
        provider.forEach((p) => imageOverlays.querySelector('.top-right-overlay').appendChild(p));
        imageOverlays.querySelector('.bottom-center-overlay').appendChild(title);
        if (ratingStar !== undefined && ratingStar !== null) {
            imageOverlays.querySelector('.bottom-right-overlay').appendChild(ratingStar);
            imageOverlays.querySelector('.bottom-right-high-overlay').appendChild(watched);
            imageOverlays.querySelector('.bottom-right-high-overlay').appendChild(duration);
        } else {
            imageOverlays.querySelector('.bottom-right-overlay').appendChild(watched);
            imageOverlays.querySelector('.bottom-right-overlay').appendChild(duration);
        }
        imageOverlays.querySelector('.bottom-left-overlay').appendChild(age);
        movieDisplay.appendChild(plot);
    }

    #createMoviePlotElement() {
        let title = document.createElement('div');

        title.classList.add('m-2', 'p-3', 'shadow');
        if (this.#movie.plot === undefined || this.#movie.plot === null || this.#movie.plot === '') {
            title.classList.add('d-none');
        } else {
            title.innerHTML = this.#movie.plot;
        }

        return title;
    }

    #createProviderOverlay() {
        let providers = [];
        for (let i=0; i<this.#movie.provider.length; i++) {
            let provider = this.#movie.provider[i];
            let name = provider.name.toLowerCase();
            if (!this.#session.movie_provider.includes(name)) {
                continue;
            }
            const template = document.getElementById('provider-template');
            const sourceOverlay = document.importNode(template.content, true);
            let providerLogo = '<img src="static/images/logo_' + name + '.png" width="40" class="mt-2 me-2">';
            sourceOverlay.querySelector('span[name="provider"]').innerHTML = providerLogo;
            providers.push(sourceOverlay);
        }
        return providers;
    }

    #createTitleOverlay() {
        const template = document.getElementById('title-template');
        const titleOverlay = document.importNode(template.content, true);
        let title = Kinder.buildMovieTitle(this.#movie.title, this.#movie.year);
        if (title !== undefined && title !== null && title !== '' && !this.#movie.thumbnail) {
            titleOverlay.querySelector('div[name="title"]').innerHTML = '<h3>' + title  + '</h3>';
        } else if (this.#session.overlays.title !== undefined && this.#session.overlays.title !== null && this.#session.overlays.title
            && title !== null && title !== '') {
            titleOverlay.querySelector('div[name="title"]').innerHTML = '<h3>' + title  + '</h3>';
        }
        return titleOverlay;
    }

    #createDurationOverlay() {
        const template = document.getElementById('duration-template');
        const duration = document.importNode(template.content, true);
        if (this.#session.overlays.duration && this.#movie.runtime && this.#movie.runtime > 0) {
            let hours = Math.floor(this.#movie.runtime / 60).toString().padStart(2, '0');
            let minutes = Math.floor(this.#movie.runtime - (hours * 60)).toString().padStart(2, '0');
            duration.querySelector('div[name="duration"]').innerHTML = hours + ':' + minutes;
        }
        return duration;
    }

    #createWatchedOverlay() {
        const template = document.getElementById('watched-template');
        const duration = document.importNode(template.content, true);
        if (this.#session.overlays.watched && this.#movie.playcount !== undefined && this.#movie.playcount !== null && this.#movie.playcount >= 0) {
            if (this.#movie.playcount && this.#movie.playcount > 0) {
                duration.querySelector('div[name="watch-state"]').innerHTML = '<i class="bi bi-eye-fill"></i>';
            } else {
                duration.querySelector('div[name="watch-state"]').innerHTML = '<i class="bi bi-eye-slash-fill"></i>';
            }
        }
        return duration;
    }

    #createRatingStarOverlay() {
        if (this.#session.overlays.rating && this.#movie.rating.average !== undefined && this.#movie.rating.average !== null) {
            const template = document.getElementById('rating-template');
            const rating = document.importNode(template.content, true);
            rating.querySelector('span[name="rating"').innerHTML = this.#ratingToStarIcons();
            return rating;
        }
        return null;
    }

    #ratingToStarIcons() {
        // Umrechnung von 10-Punkte-Skala auf 5-Punkte-Skala
        let scaledValue = this.#movie.rating.average / 2;
        let count = this.#movie.rating.count;
        
        // Berechnung der Anzahl der X und x
        let filledStarCount = Math.floor(scaledValue);
        
        let result = '';
        result += '<span class="me-1" style="font-weight:bold">' + scaledValue.toFixed(2) + '</span>';
        for (let i = 0; i < filledStarCount; i++) {
            result += '<i class="bi bi-star-fill"></i>';
        }
        
        // Halber Stern für die Aufrundung
        if (Math.round(scaledValue) > filledStarCount) {
            result += '<i class="bi bi-star-half"></i>';
        }
        
        // leere Sterne für die fehlenden Werte bis 5
        for (let i = filledStarCount + (Math.round(scaledValue) > filledStarCount ? 1 : 0); i < 5; i++) {
            result += '<i class="bi bi-star"></i>';
        }

        return result;
    }

    #createAgeOverlay() {
        const template = document.getElementById('age-template');
        const ageOverlay = document.importNode(template.content, true);
        let fsk = this.#movie.age;
        if (this.#session.overlays.age && fsk !== undefined && fsk !== null) {
            let image = document.createElement('img');
            image.alt = this.#movie.age;
            image.src = 'static/images/fsk' + fsk + '.png';
            if (window.innerWidth >= 1060) {
                image.width = '80';
            } else {
                image.width = '65';
            }
            ageOverlay.querySelector('span[name="age"]').appendChild(image);
        }
        return ageOverlay;
    }


    #createGenreOverlays() {
        let tags = []
        if (this.#session.overlays.genres === undefined || this.#session.overlays.genres === null || !this.#session.overlays.genres) {
            return tags;
        }
        for (const genre in this.#movie.genres) {
            const template = document.getElementById('genre-tag-template');
            const tag = document.importNode(template.content, true);
            tag.querySelector('span[name="genre"]').innerHTML = this.#movie.genres[genre].name;
            tags.push(tag);
        }
        return tags;
    }

    #createMovieImageElement() {
        const template = document.getElementById('image-template');
        const container = document.importNode(template.content, true);
        let image = container.querySelector('img[name="image"]')
        image.alt = this.#movie.title;
        if (this.#movie.thumbnail) {
            image.src = this.#movie.thumbnail;
        } else {
            image.src = 'static/images/poster-dummy.jpg';
        }

        return container;
    }

    #createTrailerButton(container) {
        if (this.#session.overlays.trailer === undefined
          || this.#session.overlays.trailer === null
          || !this.#session.overlays.trailer) {
            return;
        }

        let trailerContainer = container.querySelector('div[name="trailer-container"]');
        if (this.#movie.trailer !== undefined && this.#movie.trailer !== null && this.#movie.trailer.length > 0) {
            let play = container.querySelector('div[name="trailer-play"]');
            play.classList.remove('d-none');
            let trailerIdx = 0;
            play.addEventListener('click', () => {
                trailerContainer.classList.remove('d-none');
                let iframe = trailerContainer.querySelector('iframe[name="trailer-content"');
                // let parent = iframe.parentElement;
                this.#movie.trailer.length
                iframe.src = "https://www.youtube.com/embed/" + this.#movie.trailer[trailerIdx] + "?autoplay=1";
                // iframe.width = parent.offsetWidth;
                //iframe.setAttribute('width', '');
                iframe.style.width = "100%";
                iframe.style.height = "100%";
            });
            if (this.#movie.trailer.length > 1) {
                const prev = container.querySelector('.trailer-prev-btn');
                prev.classList.remove('d-none');
                prev.disabled = true;
                prev.addEventListener('click', () => {
                    trailerIdx--;
                    next.disabled = false;
                    if (trailerIdx === 0) {
                        prev.disabled = true;
                    }
                    play.dispatchEvent(new Event('click'));
                });
                const next = container.querySelector('.trailer-next-btn');
                next.classList.remove('d-none');
                next.disabled = false;
                next.addEventListener('click', () => {
                    trailerIdx++;
                    prev.disabled = false;
                    if (trailerIdx == this.#movie.trailer.length - 1) {
                        next.disabled = true;
                    }
                    play.dispatchEvent(new Event('click'));
                });
            }
        }
        trailerContainer.querySelector('.trailer-close-btn').addEventListener('click', () => {
            trailerContainer.classList.add('d-none');
            let iframe = trailerContainer.querySelector('iframe[name="trailer-content"');
            iframe.src = '';
        });
    }
}