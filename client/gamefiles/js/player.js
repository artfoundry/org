class Player {
    constructor(userId, socket) {
        this.userId = userId;
        this.socket = socket;
        this.userInfo = null;
    }

    getInfo() {
        this.socket.on('userinfo', (data) => {
            this.userInfo = data;
            return this.userInfo;
        });
        this.socket.emit('get-user', this.userId);
    }
}
