/**
 * Org
 * Created by LCD Dreams on 4/14/18.
 *
 * Instantiates global objects and starts the app
 */

let Game = {
    'initialGame' : true,
    'gameSettings' : {
        audioOptions : {
            musicOn : true,
            soundOn : true
        }
    },
    'fbServices' : {},
    'helpers' : new Helpers(),
    'platform' : '',
    'getOS' : function() {
        let userAgent = window.navigator.userAgent,
            platform = window.navigator.platform,
            macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'],
            windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'],
            iosPlatforms = ['iPhone', 'iPad', 'iPod'],
            os = null;

        if (macosPlatforms.indexOf(platform) !== -1) {
            os = 'Mac OS';
        } else if (iosPlatforms.indexOf(platform) !== -1) {
            os = 'iOS';
        } else if (windowsPlatforms.indexOf(platform) !== -1) {
            os = 'Windows';
        } else if (/Android/.test(userAgent)) {
            os = 'Android';
        } else if (!os && /Linux/.test(platform)) {
            os = 'Linux';
        }

        return (os === 'iOS' || os === 'Android') ? 'mobile' : 'desktop';
    },
    'initialize' : function() {
        if (this.initialGame) {
            this.platform = this.getOS();
            this.initialGame = false;
        }
        if (!this.fbServices.isOnline)
            this.fbServices = new FirebaseServices();
        let audio = new Audio();
        let events = new Events();
        let ui = new UI(audio, events);
        let table = new Table();
        if (!this.initialGame)
            table.clear();

        let players = {};

        let turnController = new TurnController(ui, players, events, table);

        ui.initialize();
        turnController.initialize();
    }
};

$(Game.initialize());
