#! /usr/bin/env node

'use strict';

const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = 3000;
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
            this._monitorConnection();
        }
        this.completionCallback = (error) => {
            if (error) {
                return {'error' : error};
            } else {
                return true;
            }
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

    _monitorConnection() {
        let connectedRef = this.fbDatabase.ref(".info/connected");
        connectedRef.on("value", (snap) => {
            this.isOnline = snap.val();
            this.isOnline ? console.log("Connection with Firebase server is good") : console.log("No connection with Firebase server");
        });
    }

    async getUser(userId) {
        return userId + ': userinfo';
    }

    getGameIdList() {
        if (this.isOnline) {
            this.fbDatabase.ref('/gameIdList/').once('value', (snapshot) => {
                return snapshot.val();
            });
        }
    }

    async addGame(userId, gameIdList) {
        let gameAddStatus = {
            newGameId: null,
            listUpdated: null,
            gameAdded: null
        };

        if (this.isOnline) {
            gameAddStatus.newGameId = gameIdList ? gameIdList[gameIdList.length - 1] + 1 : 1;
            gameAddStatus.listUpdated = await this.fbDatabase.ref('/gameIdList/' + gameAddStatus.newGameId).set(userId, this.completionCallback);
            gameAddStatus.gameAdded = await this.fbDatabase.ref('/userIdList/' + userId + '/' + 'gameIds' + '/').push(gameAddStatus.newGameId, this.completionCallback);
        }
        return gameAddStatus;
    }
}


(function() {
    const fbServices = new FirebaseServices();

    startServer(fbServices);

})();


function startServer(fbServices) {
    app.get('/', (req, res) => {
        res.send('Org server started');
    });

    http.listen(PORT, () => console.log(`Org server listening on port ${PORT}!`));

    // io.set('heartbeat timeout', 60000);
    // io.set('heartbeat interval', 25000);
    io.on('connection', (socket) => {
        console.log('connected to client');

        initListeners(socket, fbServices);
        // socket.on('', () => {
        //     socket.emit('');
        // });
    });
    io.on('disconnect', () => {
        console.log('disconnected');
    });

}

function initListeners(socket, fbServices) {
    console.log('listeners setup');
    socket.on('get-user', (userId) => {
        let userInfo = fbServices.getUser(userId);

        console.log('getting user info');
        socket.emit('userinfo', userInfo);
    });
    socket.on('create-game', async (userId) => {
        let gameIdList = await fbServices.getGameIdList();
        let results = await fbServices.addGame(userId, gameIdList);

        if (results.listUpdated !== true) {
            console.log('Error updating game list: ' + results.listUpdated.error);
        }
        if (results.gameAdded === true) {
            console.log('Game ' + results.gameId + ' added by ' + userId);
            socket.emit('assigned-game', gameId);
        } else {
            console.log('Error adding game: ' + results.gameAdded.error);
        }
    });
}
