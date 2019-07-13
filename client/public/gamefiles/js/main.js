'use strict';

/**
 * Org
 * Created by LCD Dreams on 4/14/18.
 *
 * Instantiates global objects and starts the app
 */

const ORG_SERVER = 'http://localhost:3000';

let Game = {
    'gameSettings' : {
        audioOptions : {
            musicOn : true,
            soundOn : true
        }
    },
    'socket' : io(ORG_SERVER),
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
        this.platform = this.getOS();
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });
        let audio = new Audio();
        let events = new Events();
        let ui = new UI(audio, events);
        let table = new Table();
        let players = {};
        let turnController = new TurnController(ui, players, events, table);

        ui.initialize();
        turnController.initialize();
    }
};

$(Game.initialize());
