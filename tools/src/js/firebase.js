/**
 * Created by LCD Dreams on 4/14/18.
 */

class FirebaseServices {
    constructor(types, callback) {
        this.isOnline = this._initialize();
        if (this.isOnline) {
            this.fbDatabase = firebase.database();
            this.objectTypes = types;
            for (let i=0; i < this.objectTypes.length; i++) {
                this.getItems(this.objectTypes[i], callback);
            }
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
            alert('Unable to connect to the server. Reload the page to try again.');
            initResult = false;
        }

        return initResult;
    }

    saveItem(item, type) {
        if (this.isOnline) {
            this.fbDatabase.ref(type + '/').push({
                type: item
            });
        }
    }

    _monitorConnection() {
        let connectedRef = this.fbDatabase.ref(".info/connected");
        connectedRef.on("value", (snap) => {
            this.isOnline = snap.val();
            this.isOnline ? console.log("Connection with Firebase server is good") : console.log("No connection with Firebase server");
        });
    }

    getItems(type, callback) {
        let newItems = [],
            types = type + 's';

        if (this.isOnline) {
            this.fbDatabase.ref('/' + types + '/').orderByKey().on('value', function(snapshot) {
                snapshot.forEach(function(childSnapshot) {
                    newItems.push(childSnapshot.val());
                });
                callback(types, newItems);
            });
        }
    }
}
