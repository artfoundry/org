#! /usr/bin/env node

'use strict';

const server = require('http').createServer(httpFileHandler);
const io = require('socket.io')(server);
// const readline = require('readline');
// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
// });
const url = require('url');
const child_process = require('child_process');
const fs = require('fs');
const { parse } = require('querystring');
const PORT = 3000;
let gWatcher = null;

(function() {
    init();
})();

function init() {
    process.argv.forEach((val, index) => {
        if (index > 1) {

        }
    });
    if (gOptionsFormData.length > 0) {
        runAlfred();
    } else {
        startServer();
    }
}

function startServer() {
    server.listen(PORT);
    io.set('heartbeat timeout', 60000);
    io.set('heartbeat interval', 25000);
    io.on('connection', (socket) => {
        console.log('connected to client');

        socket.on('open log', (path) => {
            let text = fs.readFileSync(path, 'utf8');
            if (text) {
                console.log('displaying maintenance log');
                socket.emit('display error log', text);
            }
        });

    });
    io.on('disconnect', () => {
        if (gWatcher) gWatcher.close();
    });
}
