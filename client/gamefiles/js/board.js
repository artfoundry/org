class Board {
    constructor(table) {
        this.table = table;
    }

    updateBoard(gameData, boardAction) {
        let $boardContent = $('#board-content');
        let $players = $('#players');

        switch (boardAction) {
            case 'load-game' :
                $players.html('');
                gameData.playerIds.forEach((name) => {
                    $players.append(`<span class="player-box">${name}</span>`);
                });
                $boardContent.find("#board-gametitle").text(`Game: ${gameData.name}`);
                break;
            case 'exit-game' : $players.html('');
                break;
        }
    }

    updateOtherPlayer(userId, inGame) {

    }

    initBoardListeners(uiMessageCallback, playerIsCreator, isRunning) {
        let $startButton = $('#board-start-button');

        if (playerIsCreator && !isRunning) {
            $startButton.show().click(() => {
                this.table.startGame(uiMessageCallback);
                $startButton.hide();
            });
        }
    }
}
