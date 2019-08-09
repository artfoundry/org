class Table {
    constructor(socket) {
        this.socket = socket;
        this.game = null;
    }

    // player: obj from player.js
    createGame(player) {
        this.socket.on('assigned-game', (gameId) => {
            this.game = {
                'player0' : player,
                'gameId' : gameId
            };
            let updateEvent = new Event('display-game', {detail: this.game});
            window.dispatchEvent(updateEvent);
        });
        this.socket.emit('create-game', player.userId);
    }

    // player: obj from player.js
    joinGame(player) {
        console.log(player.userId + ' joined game');
    }

}
