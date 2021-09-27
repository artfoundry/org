'use strict';

import FirebaseAdmin from 'firebase-admin';
import FirebaseAccount from './org-board-eff5da155b1b.js';
import { FirebaseServices } from './modules/firebase-services.js';
import Express from 'express';
import SocketIO from 'socket.io';
import * as http from 'http';
import { GameServer } from './modules/game-server.js';
import { GlobalData } from './modules/global-data.js';
const fbServices = new FirebaseServices(FirebaseAdmin, FirebaseAccount, GlobalData);
const gameServer = new GameServer(fbServices, Express, http, SocketIO);

gameServer.loadComms();
