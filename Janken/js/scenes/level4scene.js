
import {
    startOrResumeLevel4, buyLevel4Ability, chooseLevel4,
    resolveNpcLevel4Duel, nextLevel4Round
} from "../level4storage.js";
import { getGameData, payRetry, resetRun } from "../gameStorage.js";
import { ABILITIES } from "../rules/abilities.js";

const NAMES = { player: "YOU", npc1: "NPC 1", npc2: "NPC 2" };

export default class Level4Scene extends Phaser.Scene {
    constructor() {
        super("Level4Scene");
    }

    create() {
        this.phase = "first";
        this.target = "npc1";
        this.add.rectangle(450, 300, 900, 600, 0x000000, 0.55);

        // Three independent scores, below the room title
        this.scoreValues = [
            { name: "PLAYER", x: 160 },
            { name: "NPC 1", x: 450 },
            { name: "NPC 2", x: 740 }
        ].map(({ name, x }) => {
            this.add.rectangle(x, 225, 185, 62, 0x190a10, 0.96)
                .setStrokeStyle(2, 0xb83c51);
            this.add.text(x, 209, name, {
                fontSize: "16px", color: "#f5ede4"
            }).setOrigin(0.5);
            return this.add.text(x, 239, "0", {
                fontSize: "26px", color: "#ff7185"
            }).setOrigin(0.5);
        });

        this.coinsText = this.add.text(790, 82, "COINS: 0", {
            fontSize: "18px", color: "#ffd083"
        }).setOrigin(0.5);

        this.npcTexts = [310, 590].map((x, i) => {
            this.add.rectangle(x, 135, 245, 53, 0x190a10, 0.96)
                .setStrokeStyle(2, 0xb83c51);
            return this.add.text(x, 135, `NPC ${i + 1}: Ready.`, {
                fontSize: "16px", color: "#f5ede4",
                align: "center", wordWrap: { width: 225 }
            }).setOrigin(0.5);
        });

        this.add.rectangle(450, 335, 825, 125, 0x190a10, 0.96)
            .setStrokeStyle(2, 0x782738);
        this.resultText = this.add.text(450, 335, "Choose your first sign.", {
            fontSize: "19px", color: "#f5ede4",
            align: "center", wordWrap: { width: 780 }
        }).setOrigin(0.5);

        this.targetButton = this.button(450, 412, "TARGET: NPC 1 (CLICK TO SWITCH)", 15);
        this.targetButton.on("pointerdown", () => {
            this.target = this.target === "npc1" ? "npc2" : "npc1";
            this.targetButton.setText(`TARGET: ${NAMES[this.target]} (CLICK TO SWITCH)`);
            this.refreshButtons(getGameData());
        });

        this.abilityButtons = [
            { key: "shield", name: "SHIELD", x: 190 },
            { key: "mind", name: "MIND TRICK", x: 450 },
            { key: "strike", name: "STRIKE", x: 710 }
        ].map(item => {
            const button = this.button(item.x, 462, item.name, 16);
            button.on("pointerdown", () => this.buy(item.key));
            return { ...item, button };
        });

        this.choiceButtons = ["Rock", "Paper", "Scissors"].map((sign, i) => {
            const button = this.button(220 + i * 230, 525, sign.toUpperCase(), 22);
            button.on("pointerdown", () => this.choose(sign));
            return { sign, button };
        });

        this.actionButton = this.button(450, 525, "NEXT ROUND", 22);
        this.actionButton.on("pointerdown", () => this.handleAction());
        this.leaveButton = this.button(450, 575, "LEAVE ROOM", 16);
        this.leaveButton.on("pointerdown", () => this.returnToRoom());
        this.hide(this.actionButton);
        this.hide(this.leaveButton);

        this.setupBattle();
    }

    button(x, y, label, size) {
        const button = this.add.text(x, y, label, {
            fontSize: `${size}px`, color: "#f5ede4",
            backgroundColor: "#642233", padding: { x: 15, y: 11 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        button.on("pointerover", () => button.setBackgroundColor("#92364a"));
        button.on("pointerout", () => button.setBackgroundColor("#642233"));
        return button;
    }

    hide(button) {
        button.setVisible(false).disableInteractive();
    }

    show(button) {
        button.setVisible(true).setInteractive({ useHandCursor: true });
    }

    updateScores(data) {
        if (!data) return;
        this.scoreValues[0].setText(String(data.playerScore ?? 0));
        this.scoreValues[1].setText(String(data.npc1Score ?? data.npcScore ?? 0));
        this.scoreValues[2].setText(String(data.npc2Score ?? 0));
    }

    updateCoins(game) {
        if (game) this.coinsText.setText(`COINS: ${game.currentCoins}`);
    }

    refreshButtons(game) {
        const match = game?.activeMatch;
        const choosing = Boolean(match && ["first", "second", "duel"].includes(this.phase));

        if (choosing) this.show(this.targetButton);
        else this.hide(this.targetButton);

        for (const { sign, button } of this.choiceButtons) {
            const blocked = this.phase === "second" && sign === match?.firstChoices?.player;
            button.setAlpha(blocked ? 0.35 : 1);
            if (choosing && !blocked) this.show(button);
            else this.hide(button);
            // Keep the unavailable sign visible but faded in Selection 2.
            if (choosing && blocked) button.setVisible(true);
        }

        for (const { key, name, button } of this.abilityButtons) {
            if (!choosing) {
                this.hide(button);
                continue;
            }
            const used = match.playerAbilities[`${key}Used`];
            const enough = game.currentCoins >= ABILITIES[key].cost;
            const inDuel = this.phase !== "duel" || match.duel.contenders.includes(this.target);
            const targetScore = this.target === "npc1" ? match.npcScore : match.npc2Score;
            const canStrike = key !== "strike" || (targetScore > 0 && inDuel);
            const canMind = key !== "mind" || (
                this.phase !== "first" && inDuel &&
                (this.phase !== "second" || match.firstChoices[this.target] !== "Paper")
            );
            const enabled = !used && enough && canStrike && canMind;
            button.setText(used ? `${name} USED` : `${name} - ${ABILITIES[key].cost}C`);
            button.setAlpha(enabled ? 1 : 0.35);
            if (enabled) this.show(button);
            else this.hide(button);
            if (!enabled) button.setVisible(true);
        }
    }

    action(label, phase) {
        this.phase = phase;
        this.actionButton.setText(label);
        this.show(this.actionButton);
        this.refreshButtons(getGameData());
    }

    setupBattle() {
        const game = getGameData();
        if (!game) return this.blocked("Please log in first.");
        this.updateCoins(game);
        if (game.isGameOver) return this.gameOver();
        if (game.pendingRetryLevels.includes(4)) return this.retryOffer();
        try {
            this.syncPhase(startOrResumeLevel4());
        } catch (error) {
            this.blocked(error.message);
        }
    }

    syncPhase(game) {
        const match = game.activeMatch;
        if (!match) return;
        this.phase = match.phase;
        this.updateScores(match);
        this.updateCoins(game);
        this.hide(this.actionButton);
        this.hide(this.leaveButton);

        if (match.phase === "first") {
            this.resultText.setText("Selection 1: choose any sign.");
        } else if (match.phase === "second") {
            this.resultText.setText(`Selection 2: choose a different sign.\nUnavailable: ${match.firstChoices.player}`);
        } else if (match.phase === "duel") {
            const opponent = match.duel.contenders.find(actor => actor !== "player");
            this.resultText.setText(`YOU VS ${NAMES[opponent]} — all signs restored.`);
        } else if (match.phase === "npcDuel") {
            this.resultText.setText("NPC 1 VS NPC 2. Reveal their duel below.");
            this.action("RESOLVE NPC DUEL", "npcDuel");
        } else if (match.phase === "between") {
            this.resultText.setText("Round complete. Continue when ready.");
            this.action("NEXT ROUND", "next");
        }
        this.refreshButtons(game);
    }

    buy(key) {
        try {
            const result = buyLevel4Ability(key, this.target);
            this.updateScores(result.game.activeMatch);
            this.updateCoins(result.game);
            this.resultText.setText(result.message);
            this.refreshButtons(result.game);
        } catch (error) {
            this.resultText.setText(error.message);
        }
    }

    choose(sign) {
        try {
            this.showEvent(chooseLevel4(sign));
        } catch (error) {
            this.resultText.setText(error.message);
        }
    }

    showEvent(event) {
        this.updateScores(event.scores);
        this.updateCoins(event.game);
        const choices = event.choices || {};
        this.npcTexts[0].setText(`NPC 1: ${choices.npc1 ?? "Waiting..."}`);
        this.npcTexts[1].setText(`NPC 2: ${choices.npc2 ?? "Waiting..."}`);
        const notes = (event.notes || []).slice(0, 2).join("\n");

        if (event.matchOutcome === "player") {
            this.resultText.setText("LEVEL 4 COMPLETED!\n+2 BONUS COINS!\nThe final choice awaits...");
            return this.action("RETURN TO ROOM", "finished");
        }
        if (event.matchOutcome) {
            if (event.game.isGameOver) return this.gameOver();
            this.resultText.setText(`${NAMES[event.matchOutcome]} WON!\nPay 2 coins to retry.`);
            this.action("RETRY - 2 COINS", "retry");
            this.show(this.leaveButton);
            return;
        }
        if (event.type === "first") {
            this.syncPhase(event.game);
            this.resultText.setText("First choices locked! Pick a DIFFERENT sign.");
            return;
        }
        if (event.type === "duel") {
            this.syncPhase(event.game);
            this.resultText.setText(
                `${NAMES[event.duel.eliminated]} eliminated!\n` +
                `${event.duel.contenders.map(x => NAMES[x]).join(" VS ")} — fresh signs.`
            );
            return;
        }

        let message = "";
        if (event.type === "tie") message = "Three-way tie! Round restarts.";
        else if (event.type === "duel-tie") message = "Duel tied! Everyone returns next round.";
        else if (event.type === "shield") message = "Lucky Shield blocked a defeat!";
        else if (event.type === "point") message = `${NAMES[event.winner]} earned 1 point!`;
        this.resultText.setText(`${message}${notes ? "\n" + notes : ""}`);
        this.action("NEXT ROUND", "next");
    }

    handleAction() {
        try {
            if (this.phase === "npcDuel") {
                this.showEvent(resolveNpcLevel4Duel());
            } else if (this.phase === "next") {
                this.syncPhase(nextLevel4Round());
            } else if (this.phase === "retry") {
                payRetry(4);
                this.syncPhase(startOrResumeLevel4());
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

    retryOffer() {
        this.resultText.setText("LEVEL 4 FAILED. Pay 2 coins to retry.");
        this.action("RETRY - 2 COINS", "retry");
        this.show(this.leaveButton);
    }

    gameOver() {
        this.resultText.setText("GAME OVER\nYou cannot afford the retry.");
        this.action("START NEW RUN", "gameover");
        this.hide(this.leaveButton);
    }

    blocked(message) {
        if (message === "Level already completed. Move to the next level.") {
            message = "Level already completed.";
        }

        this.resultText.setText(message);
        this.action("RETURN TO ROOM", "blocked");
        this.hide(this.leaveButton);
    }

    returnToRoom() {
        const room = this.scene.get("RoomScene");
        room.tableActivated = false;
        this.scene.resume("RoomScene");
        this.scene.stop();
    }
}
