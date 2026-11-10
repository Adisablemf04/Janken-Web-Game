import Player from "../entities/player.js";
import { getGameData, startReplayLevels, spinFinalWheel, finishEnding, resetRun } from "../gameStorage.js";
const REQUIRED_COINS_TO_SAVE = 20;
export default class CourtyardScene extends Phaser.Scene {
    constructor() { super("CourtyardScene"); }

    preload() {
        if (!this.textures.exists("courtyard-background")) {
            this.load.image("courtyard-background", "images/Courtyard.png");
        }

        for (let level = 1; level <= 4; level++) {
            const key = `level-door-${level}`;
            if (!this.textures.exists(key)) {
                this.load.image(key, `images/doors/door ${level}.png`);
            }
        }

        if (!this.textures.exists("satan")) {
            this.load.image("satan", "images/characters/satan.png");
        }
        Player.preload(this);
    }

    create() {
        this.cameras.main.setBackgroundColor("#130d13");
        this.physics.world.setBounds(0, 0, 900, 600);
        this.add.image(450, 300, "courtyard-background")
            .setDisplaySize(900, 600).setDepth(-1);
        this.player = new Player(this, 450, 470);
        this.player.sprite.setDepth(5);

        // Courtyard boundaries
        this.createWall(450, 15, 900, 30);
        this.createWall(15, 300, 30, 600);
        this.createWall(885, 300, 30, 600);
        this.createWall(450, 585, 900, 30);

        // Level doors
        const nextLevel = getGameData()?.nextLevel ?? 1;
        const positions = [190, 365, 535, 710];
        this.doors = [];

        for (let level = 1; level <= 4; level++) {
            const x = positions[level - 1];
            const y = 145;
            const unlocked = level === nextLevel;
            const completed = level < nextLevel;
            const key = `level-door-${level}`;
            const door = this.add.image(x, y, key).setDisplaySize(110, 155);
            this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
            if (completed) door.setTint(0x75656c);
            else if (!unlocked) door.setTint(0x555058);
            this.add.text(x, 232, `LEVEL ${level}`, {
                fontSize: "16px", color: "#f5ede4",
                backgroundColor: "rgba(15, 6, 10, 0.8)",
                padding: { x: 8, y: 4 }
            }).setOrigin(0.5);
            const status = unlocked ? "UNLOCKED" : completed ? "COMPLETED" : "LOCKED";
            this.add.text(x, 257, status, {
                fontSize: "12px",
                color: unlocked ? "#ff8191" : "#aaaaaa",
                backgroundColor: "rgba(15, 6, 10, 0.8)",
                padding: { x: 6, y: 3 }
            }).setOrigin(0.5);
            this.doors.push({ x, y, level, unlocked });
        }

        // Exit
        this.exitDoor = this.add.rectangle(450, 560, 170, 34, 0x61202e)
            .setStrokeStyle(3, 0xd3263d).setDepth(3);

        this.add.text(450, 560, "EXIT", {
            fontSize: "16px", color: "#f5ede4"
        }).setOrigin(0.5).setDepth(4);

        // SATAN
        this.satan = { x: 95, y: 315 };
        this.textures.get("satan").setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.add.image(this.satan.x, this.satan.y, "satan")
            .setDisplaySize(110, 110).setDepth(4);

        this.add.text(this.satan.x, this.satan.y - 68, "SATAN", {
            fontSize: "14px", color: "#ff7185"
        }).setOrigin(0.5).setDepth(5);

        this.dialogue = this.add.text(450, 500, "", {
            fontSize: "18px", color: "#ff7185",
            align: "center", wordWrap: { width: 720 }
        }).setOrigin(0.5).setDepth(10);

        this.choiceBox = this.add.text(450, 300, "", {
            fontSize: "22px", color: "#f5ede4",
            align: "center", backgroundColor: "#190a10",
            padding: { x: 20, y: 16 }
        }).setOrigin(0.5).setVisible(false).setDepth(20);

        this.choiceOpen = false;

        // Keyboard controls
        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.oneKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
        this.twoKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
        this.threeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
        this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.prompt = this.add.text(450, 525, "", {
            fontSize: "20px", color: "#f5ede4",
            backgroundColor: "rgba(15, 6, 10, 0.75)",
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setDepth(10).setVisible(false);
    }

    createWall(x, y, width, height) {
        const wall = this.add.rectangle(x, y, width, height, 0x30212a)
            .setVisible(false);
        this.physics.add.existing(wall, true);
        this.physics.add.collider(this.player.sprite, wall);
    }

    // Build SATAN's options
    getChoiceText(message = "", showSave = true) {
        let text = message ? `${message}\n\n` : "";

        if (showSave) text += "1 - SAVE KAREENA\n";
        if (!getGameData()?.replayUsed) text += "2 - EARN MORE COINS\n";
        return text + "3 - SPIN WODOF";
    }

    openSatanChoices(message = "") {
        this.choiceOpen = true;
        this.player.sprite.body.setVelocity(0);
        this.dialogue.setText("");
        this.prompt.setVisible(false);
        this.choiceBox.setText(this.getChoiceText(message)).setVisible(true);
    }

    closeSatanChoices() {
        this.choiceOpen = false;
        this.choiceBox.setVisible(false).setText("");
        this.dialogue.setText("");
    }

    // Handle SATAN's final choices
    handleSatanChoices() {
        if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
            this.closeSatanChoices();
            return;
        }

        // Save Kareena
        if (Phaser.Input.Keyboard.JustDown(this.oneKey)) {
            try {
                const coins = getGameData()?.currentCoins ?? 0;

                if (coins < REQUIRED_COINS_TO_SAVE) {
                    const message = `NOT ENOUGH COINS TO SAVE KAREENA!\nYou have ${coins}/${REQUIRED_COINS_TO_SAVE} coins.`;
                    this.choiceBox.setText(this.getChoiceText(message, false));
                    return;
                }

                finishEnding();
                this.choiceBox.setText("You Beat The House.\nGET OUT.");

                this.time.delayedCall(1200, () => {
                    resetRun();
                    window.location.href = "goodending.html";
                });
            } catch (error) {
                this.choiceBox.setText(error.message);
            }
            return;
        }

        // Replay levels
        if (Phaser.Input.Keyboard.JustDown(this.twoKey)) {
            if (getGameData()?.replayUsed) return;
            try {
                startReplayLevels();
                this.closeSatanChoices();
                this.scene.restart();
            } catch (error) {
                this.choiceBox.setText(error.message);
            }
            return;
        }

        // Spin WODOF
        if (Phaser.Input.Keyboard.JustDown(this.threeKey)) {
            try {
                const game = spinFinalWheel();

                if (game.endingResult === "ruined") {
                    this.choiceBox.setText(
                        "This is the type of Greed that they speak of,\nin the Bible."
                    );

                    this.time.delayedCall(1600, () => {
                        resetRun();
                        window.location.href = "badending.html";
                    });
                } else {
                    this.openSatanChoices(
                        `WODOF doubled your coins to ${game.currentCoins}.`
                    );
                }
            } catch (error) {
                this.choiceBox.setText(error.message);
            }
        }
    }

    update() {
        if (this.choiceOpen) {
            this.player.sprite.body.setVelocity(0);
            this.handleSatanChoices();
            return;
        }

        this.player.update();

        // Find a nearby door
        let nearestDoor = null;
        let nearestDistance = Infinity;
        for (const door of this.doors) {
            const distance = Phaser.Math.Distance.Between(
                this.player.x, this.player.y, door.x, door.y
            );

            if (distance < 100 && distance < nearestDistance) {
                nearestDoor = door;
                nearestDistance = distance;
            }
        }

        const nearExit = Phaser.Math.Distance.Between(
            this.player.x, this.player.y, this.exitDoor.x, this.exitDoor.y
        ) < 95;

        const nearSatan = Phaser.Math.Distance.Between(
            this.player.x, this.player.y, this.satan.x, this.satan.y
        ) < 90;

        const finalChoicesReady = (getGameData()?.nextLevel ?? 1) === 5;

        // Interaction prompts
        let message = "";
        if (nearExit) {
            message = "Press E to go outside";
        } else if (nearSatan) {
            message = finalChoicesReady
                ? "Press E to speak with SATAN"
                : "Press E to talk to SATAN";
        } else if (nearestDoor) {
            message = nearestDoor.unlocked
                ? `Press E to enter Level ${nearestDoor.level}`
                : `Level ${nearestDoor.level} is locked`;
        } else {
            this.dialogue.setText("");
        }

        this.prompt.setText(message).setVisible(message !== "");

        // Handle interactions
        if (!Phaser.Input.Keyboard.JustDown(this.interactKey)) return;
        if (nearExit) {
            this.scene.start("OutsideScene", { fromCourtyard: true });
        } else if (nearSatan) {
            if (finalChoicesReady) {
                this.openSatanChoices();
            } else {
                this.dialogue.setText(
                    'SATAN: "Gamble with your soul, and BRING HER BACK."'
                );
            }
        } else if (nearestDoor?.unlocked) {
            this.scene.start("RoomScene", { level: nearestDoor.level });
        }
    }
}