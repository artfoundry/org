class Table {
    constructor(socket) {
        this.socket = socket;
        this.game = null;
    }

    // player: obj from player.js
    createGame(player, gameName) {
        this.socket.on('assigned-game', (gameData) => {
            let gameCreated = new CustomEvent('display-game', {detail: gameData});
            window.dispatchEvent(gameCreated);
        });

        this.socket.emit('create-game', player.userId, gameName);
    }

    // player: obj from player.js
    joinGame(player) {
        console.log(player.userId + ' joined game');
    }

}
