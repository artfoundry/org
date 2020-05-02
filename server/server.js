#! /usr/bin/env node

'use strict';

const MAX_PLAYER_COUNT = 5;

class FirebaseServices {
    constructor() {
        this.admin = require("firebase-admin");
        // Fetch the service account key JSON file contents
        this.serviceAccount = require("./org-board-25cea87fa1fa.json");
        this.isOnline = this._initAuth();
        if (this.isOnline) {
            // As an admin, the app has access to read and write all data, regardless of Security Rules
            this.fbDatabase = this.admin.database();
            this.ref = this.fbDatabase.ref("restricted_access/secret_document");
            this.ref.once("value", function(snapshot) {
                console.log(snapshot.val());
            });
        }
        this.connectionErrorString = 'Error: Lost connection with database. Please try again.';
    }

    _initAuth() {
        let initResult = true;

        // Initialize the app with a service account, granting admin privileges
        try {
            this.admin.initializeApp({
                credential: this.admin.credential.cert(this.serviceAccount),
                databaseURL: "https://org-board.firebaseio.com"
            });
        } catch (error) {
            alert(`Unable to connect to the server. Reload the page to try again.\n${error}`);
            initResult = false;
        }

        return initResult;
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
                    // Only send back list of user is playing
                    filteredList = ((game) => {
                        return game.playerIds.includes(userId);
                    });
                } else {
                    // Only send back list of games that still have openings and in which user is not already playing and that hasn't started yet
                    filteredList = ((game) => {
                        return game.playerIds.length < MAX_PLAYER_COUNT && !game.playerIds.includes(userId) && !game.isRunning;
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
     * @returns {Promise<object>}
     ****************/
    createGame(userId, gameName) {
        return new Promise ((resolve, reject) => {
            let gameData = {
                gameId: null,
                creator: userId,
                name: gameName,
                playerCount: 1,
                playerIds: [userId],
                sets: [],
                isRunning: false
            };
            let errorObject = {
                type: '',
                message: ''
            };
            let userGameList;
            let gameId;
            let updates = {};

            this.checkOnlineStatus(reject);

            this.getUser(userId).then((userInfo) => {
                userGameList = userInfo.gameIds || [];
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
}


class GameServer {
    constructor(fbServices) {
        this.fbServices = fbServices;
        this.app = require('express')();
        this.http = require('http').createServer(this.app);
        this.io = require('socket.io')(this.http);
        this.socket = null;
        this.port = 4000;
        this.gameTurns = 10;
    }

    /*************
     * loadComms
     * Starts Express game server, http port listening, io listening, and io socket for communicating with client.
     ************/
    loadComms() {
        this.app.get('/', (req, res) => {
            res.send('Org backend server started');
        });

        this.http.listen(this.port, () => console.log(`Org server listening on port ${this.port}!`));

        this.io.on('connection', (socket) => {
            console.log('connected to client');

            this.socket = socket;
            this.fbServices._monitorFbConnection(this.socket);

            this.initListeners();
        });
        this.io.on('disconnect', () => {
            // this.fbServices.login(userId, false);
            console.log('disconnected');
        });
    }

    initListeners() {
        console.log('listeners setup');

        // lobby listeners
        this.socket.on('player-login', (userId) => {
            let logMessage = '';

            this.fbServices.login(userId, true).then(() => {
                logMessage = `${userId} logged in`;
                this.emitResponse('login-successful', null, logMessage);
            }).catch((error) => {
                logMessage = `${userId} login failed. Error: ${error.message}`;
                this.emitResponse(error.type, error.message, logMessage);
            });
        });
        this.socket.on('get-user', (userId) => {
            let logMessage = '';
            this.fbServices.getUser(userId).then((results) => {
                logMessage = `Retrieved account info for ${userId}`;
                this.emitResponse('user-info', results, logMessage);
            }).catch((error) => {
                logMessage = `Error retrieving user info: ${error.message}`;
                this.emitResponse(error.type, error.message, logMessage);
            });
        });
        this.socket.on('create-game', (userId, gameName) => {
            let logMessage = '';
            this.fbServices.createGame(userId, gameName).then((results) => {
                logMessage = `Game ${gameName} created by ${userId}`;
                this.emitResponse('created-game', results, logMessage);
            }).catch((error) => {
                logMessage = `Error creating game: ${error.message}`;
                this.emitResponse(error.type, error.message, logMessage);
            });
        });
        this.socket.on('join-game', (userId, gameId) => {
            let logMessage = '';
            this.fbServices.joinGame(userId, gameId).then((results) => {
                let updateData = {
                    userId: userId,
                    gameId,
                    name: results.name
                };
                logMessage = userId + ' joined ' + results.name;
                this.emitResponse('joined-game', results, logMessage);
                logMessage = 'Message broadcasted to other players';
                this.emitResponse('other-joined-game', updateData, logMessage);
            }).catch((error) => {
                logMessage = `Error joining game: ${error.message}`;
                this.emitResponse(error.type, error.message, logMessage);
            });
        });
        this.socket.on('load-game', (userId, gameId) => {
            let gameInfo;
            let logMessage = '';

            this.fbServices.getGameInfo(gameId).then((gameData) => {
                gameInfo = gameData;
            }).then(() => {
                let params = {key: 'inGame', value: gameId};

                this.fbServices.updateUser(userId, params).catch((error) => {
                    logMessage = `Error updating user info: ${error.message}`;
                    this.emitResponse(error.type, error.message, logMessage);
                });
            }).then(() => {
                logMessage = `${userId} has rejoined ${gameInfo.name}`;
                this.emitResponse('joined-game', gameInfo, logMessage);
            }).catch((error) => {
                logMessage = `Error retrieving game info: ${error.message}`;
                this.emitResponse(error.type, error.message, logMessage);
            });
        });
        this.socket.on('get-game-list', (userId) => {
            let logMessage = '';
            this.fbServices.getGameList(userId, false).then((results) => {
                logMessage = 'Game list retrieved';
                this.emitResponse('game-list-retrieved', results, logMessage);
            }).catch((error) => {
                logMessage = `Error retrieving game list: ${error.message}`;
                this.emitResponse(error.type, error.message, logMessage);
            });
        });

        // game listeners
        this.socket.on('start-game', (gameId) => {
            this.startGame(gameId);
        });
    }

    emitResponse(type, message, logMessage) {
        console.log(new Date() + ': ' + (logMessage || message));
        this.socket.emit(type, message);
    }

    startGame(gameId) {
        let logMessage = '';
        let gameInfo;

        this.fbServices.getGameInfo(gameId).then((gameData) => {
            gameInfo = gameData;
            this.fbServices.updateGame(gameId, {isRunning: true}).catch((error) => {
                logMessage = `Error updating game info while trying to start game: ${error.message}`;
                this.emitResponse(error.type, error.message, logMessage);
            });
        }).then(() => {
            this.gameSetup(gameId, gameInfo);
            this.startTurnController(gameId, gameInfo);
            logMessage = `${gameId} is starting`;
            this.emitResponse('game-starting', null, logMessage);
        }).catch((error) => {
            logMessage = `Error retrieving game info while trying to start game: ${error.message}`;
            this.emitResponse(error.type, error.message, logMessage);
        });
    }

    startTurnController(gameId, gameInfo) {
        let playersIdList = gameInfo.playerIds;

        for (let turn = 1; turn <= 10; turn++) {
            playersIdList.forEach((playerId) => {

            });
        }
    }

    gameSetup(gameId, gameInfo) {
        let playersIdList = gameInfo.playerIds;
        let startingInfluenceTokens = 3;

        playersIdList.forEach((playerId) => {
            this.giveInfluenceTokens(gameId, playerId, startingInfluenceTokens);
        });
    }

    giveInfluenceTokens(gameId, playerId, influenceTokens) {
        let gameData = {influenceTokens};
        let message = '';

        this.fbServices.updateGame(gameId, gameData, playerId).then(() => {
            message = `${playerId} has received ${influenceTokens} Influence Tokens`;
            this.emitResponse('game-message', message);
        }).catch((error) => {
            message = `Error updating game info while trying to give out tokens: ${error.message}`;
            this.emitResponse(error.type, error.message, message);
        });
    }



}

(function() {
    const fbServices = new FirebaseServices();
    const gameServer = new GameServer(fbServices);

    gameServer.loadComms();
})();
