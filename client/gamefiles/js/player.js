class Player {
    constructor(userId, socket) {
        this.userId = userId;
        this.socket = socket;
        this.userInfo = {
            loggedIn: false,
            inGame: false,
            gameIds: [],
            games: []
        };
    }

    playerLogin(callback) {
        let data = {
            messageType: '',
            messageDetails: null,
            updateData: {
                player: this.userId
            }
        };

        this.socket.on('login-successful', () => {
            data.messageType = 'login';
            callback(data);
        });
        this.socket.on('login-failed', (response)=> {
            data.messageType = 'login-failed';
            data.messageDetails = response;
            callback(data);
        });

        this.socket.emit('player-login', this.userId);
    }

    getInfo(callback) {
        this.socket.on('user-info', (data) => {
            this.userInfo.loggedIn = data.loggedIn;
            if (data.gameIds) {
                this.userInfo.gameIds = data.gameIds;
                this.userInfo.games = data.games;
            }
            this.socket.off('user-info');
            callback();
        });
        this.socket.emit('get-user', this.userId);
    }

    buyAddon(callback) {

    }
}
