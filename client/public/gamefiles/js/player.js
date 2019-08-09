class Player {
    constructor(userId, socket) {
        this.userId = userId;
        this.userInfo = {};
        this.socket = socket;
    }

    getInfo(callback) {
        this.socket.on('userinfo', (data) => {
            this.userInfo = data;
            callback(this.userInfo);
        });
        this.socket.emit('get-user', this.userId);
    }
}
