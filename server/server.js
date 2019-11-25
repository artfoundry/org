#! /usr/bin/env node

'use strict';

const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = 4000;
const admin = require("firebase-admin");
// Fetch the service account key JSON file contents
const serviceAccount = require("./org-board-25cea87fa1fa.json");

// const readline = require('readline');
// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
// });
// const url = require('url');
// const child_process = require('child_process');
// const fs = require('fs');
// const { parse } = require('querystring');

const MAX_PLAYER_COUNT = 4;

class FirebaseServices {
    constructor() {
        this.isOnline = this._initAuth();
        if (this.isOnline) {
            // As an admin, the app has access to read and write all data, regardless of Security Rules
            this.fbDatabase = admin.database();
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
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
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
                console.log('No connection with Firebase server');
                socket.emit('connect_error', 'No connection with Firebase server');
            }
        });
    }

    async login(userId, status) {
        let results = {
            online: null,
            error: null
        };
        if (this.isOnline) {
            await this.fbDatabase.ref(`/userIdList/${userId}/loggedIn`).set(status).then(() => {
                results.online = true;
            }).catch((error) => {
                results.error = error;
            });
            return results;
        }
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
            return results;
        }
    }

    async getGameIdList(userId) {
        let results = {
            data: null,
            error: null
        };
        if (this.isOnline) {
            await this.fbDatabase.ref('/gameIdList/').once('value').then((snapshot) => {
                let rawData = snapshot.val();
                // Only send back list of games that still have openings and in which user is not already playing
                results.data = rawData ?
                    Object.values(rawData).filter(game => {
                        return game.playerIds.length <= MAX_PLAYER_COUNT && !game.playerIds.includes(userId);
                    }) :
                    [];
            }).catch((error) => {
                results.error = error;
            });
            return results;
        }
    }

    async getGameInfo(gameId) {
        let results = {
            data: null,
            error: null
        };
        if (this.isOnline) {
            await this.fbDatabase.ref(`/gameIdList/${gameId}`).once('value').then((snapshot) => {
                results.data = snapshot.val();
                console.log('getGameInfo: ', snapshot.val())
            }).catch((error) => {
                results.error = error;
            });
            return results;
        }
    }

    async addGame(userId, gameName) {
        let gameData = {
            gameId: null,
            creator: userId,
            name: gameName,
            playerCount: 1,
            playerIds: [userId],
            sets: []
        };
        let results = {
            error: null,
            data: null
        };

        if (this.isOnline) {
            let newGameKey = this.fbDatabase.ref('/gameIdList/').push().key;
            let updates = {};

            gameData.gameId = newGameKey;
            updates[`/gameIdList/${newGameKey}/`] = gameData;
            updates[`/userIdList/${userId}/gameIds/${newGameKey}`] = gameData;

            await this.fbDatabase.ref().update(updates).then(() => {
                results.data = gameData;
            }).catch((error) => {
                results.error = error;
            });
            return results;
        }
    }

    async joinGame(userId, gameId) {
        let gameData = {
            gameId,
            creator: null,
            name: null,
            playerCount: null,
            playerIds: [],
            sets: []
        };
        let results = {
            error: null,
            data: null
        };

        if (this.isOnline) {
            let gameInfo = await this.getGameInfo(gameId);
            let updates = {};

            if (gameInfo.error) {
                results.error = gameInfo.error;
            } else {
                gameInfo.data.playerIds.push(userId);
                gameData.name = gameInfo.data.name;
                gameData.player = userId;
                gameData.playerIds = gameInfo.data.playerIds;
                gameData.playerCount = gameInfo.data.playerCount + 1;
                gameData.creator = gameInfo.data.creator;
                gameData.sets = gameInfo.data.sets || gameData.sets;

                updates[`/gameIdList/${gameId}/playerCount`] = gameData.playerCount;
                updates[`/gameIdList/${gameId}/playerIds`] = gameData.playerIds;
                updates[`/userIdList/${userId}/gameIds/${gameId}`] = gameData;

                await this.fbDatabase.ref().update(updates).then(() => {
                    results.data = gameData;
                }).catch((error) => {
                    results.error = error;
                });
            }

            return results;
        }
    }
}


(function() {
    const fbServices = new FirebaseServices();

    startServer(fbServices);
})();


function startServer(fbServices) {
    app.get('/', (req, res) => {
        res.send('Org backend server started');
    });

    http.listen(PORT, () => console.log(`Org server listening on port ${PORT}!`));

    // io.set('heartbeat timeout', 60000);
    // io.set('heartbeat interval', 25000);
    io.on('connection', (socket) => {
        console.log('connected to client');

        fbServices._monitorFbConnection(socket);

        initListeners(socket, fbServices);
        // socket.on('', () => {
        //     socket.emit('');
        // });
    });
    io.on('disconnect', () => {
        // fbServices.login(userId, false);
        console.log('disconnected');
    });

}

function initListeners(socket, fbServices) {
    console.log('listeners setup');
    socket.on('get-user', async (userId) => {
        let results = await fbServices.getUser(userId);

        if (results.error) {
            console.log('Error retrieving user info: ' + results.error);
        } else {
            console.log('Retrieved account info for ' + userId);
            socket.emit('userinfo', results.data);
        }
    });
    socket.on('create-game', async (userId, gameName) => {
        let results = await fbServices.addGame(userId, gameName);

        if (results.error) {
            console.log('Error adding game: ' + results.error);
        } else {
            console.log('Game ' + gameName + ' added by ' + userId);
            socket.emit('assigned-game', results.data);
        }
    });
    socket.on('join-game', async (userId, gameId) => {
        let results = await fbServices.joinGame(userId, gameId);

        if (results.error) {
            console.log('Error joining game: ' + results.error);
        } else {
            console.log(userId + ' joined ' + results.data.name);
            socket.emit('joined-game', results.data);
        }
    });
    socket.on('get-game-list', async (userId) => {
        let results = await fbServices.getGameIdList(userId);

        if (results.error) {
            console.log('Error retrieving game list: ' + results.error);
        } else {
            console.log('Game list retrieved');
            socket.emit('game-list-retrieved', results.data);
        }
    });
    socket.on('player-login', async (userId) => {
        let results = await fbServices.login(userId, true);

        if (results.error || !results.online) {
            console.log('Error logging in: ' + results.error);
            socket.emit('login-failed', results.error);
        } else {
            console.log(userId, ' logged in');
            socket.emit('login-successful');
        }
    });
}
