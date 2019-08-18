class Table {
    constructor(socket) {
        this.socket = socket;
        this.game = null;
    }

    // player: obj from player.js
    createGame(player, gameName, callback) {
        this.socket.on('assigned-game', (gameData) => {
            let eventDetails = {data: gameData, callback: callback};
            let gameCreated = new CustomEvent('update-ui', {detail: eventDetails});
            window.dispatchEvent(gameCreated);
        });

        this.socket.emit('create-game', player.userId, gameName);
    }

    // player: obj from player.js
    joinGame(player) {
        console.log(player.userId + ' joined game');
    }

}
