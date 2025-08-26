import { Kinder } from "./index.js";
import { MovieId } from "./MovieId.js";

export class EndCondition {
    #session = null;
    #user = null;

    #endConditionSelector = 'div[name="session-end-condition"]';
    #timeEndConditionSelector = this.#endConditionSelector + ' span[name="time"]';
    #matchEndConditionSelector = this.#endConditionSelector + ' span[name="matches"]';
    #votesEndConditionSelector = this.#endConditionSelector + ' span[name="votes"]';

    #maxTimeEndConditionRefresh = null;

    #moviesVotes = new Set();
    #previousVotes = null;

    constructor(session, user) {
        this.#session = session;
        this.#user = user;
        this.#init();
    }

    #init() {
        this.#displayTimeEndCondition();
        let _this = this;
        document.addEventListener('maxVotes.init', (e) => {
            _this.#previousVotes =  e.detail.userVotes;
            _this.#displayVoteEndCondition();
        });
        document.addEventListener('vote', (e) => {
            _this.#displayVoteEndCondition(e.detail.movie_id);
        });
        document.addEventListener('match', (e) => {
            _this.#displayMatchEndCondition(e.detail.matchCount);
        });
    }

    #over() {
        const endInfo = document.querySelector(this.#endConditionSelector);
        endInfo.innerHTML = '<h4><span class="badge text-bg-secondary">The vote is over!</span></h4>';
    }

    #displayTimeEndCondition() {
        let maxTime = this.#session.end_conditions.max_minutes;
        if (maxTime <= 0) {
            return;
        }
        if (this.#maxTimeEndConditionRefresh) {
            clearTimeout(this.#maxTimeEndConditionRefresh);
        }

        maxTime = maxTime*60;
        let now = new Date();
        let startDate = new Date(this.#session.start_date);
        const timeDifference = (startDate - now)/1000;
        const timeLeft = timeDifference + maxTime;
        if (timeLeft <= 0) {
            this.#over();
            document.dispatchEvent(new Event('kinder.over.time'));
            // show toast only if timeout was without voting
            // which means timeLeft > -1
            // if a reload / rejoin was done after timeout, the timeLeft will
            // be smaller
            if (timeLeft > -1) {
                Kinder.overwriteableToast('Times up!', 'The vote is over!', 'kinder.over');
            }
        } else {
            const hours = Math.floor(timeLeft / 3600);
            const minutes = Math.ceil((timeLeft % 3600) / 60);
            const seconds = Math.floor(timeLeft % 60);
            let text = '<i class="bi bi-alarm-fill"></i> ';
            let clazz = 'text-bg-secondary';

            if (hours > 1) {
                text += hours + ' h';
            } else if (minutes > 1) {
                text += minutes + ' m';
            } else {
                if (seconds <= 10) {
                    clazz = 'text-bg-danger';
                }
                else if (seconds <= 30) {
                    clazz = 'text-bg-warning';
                }
                text += seconds + ' s';
            }
            const timeInfo = document.querySelector(this.#timeEndConditionSelector);
            // Session already ended in another way and element is gone
            if (timeInfo === undefined || timeInfo === null) {
                return;
            }
            timeInfo.innerHTML = '<h4><span class="badge ' + clazz + '">' + text + '</span></h4>'
            timeInfo.classList.remove('d-none');
            let _this = this;
            this.#maxTimeEndConditionRefresh = setTimeout(() => {_this.#displayTimeEndCondition(); }, 1000);
        }
    }

    #displayMatchEndCondition(matchCount) {
        let maxMatches = this.#session.end_conditions.max_matches;
        if (maxMatches <= 0) {
            return;
        }
        const matchInfo = document.querySelector(this.#matchEndConditionSelector);
        const matchesLeft = maxMatches - matchCount;
        if (matchesLeft <= 0) {
            // because we still refresh tops/flops after end
            // (max votes may not be reached at the same time),
            // we only propagate this on the first time
            if (matchInfo !== undefined && matchInfo !== null) {
                this.#over();
                Kinder.overwriteableToast('Max matches reached!', 'The vote is over!', 'kinder.over');
                document.dispatchEvent(new Event('kinder.over.match'));
            }
        } else {
            // Session already ended in another way and element is gone
            if (matchInfo === undefined || matchInfo === null) {
                return;
            }
            let clazz = 'text-bg-secondary';
            if (matchesLeft <= 1) {
                clazz = 'text-bg-danger';
            } else if (matchesLeft <= 2) {
                clazz = 'text-bg-warning';
            }
            let text = '<i class="bi bi-stars"></i> ' + matchCount + '/' + maxMatches;
            matchInfo.innerHTML = '<h4><span class="badge ' + clazz + '">' + text + '</span></h4>'
            matchInfo.classList.remove('d-none');
        }
    }

    #displayVoteEndCondition(movie_id) {
        let maxVotes = this.#session.end_conditions.max_votes;
        if (maxVotes <= 0) {
            return;
        }

        if (movie_id !== undefined && movie_id !== null) {
            this.#moviesVotes.add(MovieId.toKeyByObject(movie_id));
        }

        if (this.#previousVotes === null) {
            return;
        }

        let userVotes = this.#previousVotes + this.#moviesVotes.size;
        if (userVotes >= maxVotes) {
            // Calling endSession would lead to double callings, because
            // initial we call nextMovie which already would lead to an endSession call
            // (if applyable)
            // this.#endSession('Max votes reached!');
            return;
        }

        let clazz = 'text-bg-secondary';
        let votesLeft = maxVotes - userVotes;
        if (votesLeft <= maxVotes*0.1) {
            clazz = 'text-bg-danger';
        } else if (votesLeft <= maxVotes*0.2) {
            clazz = 'text-bg-warning';
        }
        let text = '<i class="bi bi-person-raised-hand"></i> ' + userVotes + '/' + maxVotes;
        let voteInfo = document.querySelector(this.#votesEndConditionSelector);
        // Session already ended in another way and element is gone
        if (voteInfo === undefined || voteInfo === null) {
            return;
        }
        voteInfo.innerHTML = '<h4><span class="badge ' + clazz + '">' + text + '</span></h4>'
        voteInfo.classList.remove('d-none');
    }
}