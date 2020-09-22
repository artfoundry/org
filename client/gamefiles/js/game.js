class Game {
    constructor(table) {
        this.table = table;
        this.cards = null;
    }

    setupGame() {
        for (let world in this.table.gameBoards) {
            if (this.table.gameBoards.hasOwnProperty(world)) {
                this.placeWorld(world, this.table.gameBoards[world]);
            }
        }
    }

    clearGame() {
        $('#game-title').html('');
        $('#game-collected-influence').html('');
        $('#game-boards').html('');
        $('#players').html('');
    }

    placeWorld(worldName, worldInfo) {
        let $worldsContainer = $('#game-boards');
        let $newWorld = $(document.createElement('div'));

        $newWorld.text(worldName).addClass('world').attr('id', `world-${worldName.toLowerCase()}`);
        $worldsContainer.append($newWorld);
    }

    storeCards(cardData) {
        this.cards = cardData;
    }

    updateGame(gameData, boardAction) {
        let $gameContent = $('#game-content');

        switch (boardAction) {
            case 'load-game' :
                this.clearGame();
                this.setupGame();
                let $players = $('#players');
                gameData.playerIds.forEach((name) => {
                    $players.append(`<span>${name} </span>`);
                });
                $gameContent.find('#game-title').text(`Game: ${gameData.name}`);
                break;
            case 'exit-game' : this.clearGame();
                break;
        }
    }

    updateOtherPlayer(userId, inGame) {

    }

    initGameListeners(uiMessageCallback, playerIsCreator, isRunning) {
        let $startButton = $('#game-start-button');

        if (playerIsCreator && !isRunning) {
            $startButton.show().click(() => {
                this.table.startGame(this, uiMessageCallback);
                $startButton.hide();
            });
        }
    }
}

export { Game };
