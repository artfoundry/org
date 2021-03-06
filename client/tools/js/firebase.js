/**
 * Created by LCD Dreams on 4/14/18.
 *
 * firebase and firebaseui are in global scope
 */

class FirebaseServices {
    constructor() {
        this.isOnline = this._initialize();
        if (this.isOnline) {
            console.log('Init successful')
            this._initAuth();
            this._monitorAuth();
            this.fbDatabase = firebase.database();
            this.objectTypes = Tools.objectTypes;
            for (let i=0; i < this.objectTypes.length; i++) {
                this._getItems(this.objectTypes[i]);
            }
            this._monitorConnection();
        }
    }

    _initialize() {
        // from https://console.firebase.google.com/u/0/project/org-board/settings/general
        let config = {
                apiKey: "AIzaSyBFc_HcCL84XhFoYr6rwRDrWddnUinsWtQ",
                authDomain: "org-board.firebaseapp.com",
                databaseURL: "https://org-board.firebaseio.com",
                projectId: "org-board",
                storageBucket: "org-board.appspot.com",
                messagingSenderId: "905919970459",
                appId: "1:905919970459:web:de9a4fad93011122675a3e"
            };

        try {
            console.log('Trying to initialize')
            firebase.initializeApp(config);
            return true;
        } catch (e) {
            alert('Unable to connect to the server. Reload the page to try again.');
            return false;
        }
    }

    _initAuth() {
        // FirebaseUI config.
        let uiConfig = {
            signInSuccessUrl: 'html/tools.html',
            signInOptions: [
                // Leave the lines as is for the providers you want to offer your users.
                firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                firebase.auth.FacebookAuthProvider.PROVIDER_ID,
                // firebase.auth.TwitterAuthProvider.PROVIDER_ID,
                // firebase.auth.GithubAuthProvider.PROVIDER_ID,
                {
                    provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
                    // Whether the display name should be displayed in the Sign Up page.
                    requireDisplayName: true
                },
                // firebase.auth.PhoneAuthProvider.PROVIDER_ID
            ]
            // callbacks: {
            //     signInSuccessWithAuthResult: function(authResult, redirectUrl) {
            //         let user = authResult.user,
            //             credential = authResult.credential,
            //             isNewUser = authResult.additionalUserInfo.isNewUser,
            //             providerId = authResult.additionalUserInfo.providerId,
            //             operationType = authResult.operationType;
            //         // Return type determines whether we continue the redirect automatically
            //         // or whether we leave that to developer to handle.
            //         return true;
            //     }
            //     signInFailure: function(error) {
            //         // Some unrecoverable error occurred during sign-in.
            //         // Return a promise when error handling is completed and FirebaseUI
            //         // will reset, clearing any UI. This commonly occurs for error code
            //         // 'firebaseui/anonymous-upgrade-merge-conflict' when merge conflict
            //         // occurs. Check below for more details on this.
            //         return handleUIError(error);
            //     }
            // }
            // Terms of service url.
            // tosUrl: '<your-tos-url>'
        };

        // Initialize the FirebaseUI Widget using Firebase.
        let ui = new firebaseui.auth.AuthUI(firebase.auth());
        // The start method will wait until the DOM is loaded.
        ui.start('#firebaseui-auth-container', uiConfig);
    }

    _monitorAuth() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // User is signed in.
                $("#sign-out").click(() => {
                    firebase.auth().signOut().then(() => {
                        // User is signed out.
                        if (window.location.pathname !== "/org/client/tools/index.html")
                            window.location.pathname = "/org/client/tools/index.html";
                        $("#sign-out").off("click");
                    }).catch((error) => {
                        console.log(error);
                    });
                });
            }
        }, (error) => {
            console.log(error);
        });
    }

    processFormData(item, type) {
        let data = {},
            name = '',
            attr = '';

        for (let n=0; n < item.length; n++) {
            if (item[n].name === 'item-name') {
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

    _getItems(type) {
        if (this.isOnline) {
            this.fbDatabase.ref('/' + type + '/').orderByKey().on('value', (snapshot) => {
                let items = snapshot.val();
                for (let item in items) {
                    if (items.hasOwnProperty(item)) {
                        Tools.allItems.setItem(type, item, items[item]);
                    }
                }
                Tools.ui.updateList(type);
            });
        }
    }
}
