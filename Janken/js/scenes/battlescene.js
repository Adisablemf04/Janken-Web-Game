
import { decideRPS } from "../rules/rpsrules.js";

import {
    getGameData,
    startOrResumeMatch,
    saveRound,
    payRetry,
    resetRun
} from "../gameStorage.js";

export default class BattleScene extends Phaser.Scene {

    constructor() {
        super("BattleScene");
    }

    init(data) {
        this.level = data.level || 1;
    }

    create() {

        this.phase = "choose";
        this.playerScore = 0;
        this.npcScore = 0;

        // Darken the room during the battle
        this.add.rectangle(
            450, 300, 900, 600, 0x000000, 0.45
        );

        // Match scores
        this.scoreText = this.add.text(
            450, 65, "PLAYER 0 - 0 DEALER",
            {
                fontSize: "26px",
                fontFamily: "Arial",
                color: "#ff7185"
            }
        ).setOrigin(0.5);

        // Coin balance
        this.coinsText = this.add.text(
            775, 95, "COINS: 0",
            {
                fontSize: "18px",
                fontFamily: "Arial",
                color: "#ffd083"
            }
        ).setOrigin(0.5);

        // NPC dialogue box
        const dialogueBox = this.add.rectangle(
            450, 135, 430, 58, 0x190a10, 0.95
        );

        dialogueBox.setStrokeStyle(2, 0xb83c51);

        // NPC dialogue above the dealer
        this.npcDialogue = this.add.text(
            450, 135, "Choose wisely...",
            {
                fontSize: "18px",
                fontFamily: "Arial",
                color: "#f5ede4",
                align: "center",
                wordWrap: { width: 400 }
            }
        ).setOrigin(0.5);

        // Round result box
        const resultBox = this.add.rectangle(
            450, 355, 820, 125, 0x190a10, 0.92
        );

        resultBox.setStrokeStyle(2, 0x782738);

        // Round result text
        this.resultText = this.add.text(
            450, 355, "Choose your sign.",
            {
                fontSize: "24px",
                fontFamily: "Arial",
                color: "#f5ede4",
                align: "center",
                wordWrap: { width: 780 }
            }
        ).setOrigin(0.5);

        // Create RPS buttons
        const choices = ["Rock", "Paper", "Scissors"];
        const positions = [220, 450, 680];

        this.choiceButtons = [];

        choices.forEach((choice, index) => {

            const button = this.add.text(
                positions[index],
                520,
                choice.toUpperCase(),
                {
                    fontSize: "23px",
                    fontFamily: "Arial",
                    color: "#f5ede4",
                    backgroundColor: "#642233",
                    padding: {
                        x: 24,
                        y: 16
                    }
                }
            ).setOrigin(0.5);

            button.setInteractive({
                useHandCursor: true
            });

            button.on("pointerdown", () => {
                this.playRound(choice);
            });

            button.on("pointerover", () => {
                button.setBackgroundColor("#92364a");
            });

            button.on("pointerout", () => {
                button.setBackgroundColor("#642233");
            });

            this.choiceButtons.push(button);
        });

        // Continue, retry or return button
        this.continueButton = this.add.text(
            450, 520, "NEXT ROUND",
            {
                fontSize: "23px",
                fontFamily: "Arial",
                color: "#f5ede4",
                backgroundColor: "#642233",
                padding: {
                    x: 28,
                    y: 16
                }
            }
        ).setOrigin(0.5);

        this.continueButton.setInteractive({
            useHandCursor: true
        });

        this.continueButton.setVisible(false);

        this.continueButton.on("pointerdown", () => {
            this.handleContinue();
        });

        // Optional button to leave without paying
        this.leaveButton = this.add.text(
            450, 575, "LEAVE ROOM",
            {
                fontSize: "17px",
                fontFamily: "Arial",
                color: "#f5ede4",
                backgroundColor: "#38232b",
                padding: {
                    x: 18,
                    y: 10
                }
            }
        ).setOrigin(0.5);

        this.leaveButton.setInteractive({
            useHandCursor: true
        });

        this.leaveButton.setVisible(false);

        this.leaveButton.on("pointerdown", () => {
            this.returnToRoom();
        });

        // Load saved coins, scores and retry state
        this.setupBattle();
    }

    setupBattle() {

        const game = getGameData();

        if (!game) {
            this.showBlocked("No player is logged in.");
            return;
        }

        this.updateCoins(game);

        // Game Over takes priority
        if (game.isGameOver) {
            this.showGameOver();
            return;
        }

        // A previous loss requires payment
        if (game.pendingRetryLevels.includes(this.level)) {
            this.showRetryOffer();
            return;
        }

        try {

            // Start or restore the saved match
            const saved = startOrResumeMatch(this.level);

            this.playerScore =
                saved.activeMatch.playerScore;

            this.npcScore =
                saved.activeMatch.npcScore;

            this.updateScore();

            if (this.playerScore > 0 || this.npcScore > 0) {

                this.resultText.setText(
                    "Your previous match has been restored.\nChoose your next sign."
                );
            }

        } catch (error) {

            this.showBlocked(error.message);
        }
    }

    updateScore() {

        this.scoreText.setText(
            `PLAYER ${this.playerScore} - ${this.npcScore} DEALER`
        );
    }

    updateCoins(game) {

        this.coinsText.setText(
            `COINS: ${game.currentCoins}`
        );
    }

    showChoices(visible) {

        this.choiceButtons.forEach(button => {
            button.setVisible(visible);
        });
    }

    playRound(playerChoice) {

        // Only one choice is allowed per round
        if (this.phase !== "choose") {
            return;
        }

        // NPC selects randomly
        const choices = ["Rock", "Paper", "Scissors"];

        const npcChoice =
            Phaser.Utils.Array.GetRandom(choices);

        // Calculate the RPS result
        const result = decideRPS(
            playerChoice,
            npcChoice
        );

        let saved;

        try {

            // Save scores and coins in localStorage
            saved = saveRound(this.level, result);

        } catch (error) {

            this.showBlocked(error.message);
            return;
        }

        // Restore the latest scores from saved data
        this.playerScore =
            saved.roundScores.playerScore;

        this.npcScore =
            saved.roundScores.npcScore;

        this.updateScore();
        this.updateCoins(saved.game);

        // Display what both participants selected
        let roundMessage = "";
        let npcMessage = "";

        if (result === "player") {

            roundMessage = "YOU WON THE ROUND! +1 COIN";

            npcMessage =
                `I chose ${npcChoice}... lucky guess.`;
        }

        else if (result === "npc") {

            roundMessage = "THE DEALER WON THE ROUND!";

            npcMessage =
                `I chose ${npcChoice}. Your luck ends here.`;
        }

        else {

            roundMessage = "IT'S A TIE!";

            npcMessage =
                `I chose ${npcChoice}. Again.`;
        }

        this.npcDialogue.setText(npcMessage);

        this.resultText.setText(
            `YOU: ${playerChoice.toUpperCase()} | DEALER: ${npcChoice.toUpperCase()}\n${roundMessage}`
        );

        // Prevent further choices until next round
        this.showChoices(false);

        // Player completes the level
        if (saved.matchOutcome === "player") {

            this.phase = "finished";

            this.npcDialogue.setText(
                "Impossible... you defeated me."
            );

            this.resultText.setText(
                `LEVEL ${this.level} COMPLETED!\n+2 BONUS COINS!\nLEVEL ${this.level + 1} ${this.level < 4 ? "UNLOCKED!" : "FINISHED!"}`
            );

            this.continueButton.setText(
                "RETURN TO ROOM"
            );
        }

        // NPC wins the match
        else if (saved.matchOutcome === "npc") {

            if (saved.game.isGameOver) {

                this.showGameOver();
                return;
            }

            this.phase = "retry";

            this.npcDialogue.setText(
                "Your defeat comes at a price."
            );

            this.resultText.setText(
                "YOU LOST THE MATCH!\nPay 2 coins to retry this level."
            );

            this.continueButton.setText(
                "RETRY - 2 COINS"
            );

            this.leaveButton.setVisible(true);
        }

        // Neither player has reached 3 points
        else {

            this.phase = "continue";

            this.continueButton.setText(
                "NEXT ROUND"
            );
        }

        this.continueButton.setVisible(true);
    }

    showRetryOffer() {

        this.phase = "retry";

        this.showChoices(false);

        this.npcDialogue.setText(
            "Another chance will cost you."
        );

        this.resultText.setText(
            "YOU LOST THIS LEVEL.\nPay 2 coins to start another match."
        );

        this.continueButton.setText(
            "RETRY - 2 COINS"
        );

        this.continueButton.setVisible(true);
        this.leaveButton.setVisible(true);
    }

    showGameOver() {

        this.phase = "gameover";

        this.showChoices(false);

        this.npcDialogue.setText(
            "The gamble has ended."
        );

        this.resultText.setText(
            "GAME OVER\nYou cannot afford the 2-coin retry.\nStart a new run to try again."
        );

        this.continueButton.setText(
            "START NEW RUN"
        );

        this.continueButton.setVisible(true);
        this.leaveButton.setVisible(false);
    }

    showBlocked(message) {

        this.phase = "blocked";

        this.showChoices(false);

        this.npcDialogue.setText(
            "The dealer refuses your challenge."
        );

        this.resultText.setText(message);

        this.continueButton.setText(
            "RETURN TO ROOM"
        );

        this.continueButton.setVisible(true);
        this.leaveButton.setVisible(false);
    }

    handleContinue() {

        if (this.phase === "continue") {
            this.nextRound();
        }

        else if (this.phase === "finished") {
            this.returnToRoom();
        }

        else if (this.phase === "retry") {
            this.retryMatch();
        }

        else if (this.phase === "gameover") {
            this.startNewRun();
        }

        else if (this.phase === "blocked") {
            this.returnToRoom();
        }
    }

    nextRound() {

        this.phase = "choose";

        this.npcDialogue.setText(
            "What's your next move?"
        );

        this.resultText.setText(
            "Choose your next sign."
        );

        this.showChoices(true);

        this.continueButton.setVisible(false);
    }

    retryMatch() {

        try {

            // Payment and new match are saved together
            const game = payRetry(this.level);

            this.playerScore = 0;
            this.npcScore = 0;
            this.phase = "choose";

            this.updateScore();
            this.updateCoins(game);

            this.npcDialogue.setText(
                "Let's see if your luck has changed."
            );

            this.resultText.setText(
                "New match. Choose your sign."
            );

            this.showChoices(true);

            this.continueButton.setVisible(false);
            this.leaveButton.setVisible(false);

        } catch (error) {

            this.showBlocked(error.message);
        }
    }

    startNewRun() {

        try {

            resetRun();

            // Close the paused room
            this.scene.stop("RoomScene");

            // Restart from the outside environment
            this.scene.start("OutsideScene");

        } catch (error) {

            this.showBlocked(error.message);
        }
    }

    returnToRoom() {

        const room = this.scene.get("RoomScene");

        room.tableActivated = false;

        room.dialogue.setText(
            "Care for another gamble?"
        );

        room.prompt.setText(
            "Approach the table | ESC to leave"
        );

        this.scene.resume("RoomScene");

        this.scene.stop();
    }
}
