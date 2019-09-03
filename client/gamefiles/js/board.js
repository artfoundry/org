class Board {
    constructor() {
        this.board = null;
    }

    updateBoard(gameData) {
        let $boardContent = $('#game-board-content');

        $boardContent.text(gameData);
    }
}
