#! /usr/bin/env node

'use strict';

require('babel-register')({
    presets: ['env']
});

const { FirebaseServices } = require('./modules/firebase-services');
const { GameServer } = require('./modules/game-server');

(function() {
    const GlobalData = require('./modules/data');
    const fbServices = new FirebaseServices(GlobalData);
    const gameServer = new GameServer(fbServices);

    gameServer.loadComms();
})();
