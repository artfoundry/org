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
    }

    _initAuth() {
        let initResult = true;

        // Initialize the app with a service account, granting admin privileges
        try {
            this.admin.initializeApp({
                credential: this.admin.credential.cert(this.serviceAccount),
                databaseURL: "https://org-board.firebaseio.com"
            });
        } catch (e) {
            alert('Unable to connect to the server. Reload the page to try again.');
            initResult = false;
        }

        return initResult;
    }

    _monitorFbConnection(socket) {
        let connectedRef = this.fbDatabase.ref('.info/connected');
        connectedRef.on('value', (snap) => {
            this.isOnline = snap.val();
            if (this.isOnline) {
                console.log('Connection with Firebase server is good')
            } else {
                console.log('No connection with Firebase server. Will keep trying...');
                socket.emit('connect_error', 'No connection with Firebase server. Will keep trying...');
            }
        });
    }

    login(userId, status, callback) {
        if (!this.isOnline) {
            return false;
        }
        this.fbDatabase.ref(`/userIdList/${userId}/loggedIn`).set(status, callback);
    }

    async getUser(userId) {
        let results = {
            data: null,
            error: null
        };

        if (this.isOnline) {
            await this.fbDatabase.ref(`/userIdList/${userId}`).once('value').then((snapshot) => {
                results.data = snapshot.val();
            }).catch((error) => {
                results.error = error;
            });
        } else {
            results.error = "Error: Lost connection with database. Please try again.";
        }

        return results;
    }

    /***************
     * getGameIdList
     * Request list of games that are still available to join for user (still open and user isn't already in it)
     *
     * @param userId: string
     * @returns {Promise<{data: object, error: string}>}
     **************/
    async getGameIdList(userId) {
        let results = {
            data: null,
            error: null
        };

        if (this.isOnline) {
            await this.fbDatabase.ref('/gameIdList/').once('value').then((snapshot) => {
                let rawData = snapshot.val();
                // Only send back list of games that still have openings and in which user is not already playing and that hasn't started yet
                let filteredList = (game => {
                    return game.playerIds.length <= MAX_PLAYER_COUNT && !game.playerIds.includes(userId) && !game.isRunning;
                });
                results.data = rawData ? Object.values(rawData).filter(filteredList) : [];
            }).catch((error) => {
                results.error = error;
            });
        } else {
            results.error = "Error: Lost connection with database. Please try again.";
        }

        return results;
    }

    async getGameInfo(gameId) {
        let results = {
            data: null,
            error: null
        };

        if (this.isOnline) {
            await this.fbDatabase.ref(`/gameIdList/${gameId}`).once('value').then((snapshot) => {
                results.data = snapshot.val();
            }).catch((error) => {
                results.error = error;
            });
        } else {
            results.error = "Error: Lost connection with database. Please try again.";
        }

        return results;
    }

    /***************
     * addGame
     * Game server requests FB server to add a new game with user as the creator.
     *
     * @param userId: string
     * @param gameName: string
     * @returns {Promise<{data: object, error: string}>}
     ****************/
    async addGame(userId, gameName) {
        let gameData = {
            gameId: null,
            creator: userId,
            name: gameName,
            playerCount: 1,
            playerIds: [userId],
            sets: [],
            isRunning: false
        };
        let results = {
            error: null,
            data: null
        };

        if (this.isOnline) {
            let gameId = this.fbDatabase.ref('/gameIdList/').push().key;
            let updates = {};

            gameData.gameId = gameId;
            updates[`/gameIdList/${gameId}`] = gameData;
            updates[`/userIdList/${userId}/gameIds/${gameId}`] = gameData;
            updates[`/userIdList/${userId}/inGame`] = gameId;

            await this.fbDatabase.ref().update(updates).then(() => {
                results.data = gameData;
            }).catch((error) => {
                results.error = error;
            });
        } else {
            results.error = "Error: Lost connection with database. Please try again.";
        }

        return results;
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
    async joinGame(userId, gameId) {
        let gameData = {
            gameId,
            creator: null,
            name: null,
            playerCount: null,
            playerIds: [],
            sets: [],
            currentPlayerTurn: ''
        };
        let results = {
            error: null,
            data: {}
        };

        if (this.isOnline) {
            let gameInfo = await this.getGameInfo(gameId);
            let updates = {};

            if (gameInfo.error) {
                results.error = gameInfo.error;
            } else {
                gameData.name = gameInfo.data.name;
                gameInfo.data.playerIds.push(userId);
                gameData.playerIds = gameInfo.data.playerIds;
                gameData.playerCount = gameInfo.data.playerCount + 1;
                gameData.creator = gameInfo.data.creator;
                gameData.sets = gameInfo.data.sets || gameData.sets;

                updates[`/gameIdList/${gameId}/playerCount`] = gameData.playerCount;
                updates[`/gameIdList/${gameId}/playerIds`] = gameData.playerIds;
                updates[`/userIdList/${userId}/gameIds/${gameId}`] = gameData;
                updates[`/userIdList/${userId}/inGame`] = gameId;

                await this.fbDatabase.ref().update(updates).then(() => {
                    results.data = gameData;
                }).catch((error) => {
                    results.error = error;
                });
            }
        } else {
            results.error = "Error: Lost connection with database. Please try again.";
        }

        return results;
    }

    /*********************
     * updateGame
     *
     * @param gameId: string
     * @param gameData: object of whatever data needs to be updated
     * @param playerId: string
     * @returns {Promise<void>}
     *********************/
    async updateGame(gameId, gameData, playerId = null) {
        let updates = {};

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

        await this.fbDatabase.ref().update(updates).then((results) => {
            return results;
        }).catch((error) => {
            return error;
        });
    }

    /*********************
     * updateUser
     *
     * @param playerId: string
     * @param gameId: string
     * @returns {Promise<void>}
     *********************/
// need to make this more general instead of just updating 'inGame'
    async updateUser(playerId, gameId) {
        let results = {
            error: "Error: Lost connection with database. Please try again."
        };

        if (this.isOnline) {
            await this.fbDatabase.ref(`/userIdList/${playerId}/inGame`).set(gameId).then(() => {
                // success, no need to return anything`
                results = null;
            }).catch((error) => {
                results.error = error;
            });
        }

        return results;
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
        this.disconnectMessage = "Error: Lost connection with database. Please try again.";
        this.logDisconnectMessage = `Error communicating with DB: ${this.disconnectMessage}`;
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
        this.socket.on('player-login', async (userId) => {
            let errorType = 'login-failed';
            let successLog = `${userId} logged in`;
            let successType = 'login-successful';
            let resultsCallback = (error) => {
                error ? this.emitResponse(errorType, errorMessage, errorLog) : this.emitResponse(successType, null, successLog);
            };

            let results = await this.fbServices.login(userId, true, resultsCallback);

            // if isOnline is false
            if (results === false) {
                this.emitResponse(errorType, this.disconnectMessage, this.logDisconnectMessage);
            }
        });
        this.socket.on('get-user', async (userId) => {
            let results = await this.fbServices.getUser(userId);

            if (results.error) {
                console.log(`Error retrieving user info: ${results.error}`);
            } else {
                console.log(`Retrieved account info for ${userId}`);
                this.socket.emit('userinfo', results.data);
            }
        });
        this.socket.on('create-game', async (userId, gameName) => {
            let results = await this.fbServices.addGame(userId, gameName);

            if (results.error) {
                console.log(`Error adding game: ${results.error}`);
            } else {
                console.log(`Game ${gameName} added by ${userId}`);
                this.socket.emit('assigned-game', results.data);
            }
        });
        this.socket.on('join-game', async (userId, gameId) => {
            let results = await this.fbServices.joinGame(userId, gameId);

            if (results.error) {
                console.log(`Error joining game: ${results.error}`);
            } else {
                console.log(userId + ' joined ' + results.data.name);
                this.socket.emit('joined-game', results.data);
            }
        });
        this.socket.on('load-game', async (userId, gameId) => {
            let results = {
                userInfo: await this.fbServices.updateUser(userId, gameId),
                gameInfo: await this.fbServices.getGameInfo(gameId)
            };

            if (results.userInfo && results.userInfo.error) {
                console.log(`Error rejoining game: ${results.userInfo.error}`);
            } else if (results.gameInfo.error) {
                console.log(`Error retrieving game info: ${results.gameInfo.error}`);
            } else {
                console.log(userId + ' has rejoined ' + results.gameInfo.data.name);
                let updateData = {
                    userId: userId,
                    update: {
                        gameId,
                        inGame: true
                    }
                };
                this.socket.emit('joined-game', results.gameInfo.data);
                this.socket.emit('other-player-joined', updateData);
            }
        });
        this.socket.on('get-game-list', async (userId) => {
            let results = await this.fbServices.getGameIdList(userId);

            if (results.error) {
                console.log(`Error retrieving game list: ${results.error}`);
            } else {
                console.log('Game list retrieved');
                this.socket.emit('game-list-retrieved', results.data);
            }
        });

        // game listeners
        this.socket.on('start-game', (gameId) => {
            this.startGame(gameId);
        });
    }

    emitResponse(type, message, logMessage) {
        console.log(logMessage);
        message ? this.socket.emit(type, message) : this.socket.emit(type);
    }

    async startGame(gameId) {
        let gameInfo = await this.fbServices.getGameInfo(gameId);

        await this.fbServices.updateGame(gameId, {isRunning: true});
        this.gameSetup(gameId, gameInfo.data);
        this.startTurnController(gameId, gameInfo.data);
        this.socket.emit('game-starting');
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

        playersIdList.forEach(async (playerId) => {
            await this.giveInfluenceTokens(gameId, playerId, startingInfluenceTokens).then(() => {
                this.socket.emit('game-message', `${playerId} has received ${startingInfluenceTokens} Influence Tokens`);
            }).catch((error) => {
                this.socket.emit('server-error', error);
                console.log(`Error communicating with DB: ${error}`);
            });
        });
    }

    async giveInfluenceTokens(gameId, playerId, influenceTokens) {
        let gameData = {influenceTokens};

        if (this.fbServices.isOnline) {
            await this.fbServices.updateGame(gameId, gameData, playerId).then((results) => {
                return results;
            });
        } else {
            this.emitResponse('server-error', this.disconnectMessage, this.logDisconnectMessage);
        }
    }



}


(function() {
    const fbServices = new FirebaseServices();
    const gameServer = new GameServer(fbServices);

    gameServer.loadComms();
})();
