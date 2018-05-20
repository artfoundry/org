/**
 * Created by LCD Dreams on 4/14/18.
 */

class FirebaseServices {
    constructor() {
        this.isOnline = this._initialize();
        if (this.isOnline) {
            this.fbDatabase = firebase.database();
            this.scores = {
                "easy": [],
                "medium": [],
                "hard": []
            };
            this._getScores();
            this._monitorConnection();
        }
    }

    _initialize() {
        let config = {
                apiKey: "AIzaSyBFc_HcCL84XhFoYr6rwRDrWddnUinsWtQ",
                authDomain: "org-board.firebaseapp.com",
                databaseURL: "https://org-board.firebaseio.com",
                projectId: "org-board",
                storageBucket: "org-board.appspot.com",
                messagingSenderId: "905919970459"
            },
            initResult = true;

        try {
            firebase.initializeApp(config);
        } catch (e) {
            alert('Unable to connect to the leaderboards server. Reload the game to try again.');
            initResult = false;
        }

        return initResult;
    }

    saveScore(score, callback) {
        if (this.isOnline) {
            this.fbDatabase.ref('scores/' + Game.gameSettings.difficulty).push({
                score: score
            });
            callback();
        }
    }

    _monitorConnection() {
        let connectedRef = this.fbDatabase.ref(".info/connected");
        connectedRef.on("value", (snap) => {
            if (snap.val() === true) {
                this.isOnline = true;
            } else {
                this.isOnline = false;
            }
        });
    }

    _getScores() {
        let newScores,
            fbServices = this;

        if (this.isOnline) {
            for (let list in this.scores) {
                if (this.scores.hasOwnProperty(list)) {
                    this.fbDatabase.ref('/scores/' + list).orderByChild('score').limitToLast(10).on('value', function(snapshot) {
                        newScores = [];
                        snapshot.forEach(function(childSnapshot) {
                            newScores.push(childSnapshot.val().score);
                        });
                        fbServices.scores[list] = newScores;
                    });
                    this.scores[list].reverse();
                }
            }
        }
    }
}