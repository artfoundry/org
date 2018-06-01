/**
 * Created by LCD Dreams on 4/14/18.
 */

class FirebaseServices {
    constructor() {
        this.isOnline = this._initialize();
        if (this.isOnline) {
            this.fbDatabase = firebase.database();
            this.cards = {};
            this.getItems();
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
            if (snap.val() === true) {
                this.isOnline = true;
            } else {
                this.isOnline = false;
            }
        });
    }

    getItems(type) {
        let newItems,
            types = type + 's',
            fbServices = this;

        if (this.isOnline) {
            this.fbDatabase.ref('/' + types + '/').orderByChild(type).on('value', function(snapshot) {
                newItems = [];
                snapshot.forEach(function(childSnapshot) {
                    newItems.push(childSnapshot.val()[type]);
                });
                fbServices[types] = newItems;
            });
        }
    }
}