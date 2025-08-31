export class MovieId {
    constructor(source, id, language) {
        this.source = source.toLowerCase();
        this.id = id;
        this.language = language;
    }

    toKey() {
        return MovieId.toKeyByObject(this);
    }

    static toKeyByObject(movieId) {
        return MovieId.toKeyByValues(movieId.source, movieId.id, movieId.language);
    }

    static toKeyByValues(source, id, language) {
        return source.toLowerCase() + ':' + id + ':' + language;
    }

    static fromKey(key) {
        let split = key.split(':')
        let source = split[0];
        let id = split[1];
        let language = split[2];
        return new MovieId(source, id, language);
    }
}