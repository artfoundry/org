class Board {
    constructor() {
        this.board = null;
    }

    updateBoard(gameData) {
        let $boardContent = $('#game-board-content');
        let $players = $('#players');

        gameData.playerIds.forEach((name) => {
            $players.append(`<span class="player-box">${name}</span>`);
        });
        $boardContent.append(`<div class="board-game-title">Game: ${gameData.name}</div>`);
    }
}
