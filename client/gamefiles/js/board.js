class Board {
    constructor(table) {
        this.table = table;

        this.setupBoard();
    }

    setupBoard() {
        this.table.gameBoardNames.forEach((world) => {
            this.placeWorld(world);
        });
    }

    placeWorld(world) {
        let $worldsContainer = $('#board-worlds');
        let $newWorld = $(document.createElement('div'));

        $newWorld.text(world).addClass('world').attr('id', `world-${world.toLowerCase()}`);
        $worldsContainer.append($newWorld);
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

export { Board };
