export class MovieId {
    constructor(source, id) {
        this.source = source.toLowerCase();
        this.id = id;
    }

    toKey() {
        return MovieId.toKey(this);
    }

    static toKeyByObject(movieId) {
        return MovieId.toKeyByValues(movieId.source, movieId.id);
    }

    static toKeyByValues(source, id) {
        return source.toLowerCase() + '-' + id;
    }

    static fromKey(key) {
        let split = key.split('-')
        return new MovieId(split[0], split[1]);
    }
}