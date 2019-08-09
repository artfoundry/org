class Player {
    constructor(userId, socket) {
        this.user = {
            'userId'    : userId,
            'userInfo'  : {}
        };
        this.socket = socket;
    }

    getInfo(callback) {
        this.socket.on('userinfo', (data) => {
            this.user.userInfo = data;
            callback(this.user.userInfo);
        });
        this.socket.emit('get-user', this.user.userId);
    }
}
