
import {
    getGameData, startOrResumeMatch, buyAbility,
    playRPSRound, payRetry, resetRun
} from "../gameStorage.js";
import { ABILITIES } from "../rules/abilities.js";

export default class BattleScene extends Phaser.Scene {
    constructor() {
        super("BattleScene");
    }

    init(data) {
        this.level = data.level || 1;
    }

    create() {
        this.phase = "choose";

        this.add.rectangle(450, 300, 900, 600, 0x000000, 0.45);
        this.scoreText = this.add.text(450, 65, "PLAYER 0 - 0 DEALER", {
            fontSize: "26px", color: "#ff7185"
        }).setOrigin(0.5);
        this.coinsText = this.add.text(775, 95, "COINS: 0", {
            fontSize: "18px", color: "#ffd083"
        }).setOrigin(0.5);

        // Dealer dialogue and round results
        this.add.rectangle(450, 135, 430, 58, 0x190a10, 0.95)
            .setStrokeStyle(2, 0xb83c51);
        this.npcDialogue = this.add.text(450, 135, "Choose wisely...", {
            fontSize: "18px", color: "#f5ede4",
            align: "center", wordWrap: { width: 400 }
        }).setOrigin(0.5);

        this.add.rectangle(450, 335, 820, 150, 0x190a10, 0.92)
            .setStrokeStyle(2, 0x782738);
        this.resultText = this.add.text(450, 335, "Choose your sign.", {
            fontSize: "21px", color: "#f5ede4",
            align: "center", wordWrap: { width: 780 }
        }).setOrigin(0.5);

        // RPS choices
        this.choiceButtons = ["Rock", "Paper", "Scissors"].map((sign, i) => {
            const button = this.makeButton(220 + i * 230, 520, sign.toUpperCase(), 23);
            button.on("pointerdown", () => this.playRound(sign));
            return button;
        });

        // Only Level 2 has ability buttons
        this.abilityButtons = [];
        if (this.level === 2) {
            const options = [
                { key: "shield", name: "SHIELD", x: 190 },
                { key: "mind", name: "MIND TRICK", x: 450 },
                { key: "strike", name: "STRIKE", x: 710 }
            ];
            this.abilityButtons = options.map(item => {
                const button = this.makeButton(
                    item.x, 450, item.name, 17, "#572030", { x: 15, y: 11 }
                );
                button.on("pointerdown", () => this.purchaseAbility(item.key));
                return { ...item, button };
            });
        }

        this.continueButton = this.makeButton(450, 520, "NEXT ROUND", 23);
        this.continueButton.on("pointerdown", () => this.handleContinue());
        this.continueButton.setVisible(false);

        this.leaveButton = this.makeButton(
            450, 575, "LEAVE ROOM", 17, "#38232b", { x: 18, y: 10 }
        );
        this.leaveButton.on("pointerdown", () => this.returnToRoom());
        this.leaveButton.setVisible(false);

        this.setupBattle();
    }

    // Create buttons in one place instead of repeating the styles.
    makeButton(x, y, text, size, background = "#642233", padding = { x: 24, y: 16 }) {
        const button = this.add.text(x, y, text, {
            fontSize: `${size}px`, color: "#f5ede4", backgroundColor: background, padding
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        button.on("pointerover", () => button.setBackgroundColor("#92364a"));
        button.on("pointerout", () => button.setBackgroundColor(background));
        return button;
    }

    updateDisplay(player, dealer, game) {
        this.scoreText.setText(`PLAYER ${player} - ${dealer} DEALER`);
        this.coinsText.setText(`COINS: ${game.currentCoins}`);
    }

    showChoices(visible) {
        this.choiceButtons.forEach(button => button.setVisible(visible));
    }

    showAction(label, phase) {
        this.phase = phase;
        this.continueButton.setText(label).setVisible(true);
        this.showChoices(false);
        this.updateAbilityButtons(getGameData());
    }

    // Dim abilities that are already used or cannot be purchased.
    updateAbilityButtons(game) {
        if (this.level !== 2) return;
        const match = game?.activeMatch;
        const canChoose = this.phase === "choose" && match?.level === 2;

        for (const { key, name, button } of this.abilityButtons) {
            button.setVisible(Boolean(canChoose));
            if (!canChoose) continue;

            const state = match.playerAbilities;
            const used = state[`${key}Used`];
            const hasTarget = key !== "strike" || match.npcScore > 0;
            const available = !used && hasTarget && game.currentCoins >= ABILITIES[key].cost;

            let label = `${name} - ${ABILITIES[key].cost}C`;
            if (used) {
                label = key === "shield" && state.shieldArmed ? "SHIELD ARMED"
                    : key === "mind" && state.mindPending ? "MIND READY"
                    : `${name} USED`;
            } else if (!hasTarget) {
                label = "STRIKE: NO TARGET";
            }
            button.setText(label).setAlpha(available ? 1 : 0.45);
            button.setBackgroundColor(available ? "#572030" : "#30252a");
        }
    }

    setupBattle() {
        const game = getGameData();
        if (!game) return this.showBlocked("Please log in first.");
        this.coinsText.setText(`COINS: ${game.currentCoins}`);
        if (game.isGameOver) return this.showGameOver();
        if (game.pendingRetryLevels.includes(this.level)) return this.showRetryOffer();

        try {
            const saved = startOrResumeMatch(this.level);
            const match = saved.activeMatch;
            this.updateDisplay(match.playerScore, match.npcScore, saved);
            this.updateAbilityButtons(saved);
            if (match.playerScore || match.npcScore) {
                this.resultText.setText("Saved match restored. Choose your next sign.");
            }
        } catch (error) {
            this.showBlocked(error.message);
        }
    }

    purchaseAbility(key) {
        if (this.level !== 2 || this.phase !== "choose") return;
        try {
            const { game, message } = buyAbility(this.level, key);
            const match = game.activeMatch;
            this.updateDisplay(match.playerScore, match.npcScore, game);
            this.resultText.setText(message);
            this.updateAbilityButtons(game);
        } catch (error) {
            this.resultText.setText(error.message);
        }
    }

    playRound(sign) {
        if (this.phase !== "choose") return;

        let round;
        try {
            round = playRPSRound(this.level, sign);
        } catch (error) {
            this.showBlocked(error.message);
            return;
        }

        this.updateDisplay(round.playerScore, round.npcScore, round.game);
        this.npcDialogue.setText(`I chose ${round.npcChoice}.`);

        const lines = [
            `YOU: ${round.playerChoice.toUpperCase()} | DEALER: ${round.npcChoice.toUpperCase()}`
        ];
        if (round.npcAbility) lines.push(`DEALER USED ${ABILITIES[round.npcAbility].name}`);
        if (round.playerMind !== null) {
            lines.push(`YOUR MIND TRICK ${round.playerMind ? "WORKED" : "FAILED"}!`);
        }
        if (round.npcMind !== null) {
            lines.push(`DEALER'S MIND TRICK ${round.npcMind ? "WORKED" : "FAILED"}!`);
        }
        if (round.blockedBy === "player") lines.push("YOUR SHIELD BLOCKED THE DEFEAT!");
        else if (round.blockedBy === "npc") lines.push("DEALER'S SHIELD BLOCKED YOUR POINT!");
        else if (round.pointAwarded === "player") lines.push("YOU WON THE ROUND! +1 COIN");
        else if (round.pointAwarded === "npc") lines.push("THE DEALER WON THE ROUND!");
        else lines.push("IT'S A TIE!");

        this.resultText.setText(lines.join("\n"));

        if (round.matchOutcome === "player") {
            this.resultText.setText(
                `LEVEL ${this.level} COMPLETED!\n+2 BONUS COINS!\nLEVEL ${this.level + 1} UNLOCKED!`
            );
            this.npcDialogue.setText("Impossible... you defeated me.");
            this.showAction("RETURN TO ROOM", "finished");
        } else if (round.matchOutcome === "npc") {
            if (round.game.isGameOver) return this.showGameOver();
            this.npcDialogue.setText("Your defeat comes at a price.");
            this.resultText.setText("YOU LOST THE MATCH!\nPay 2 coins to retry.");
            this.showAction("RETRY - 2 COINS", "retry");
            this.leaveButton.setVisible(true);
        } else {
            this.showAction("NEXT ROUND", "continue");
        }
    }

    showRetryOffer() {
        this.npcDialogue.setText("Another chance will cost you.");
        this.resultText.setText("YOU LOST THIS LEVEL.\nPay 2 coins to retry.");
        this.showAction("RETRY - 2 COINS", "retry");
        this.leaveButton.setVisible(true);
    }

    showGameOver() {
        this.npcDialogue.setText("The gamble has ended.");
        this.resultText.setText("GAME OVER\nYou cannot afford another retry.");
        this.showAction("START NEW RUN", "gameover");
        this.leaveButton.setVisible(false);
    }

    showBlocked(message) {
        this.npcDialogue.setText("The dealer refuses your challenge.");
        this.resultText.setText(message);
        this.showAction("RETURN TO ROOM", "blocked");
        this.leaveButton.setVisible(false);
    }

    handleContinue() {
        if (this.phase === "continue") {
            this.nextRound();
        } else if (this.phase === "retry") {
            this.retryMatch();
        } else if (this.phase === "gameover") {
            try {
                resetRun();
                this.scene.stop("RoomScene");
                this.scene.start("OutsideScene");
            } catch (error) {
                this.showBlocked(error.message);
            }
        } else if (["finished", "blocked"].includes(this.phase)) {
            this.returnToRoom();
        }
    }

    nextRound() {
        this.phase = "choose";
        this.npcDialogue.setText("What's your next move?");
        this.resultText.setText("Choose your next sign.");
        this.showChoices(true);
        this.continueButton.setVisible(false);
        this.updateAbilityButtons(getGameData());
    }

    retryMatch() {
        try {
            const game = payRetry(this.level);
            this.updateDisplay(0, 0, game);
            this.nextRound();
            this.npcDialogue.setText("Let's see if your luck has changed.");
            this.resultText.setText("New match. Choose your sign.");
            this.leaveButton.setVisible(false);
        } catch (error) {
            this.showBlocked(error.message);
        }
    }

    returnToRoom() {
        const room = this.scene.get("RoomScene");
        room.tableActivated = false;
        this.scene.resume("RoomScene");
        this.scene.stop();
    }
}
