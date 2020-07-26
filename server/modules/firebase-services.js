class FirebaseServices {
    constructor(GlobalData) {
        this.globalData = GlobalData;
        this.admin = require("firebase-admin");
        // Fetch the service account key JSON file contents
        this.serviceAccount = require("../org-board-eff5da155b1b.json");
        this.isOnline = this._initAuth();
        if (this.isOnline) {
            // As an admin, the app has access to read and write all data, regardless of Security Rules
            this.fbDatabase = this.admin.database();
            this.ref = this.fbDatabase.ref("restricted_access/secret_document");

            // is this necessary?
            // this.ref.once("value", function(snapshot) {
            //     console.log(snapshot.val());
            // });
        }
        this.connectionErrorString = 'Error: Lost connection with database. Please try again.';
    }

    _initAuth() {
        // Initialize the app with a service account, granting admin privileges
        try {
            this.admin.initializeApp({
                credential: this.admin.credential.cert(this.serviceAccount),
                databaseURL: "https://org-board.firebaseio.com"
            });
            return true;
        } catch (error) {
            alert(`Unable to connect to the server. Reload the page to try again.\n${error}`);
            return false;
        }
    }

    _monitorFbConnection(socket) {
        let connectedRef = this.fbDatabase.ref('.info/connected');
        connectedRef.on('value', (snap) => {
            let logMessage = 'No connection with Firebase server. Will keep trying...';

            this.isOnline = snap.val();
            if (this.isOnline) {
                console.log('Connection with Firebase server is good')
            } else {
                console.log(logMessage);
                socket.emit('connect-error', logMessage);
            }
        });
    }

    login(userId, status) {
        return new Promise((resolve, reject) => {
            let errorObject = {
                type: '',
                message: ''
            };

            this.checkOnlineStatus(reject);

            this.fbDatabase.ref(`/userIdList/${userId}/loggedIn`).set(status).then(() => {
                resolve(); // no data needed to pass back
            }).catch((error) => {
                errorObject.type = 'server-error';
                errorObject.message = error;
                reject(errorObject);
            });
        });
    }

    checkOnlineStatus(reject) {
        if (!this.isOnline) {
            let options = {
                type: 'login-failed',
                message: this.connectionErrorString
            };
            reject(options);
        }
    }

    getUser(userId) {
        return new Promise((resolve, reject) => {
            let errorObject = {
                type: '',
                message: ''
            };

            this.checkOnlineStatus(reject);

            this.fbDatabase.ref(`/userIdList/${userId}`).once('value').then((snapshot) => {
                let results = snapshot.val();

                if (results.gameIds) {
                    this.getGameList(userId, true).then((gameList) => {
                        results.games = gameList;
                        resolve(results);
                    }).catch((error) => {
                        errorObject.type = 'server-error';
                        errorObject.message = error;
                        reject(errorObject);
                    });
                } else {
                    resolve(results);
                }
            }).catch((error) => {
                errorObject.type = 'server-error';
                errorObject.message = error;
                reject(errorObject);
            });
        });
    }

    /***************
     * getGameList
     * Request list of games that are still available to join for user (still open and user isn't already in it)
     *
     * @param userId: string
     * @param getPlayerGames: boolean
     * @returns {Promise<array>}
     */
    getGameList(userId, getPlayerGames) {
        return new Promise((resolve, reject) => {
            let errorObject = {
                type: '',
                message: ''
            };

            this.checkOnlineStatus(reject);

            this.fbDatabase.ref('/gameIdList/').once('value').then((snapshot) => {
                let rawData = snapshot.val();
                let filteredList;
                let results;

                if (getPlayerGames) {
                    // Only send back list of games user is playing
                    filteredList = ((game) => {
                        return game.playerIds.includes(userId);
                    });
                } else {
                    // Only send back list of games that still have openings and in which user is not already playing and that hasn't started yet
                    filteredList = ((game) => {
                        return game.playerIds.length < this.globalData.MAX_PLAYER_COUNT && !game.playerIds.includes(userId) && !game.isRunning;
                    });
                }
                results = rawData ? Object.values(rawData).filter(filteredList) : [];
                resolve(results);
            }).catch((error) => {
                errorObject.type = 'server-error';
                errorObject.message = error;
                reject(errorObject);
            });
        });
    }

    getGameInfo(gameId) {
        return new Promise ((resolve, reject) => {
            let errorObject = {
                type: '',
                message: ''
            };

            this.checkOnlineStatus(reject);

            this.fbDatabase.ref(`/gameIdList/${gameId}`).once('value').then((snapshot) => {
                resolve(snapshot.val());
            }).catch((error) => {
                errorObject.type = 'server-error';
                errorObject.message = error;
                reject(errorObject);
            });
        });
    }

    /***************
     * createGame
     * Game server requests FB server to add a new game with user as the creator.
     *
     * @param userId: string
     * @param gameName: string
     * @param gameSet: string
     * @returns {Promise<object>}
     ****************/
    createGame(userId, gameName, gameSet) {
        return new Promise ((resolve, reject) => {
            this.checkOnlineStatus(reject);

            let errorObject = {
                type: '',
                message: ''
            };
            let gameData = {
                gameId: null,
                creator: userId,
                name: gameName,
                playerCount: 1,
                playerIds: [userId],
                set: null,
                isRunning: false
            };
            let userGameList;
            let gameId;
            let updates = {};

            this.getBoardData(gameSet).then((boardData) => {
                console.log('retrieved board data');
                gameData.set = boardData;
                this.getUser(userId).then((userInfo) => {
                    userGameList = userInfo.gameIds || [];
                }).catch((error) => {
                    errorObject.type = 'server-error';
                    errorObject.message = error;
                    reject(errorObject);
                });
            }).then(() => {
                gameId = this.fbDatabase.ref('/gameIdList/').push().key;
                gameData.gameId = gameId;
                userGameList.push(gameId);
                updates[`/gameIdList/${gameId}`] = gameData;
                updates[`/userIdList/${userId}/gameIds`] = userGameList;
                updates[`/userIdList/${userId}/inGame`] = gameId;

                this.fbDatabase.ref().update(updates).then(() => {
                    resolve(gameData);
                }).catch((error) => {
                    errorObject.type = 'server-error';
                    errorObject.message = error;
                    reject(errorObject);
                });
            }).catch((error) => {
                errorObject.type = 'server-error';
                errorObject.message = error;
                reject(errorObject);
            });
        });
    }

    /****************
     * joinGame
     * Game server gets game info from FB server, then sends FB server request to add user to game.
     *
     * gameData object:
     *      gameId (FB key)
     *      creator (string)
     *      name (string)
     *      playerCount (int)
     *      playerIds (array)
     *      sets (array)
     *      colors (object)
     *
     * @param userId: string
     * @param gameId: FB key (string)
     * @returns {Promise<{data: object, error: string}>}
     ******************/
    joinGame(userId, gameId) {
        return new Promise ((resolve, reject) => {
            let gameData = {
                gameId,
                creator: null,
                name: null,
                playerCount: null,
                playerIds: [],
                sets: [],
                currentPlayerTurn: ''
            };
            let errorObject = {
                type: '',
                message: ''
            };
            let userGameIDList;
            let updates = {};

            this.checkOnlineStatus(reject);

            this.getUser(userId).then((userData) => {
                userGameIDList = userData.gameIds || [];
                userGameIDList.push(gameId);
            }).then(() => {
                this.getGameInfo(gameId).then((retrievedGameInfo) => {
                    retrievedGameInfo.playerIds.push(userId);
                    gameData.name = retrievedGameInfo.name;
                    gameData.playerIds = retrievedGameInfo.playerIds;
                    gameData.playerCount = retrievedGameInfo.playerCount + 1;
                    gameData.creator = retrievedGameInfo.creator;
                    gameData.sets = retrievedGameInfo.sets || gameData.sets;

                    updates[`/gameIdList/${gameId}/playerCount`] = gameData.playerCount;
                    updates[`/gameIdList/${gameId}/playerIds`] = gameData.playerIds;
                    updates[`/userIdList/${userId}/gameIds`] = userGameIDList;
                    updates[`/userIdList/${userId}/inGame`] = gameId;

                    this.fbDatabase.ref().update(updates).then(() => {
                        resolve(gameData);
                    }).catch((error) => {
                        errorObject.type = 'server-error';
                        errorObject.message = error;
                        reject(errorObject);
                    });
                }).catch((error) => {
                    errorObject.type = 'server-error';
                    errorObject.message = error;
                    reject(errorObject);
                });
            }).catch((error) => {
                errorObject.type = 'server-error';
                errorObject.message = error;
                reject(errorObject);
            });
        });
    }

    /*********************
     * updateGame
     *
     * @param gameId: string
     * @param gameData: object of whatever data needs to be updated
     * @param playerId: string
     * @returns {Promise<object>}
     *********************/
    updateGame(gameId, gameData, playerId = null) {
        return new Promise ((resolve, reject) => {
            let errorObject = {
                type: '',
                message: ''
            };
            let updates = {};

            this.checkOnlineStatus(reject);

            // gameData contains keys (dataType) that are the same keys used in the DB
            for (let dataType in gameData) {
                if (gameData.hasOwnProperty(dataType)) {
                    if (playerId) {
                        updates[`/gameIdList/${gameId}/gameData/${dataType}/${playerId}`] = gameData[dataType];
                    } else if (dataType === 'isRunning') {
                        updates[`/gameIdList/${gameId}/isRunning`] = gameData[dataType];
                    } else {
                        updates[`/gameIdList/${gameId}/gameData/${dataType}`] = gameData[dataType];
                    }
                }
            }
            this.fbDatabase.ref().update(updates).then(() => {
                resolve(); //no data to return
            }).catch((error) => {
                errorObject.type = 'server-error';
                errorObject.message = error;
                reject(errorObject);
            });
        });
    }

    /*********************
     * updateUser
     *
     * @param playerId: string
     * @param params: object {string, any}
     * @returns {Promise<void>}
     *********************/
    updateUser(playerId, params) {
        return new Promise ((resolve, reject) => {
            let errorObject = {
                type: '',
                message: ''
            };
            let key = params.key;
            let value = params.value;

            this.checkOnlineStatus(reject);

            this.fbDatabase.ref(`/userIdList/${playerId}/${key}`).set(value).then(() => {
                resolve(); // success, no need to return anything
            }).catch((error) => {
                errorObject.type = 'server-error';
                errorObject.message = error;
                reject(errorObject);
            });
        });
    }

    getCardData() {

    }

    getBoardData(boardNames) {
        return new Promise ((resolve, reject) => {
            let errorObject = {
                type: '',
                message: ''
            };
            let boardData = {};

            this.checkOnlineStatus(reject);

            boardNames.forEach((name) => {
                this.fbDatabase.ref(`/board/${name}`).once('value').then((snapshot) => {
                    boardData[name] = snapshot.val();
                }).catch((error) => {
                    errorObject.type = 'server-error';
                    errorObject.message = error;
                    reject(errorObject);
                });
            });
            resolve(boardData);
        });
    }
}

export { FirebaseServices };
