import { startOrResumeLevel3, playThreeWay, playLevel3Duel } from "../level3storage.js";
import { getGameData, payRetry, resetRun } from "../gameStorage.js";

export default class Level3Scene extends Phaser.Scene {
    constructor() {
        super("Level3Scene");
    }

    create() {
        this.phase = "choose";
        this.add.rectangle(450, 300, 900, 600, 0x000000, 0.45);

        // Three separate score boxes
        this.scoreValues = [
            { name: "PLAYER", x: 165 },
            { name: "NPC 1", x: 450 },
            { name: "NPC 2", x: 735 }
        ].map(({ name, x }) => {
            this.add.rectangle(x, 218, 185, 60, 0x190a10, 0.95)
                .setStrokeStyle(2, 0xb83c51);
            this.add.text(x, 205, name, {
                fontSize: "16px", color: "#f5ede4"
            }).setOrigin(0.5);
            return this.add.text(x, 231, "0", {
                fontSize: "26px", color: "#ff7185"
            }).setOrigin(0.5);
        });

        this.coinsText = this.add.text(775, 85, "COINS: 0", {
            fontSize: "18px", color: "#ffd083"
        }).setOrigin(0.5);

        // NPC speech bubbles
        this.npcDialogues = [310, 590].map((x, i) => {
            this.add.rectangle(x, 135, 235, 55, 0x190a10, 0.95)
                .setStrokeStyle(2, 0xb83c51);
            return this.add.text(x, 135, `NPC ${i + 1}: Ready.`, {
                fontSize: "16px", color: "#f5ede4",
                align: "center", wordWrap: { width: 220 }
            }).setOrigin(0.5);
        });

        this.add.rectangle(450, 345, 820, 145, 0x190a10, 0.92)
            .setStrokeStyle(2, 0x782738);
        this.resultText = this.add.text(450, 345,
            "All three participants must choose a sign.", {
                fontSize: "22px", color: "#f5ede4",
                align: "center", wordWrap: { width: 780 }
            }).setOrigin(0.5);

        // Choice and action buttons
        this.choiceButtons = ["Rock", "Paper", "Scissors"].map((sign, i) => {
            const button = this.makeButton(220 + i * 230, 520, sign.toUpperCase(), 23);
            button.on("pointerdown", () => this.selectSign(sign));
            return button;
        });

        this.actionButton = this.makeButton(450, 520, "NEXT ROUND", 23);
        this.actionButton.on("pointerdown", () => this.handleAction());
        this.actionButton.setVisible(false);

        this.leaveButton = this.makeButton(450, 575, "LEAVE ROOM", 17, "#38232b", { x: 18, y: 10 });
        this.leaveButton.on("pointerdown", () => this.returnToRoom());
        this.leaveButton.setVisible(false);

        this.setupBattle();
    }

    // Create buttons with the same style
    makeButton(x, y, label, size, background = "#642233", padding = { x: 24, y: 16 }) {
        const button = this.add.text(x, y, label, {
            fontSize: `${size}px`, color: "#f5ede4",
            backgroundColor: background, padding
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        button.on("pointerover", () => button.setBackgroundColor("#92364a"));
        button.on("pointerout", () => button.setBackgroundColor(background));
        return button;
    }

    updateDisplay(data, game) {
        this.scoreValues[0].setText(String(data.playerScore ?? 0));
        this.scoreValues[1].setText(String(data.npcScore ?? data.npc1Score ?? 0));
        this.scoreValues[2].setText(String(data.npc2Score ?? 0));
        this.coinsText.setText(`COINS: ${game.currentCoins}`);
    }

    showChoices(visible) {
        this.choiceButtons.forEach(button => button.setVisible(visible));
    }

    showAction(label, phase) {
        this.phase = phase;
        this.actionButton.setText(label).setVisible(true);
        this.showChoices(false);
    }

    setNpcDialogues(choices = null) {
        this.npcDialogues.forEach((text, i) => {
            const sign = choices?.[`npc${i + 1}`];
            text.setText(!choices ? `NPC ${i + 1}: Ready.` :
                sign ? `NPC ${i + 1}: ${sign}!` : `NPC ${i + 1}: Eliminated`);
        });
    }

    actorName(actor) {
        if (actor === "player") return "YOU";
        return actor === "npc1" ? "NPC 1" : "NPC 2";
    }

    setupBattle() {
        const game = getGameData();
        if (!game) return this.blocked("Please log in first.");
        this.coinsText.setText(`COINS: ${game.currentCoins}`);
        if (game.isGameOver) return this.gameOver();
        if (game.pendingRetryLevels.includes(3)) return this.retryOffer();

        try {
            const saved = startOrResumeLevel3();
            const match = saved.activeMatch;
            this.updateDisplay(match, saved);
            if (match.duel) {
                this.beginDuel(match.duel);
            } else if (match.playerScore || match.npcScore || match.npc2Score) {
                this.resultText.setText("Saved match restored. Choose your next sign.");
            }
        } catch (error) {
            this.blocked(error.message);
        }
    }

    // Use the Level 3 rules from level3storage.js
    selectSign(sign = null) {
        if (!["choose", "duel-player", "duel-npc"].includes(this.phase)) return;

        try {
            const result = this.phase === "choose"
                ? playThreeWay(sign)
                : playLevel3Duel(sign);
            this.showResult(result);
        } catch (error) {
            this.blocked(error.message);
        }
    }

    showResult(result) {
        this.updateDisplay(result, result.game);
        this.setNpcDialogues(result.choices);

        if (result.type === "duel") return this.beginDuel(result.duel);

        if (result.type === "tie") {
            this.resultText.setText(this.phase === "choose"
                ? "THREE-WAY TIE! No points awarded."
                : "DUEL TIED! The eliminated participant returns. Round restarts.");
        } else {
            const action = this.phase === "choose"
                ? "defeated both opponents" : "won the duel";
            this.resultText.setText(
                `${this.actorName(result.winner)} ${action}!\n${this.actorName(result.winner)} earned 1 point.`
            );
        }

        if (result.matchOutcome) {
            this.finishMatch(result.matchOutcome, result.game);
        } else {
            this.showAction("NEXT ROUND", "next");
        }
    }

    beginDuel(duel) {
        const names = duel.contenders.map(actor => this.actorName(actor)).join(" VS ");
        this.resultText.setText(
            `${this.actorName(duel.eliminated)} eliminated!\n${names}\nChoose again for the duel.`
        );
        this.actionButton.setVisible(false);

        if (duel.contenders.includes("player")) {
            this.phase = "duel-player";
            this.showChoices(true);
        } else {
            this.phase = "duel-npc";
            this.showChoices(false);
            this.resultText.setText("YOU eliminated!\nNPC 1 VS NPC 2\nThe NPCs are choosing...");
            this.time.delayedCall(1400, () => {
                if (this.phase === "duel-npc") this.selectSign();
            });
        }
    }

    finishMatch(winner, game) {
        if (winner === "player") {
            this.resultText.setText("LEVEL 3 COMPLETED!\n+2 BONUS COINS!\nLEVEL 4 UNLOCKED!");
            this.showAction("RETURN TO ROOM", "finished");
        } else if (game.isGameOver) {
            this.gameOver();
        } else {
            this.resultText.setText(`${this.actorName(winner)} WON!\nPay 2 coins to retry Level 3.`);
            this.showAction("RETRY - 2 COINS", "retry");
            this.leaveButton.setVisible(true);
        }
    }

    retryOffer() {
        this.resultText.setText("LEVEL 3 FAILED.\nPay 2 coins to start another match.");
        this.showAction("RETRY - 2 COINS", "retry");
        this.leaveButton.setVisible(true);
    }

    gameOver() {
        this.resultText.setText("GAME OVER\nYou cannot afford the 2-coin retry.");
        this.showAction("START NEW RUN", "gameover");
        this.leaveButton.setVisible(false);
    }

    blocked(message) {
        this.resultText.setText(message);
        this.showAction("RETURN TO ROOM", "blocked");
        this.leaveButton.setVisible(false);
    }

    startSelection(message = "Choose your next sign.") {
        this.phase = "choose";
        this.resultText.setText(message);
        this.setNpcDialogues();
        this.actionButton.setVisible(false);
        this.leaveButton.setVisible(false);
        this.showChoices(true);
    }

    handleAction() {
        try {
            if (this.phase === "next") {
                this.startSelection();
            } else if (this.phase === "retry") {
                payRetry(3);
                const game = startOrResumeLevel3();
                this.updateDisplay(game.activeMatch, game);
                this.startSelection("New match. Choose your sign.");
            } else if (this.phase === "gameover") {
                resetRun();
                this.scene.stop("RoomScene");
                this.scene.start("OutsideScene");
            } else if (["finished", "blocked"].includes(this.phase)) {
                this.returnToRoom();
            }
        } catch (error) {
            this.blocked(error.message);
        }
    }

    returnToRoom() {
        const room = this.scene.get("RoomScene");
        room.tableActivated = false;
        room.dialogue.setText("Care for another gamble?");
        room.prompt.setText("Approach the table | ESC to leave");
        this.scene.resume("RoomScene");
        this.scene.stop();
    }
}