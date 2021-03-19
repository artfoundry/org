// Retrieves and stores player data from server
class Player {
    constructor(userId, accountInfo, socket) {
        this.userId = userId;
        this.socket = socket;
        this.userInfo = {
            loggedIn: false,
            account: accountInfo,
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

    getInfo() {
        return new Promise((resolve, reject) => {
            this.socket.on('user-info', (data) => {
                if (data) {
                    this.userInfo.loggedIn = data.loggedIn;
                    if (data.gameIds) {
                        this.userInfo.gameIds = data.gameIds;
                        this.userInfo.games = data.games;
                    } else {
                        this.userInfo.gameIds = [];
                        this.userInfo.games = [];
                    }
                    this.socket.off('user-info');
                    resolve(this.userInfo);
                } else {
                    reject();
                }
            });
            this.socket.emit('get-user', this.userId);
        });
    }

    buyAddon(callback) {

    }
}
