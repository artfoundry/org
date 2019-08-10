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
    'getUserId' : function() {
        // need info about jubal account
        return 'testuser';
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
        this.platform = this.getOS();
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });
        let player = new Player(this.userId, this.socket);
        let audio = new Audio();
        let table = new Table(this.socket);
        let ui = new UI(player, table, audio);
        let eventsController = new EventsController(ui);
        let players = {};
        let turnController = new TurnController(ui, players, eventsController, table);

    }
};

$(Game.initialize());
