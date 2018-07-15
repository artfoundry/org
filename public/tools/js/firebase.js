/**
 * Created by LCD Dreams on 4/14/18.
 */

class FirebaseServices {
    constructor(objectTypes, allItems, callback) {
        this.isOnline = this._initialize();
        if (this.isOnline) {
            this.fbDatabase = firebase.database();
            this.allItems = allItems;
            this.objectTypes = objectTypes;
            for (let i=0; i < this.objectTypes.length; i++) {
                this._getItems(this.objectTypes[i], callback);
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

    processFormData(item, type) {
        let data = {},
            name = '',
            attr = '';

        for (let n=0; n < item.length; n++) {
            if (item[n].name === 'logical') {
                name = item[n].value;
            } else {
                attr = item[n].name;
                // if this item name has multiple values
                if (data.hasOwnProperty(attr)) {
                    // and array is already set up
                    if (Array.isArray(data[attr])) {
                        data[attr].push(item[n].value);
                    } else {
                        // otherwise, set a new array to that key and add the previous single value as the first item
                        // with the new value as the second item
                        let value = data[attr];
                        data[attr] = [value, item[n].value];
                    }
                } else {
                    data[attr] = item[n].value;
                }
            }
        }

        this._setItem(name, data, type);
    }

    _setItem(name, item, type) {
        if (this.isOnline) {
            this.fbDatabase.ref(type + '/' + name + '/').set(item);
            console.log('submitted ' + name);
        }
    }

    _monitorConnection() {
        let connectedRef = this.fbDatabase.ref(".info/connected");
        connectedRef.on("value", (snap) => {
            this.isOnline = snap.val();
            this.isOnline ? console.log("Connection with Firebase server is good") : console.log("No connection with Firebase server");
        });
    }

    _getItems(type, callback) {
        let fbLocal = this;
        if (this.isOnline) {
            this.fbDatabase.ref('/' + type + '/').orderByKey().on('value', function(snapshot) {
                let items = snapshot.val();
                for (let item in items) {
                    fbLocal.allItems.setItem(type, item, items[item]);
                }
                callback(type, items);
            });
        }
    }
}
