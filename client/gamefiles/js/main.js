'use strict';

/**
 * Org
 * Created by LCD Dreams on 4/14/18.
 *
 * Instantiates global objects and starts the app
 */

import {UI} from './ui.js';

const ORG_SERVER = 'http://localhost:4000';

let Org = {
    'gameSettings' : {
        audioOptions : {
            musicOn : true,
            soundOn : true
        }
    },
    'socket' : io(ORG_SERVER),
    'getUserId' : function() {
        // need info about getting jubal account id
        return 'testuser' + Math.round(Math.random() * 10);
    },
    'getAccountInfo' : function() {
        // need info about getting jubal account info
        return {accountInfo1: 'test info 1', accountInfo2: 'test info 2'}
    },
    'helpers' : new Helpers(),
    'platform' : '',
    'getOS' : function() {
        let platform = window.navigator.platform,
            // userAgent = window.navigator.userAgent,
            macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'],
            windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'],
            // iosPlatforms = ['iPhone', 'iPad', 'iPod'],
            os = null;

        if (macosPlatforms.indexOf(platform) !== -1) {
            os = 'Mac OS';
        } else if (windowsPlatforms.indexOf(platform) !== -1) {
            os = 'Windows';
        // } else if (!os && /Linux/.test(platform)) {
        //     os = 'Linux';
        // } else if (iosPlatforms.indexOf(platform) !== -1) {
        //     os = 'iOS';
        // } else if (/Android/.test(userAgent)) {
        //     os = 'Android';
        }
        return os;
    },
    'initialize' : function() {
        this.userId = this.getUserId();
        this.account = this.getAccountInfo();
        this.platform = this.getOS();
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });
        this.socket.on('connect-error', (error) => {
            console.log('Error connecting to server: ', error);
        });
        let player = new Player(this.userId, this.account, this.socket);
        // let audio = new Audio();
        let table = new Table(this.socket);
        let ui = new UI(player, table, this.helpers);
        // let eventsController = new EventsController(ui);

    }
};

$(Org.initialize());
