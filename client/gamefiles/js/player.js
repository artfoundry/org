class Player {
    constructor(userId, socket) {
        this.userId = userId;
        this.socket = socket;
        this.userInfo = null;

        this.playerLogin();
    }

    playerLogin() {
        let eventDetails = {
            callback: 'postMessage',
            data: {
                messageType: null,
                messageDetails: null,
                gameData: {
                    player: this.userId
                }
            }
        };
        let event = new CustomEvent('update-ui', {detail: eventDetails});

        this.socket.on('login-successful', () => {
            event.detail.data.messageType = 'login';

            window.dispatchEvent(event);
        });
        this.socket.on('login-failed', (response)=> {
            event.detail.data.messageType = 'login-failed';
            event.detail.data.messageDetails = response;

            window.dispatchEvent(event);
        });

        this.socket.emit('player-login', this.userId);
    }

    getInfo(callback) {
        this.socket.on('userinfo', (data) => {
            this.userInfo = data;

            // this should go in UI as a separate function
            let content = '<div>Games:</div>';
            for (let id in this.userInfo.gameIds) {
                if (this.userInfo.gameIds.hasOwnProperty(id)) {
                    content += `<div>${this.userInfo.gameIds[id].name}</div>`;
                }
            }

            callback(content);
        });
        this.socket.emit('get-user', this.userId);
    }
}
