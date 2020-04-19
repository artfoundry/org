class Board {
    constructor(table) {
        this.table = table;
    }

    updateBoard(gameData, boardAction) {
        let $boardContent = $('#game-board-content');
        let $players = $('#players');

        switch(boardAction) {
            case 'join-game' || 'create-game' :
                $players.html('');
                gameData.playerIds.forEach((name) => {
                    $players.append(`<span class="player-box">${name}</span>`);
                });
                $boardContent.find("board-game-title").text(`Game: ${gameData.name}`);
                break;
            case 'exit-game' : $players.html('');
                break;
        }
    }

    updateOtherPlayer(userId, inGame) {

    }

    initBoardListeners(uiMessageCallback, playerIsCreator) {
        let $startButton = $('#game-board-start-button');

        if (playerIsCreator) {
            $startButton.show().click(() => {
                this.table.startGame(uiMessageCallback);
                $startButton.hide();
            });
        }
    }
}
