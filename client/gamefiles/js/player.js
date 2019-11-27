class Player {
    constructor(userId, socket) {
        this.userId = userId;
        this.socket = socket;
        this.userInfo = {
            loggedIn: false,
            gameIds: []
        };
    }

    playerLogin(callback) {
        let data = {
            messageType: '',
            messageDetails: null,
            gameData: {
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
        this.socket.on('userinfo', (data) => {
            this.userInfo.loggedIn = data.loggedIn;
            if (data.gameIds) {
                this.userInfo.gameIds = data.gameIds;
            }
            callback(this.userInfo);
        });
        this.socket.emit('get-user', this.userId);
    }
}
