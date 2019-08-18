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

    async getGameIdList() {
        if (this.isOnline) {
            await this.fbDatabase.ref('/gameIdList/').once('value', (snapshot) => {
                console.log('test', snapshot.val());
                return snapshot.val();
            });
        }
    }

    async addGame(userId, gameName) {
        let gameData = {
            creator: userId,
            name: gameName,
            playerCount: 1,
            playerIds: [userId],
            sets: []
        };
        let results = null;

        if (this.isOnline) {
            let newGameKey = this.fbDatabase.ref('/gameIdList/').push().key;
            let updates = {};

            updates['/gameIdList/' + newGameKey] = gameData;
            updates['/userIdList/' + userId + '/' + 'gameIds' + '/' + newGameKey] = gameData;

            await this.fbDatabase.ref().update(updates, this.completionCallback).then(() => {
                results = {gameData: gameData, gameId: newGameKey};
            });
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
    socket.on('create-game', async (userId, gameName) => {
        let results = await fbServices.addGame(userId, gameName);

        if (results.error) {
            console.log('Error adding game: ' + results.error);
        } else {
            console.log('Game ' + gameName + ' added by ' + userId);
            socket.emit('assigned-game', results.gameData);
        }
    });
}
