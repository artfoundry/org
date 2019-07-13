#! /usr/bin/env node

'use strict';

const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const FirebaseServices = require('js/firebase');
const PORT = 3000;

// const readline = require('readline');
// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
// });
// const server = require('http').createServer(httpFileHandler);
// const io = require('socket.io')(server);
// const url = require('url');
// const child_process = require('child_process');
// const fs = require('fs');
// const { parse } = require('querystring');
// let gWatcher = null;

(function() {
    init();
})();

function init() {
    // process.argv.forEach((val, index) => {
    //     if (index > 1) {
    //
    //     }
    // });
    let fbServices = {};
    if (!fbServices.isOnline)
        fbServices = new FirebaseServices();
    startServer();
}

function startServer() {
    app.get('/', (req, res) => {
    //     res.sendFile(__dirname + '/gamefiles/index.html');
        res.send('Org server started');
    });

    http.listen(PORT, () => console.log(`Org server listening on port ${PORT}!`));

    // io.set('heartbeat timeout', 60000);
    // io.set('heartbeat interval', 25000);
    io.on('connection', (socket) => {
        console.log('connected to client');

        // socket.on('', () => {
        //     socket.emit('');
        // });

    });
    io.on('disconnect', () => {
        console.log('disconnected');
    });
}
