
import Player from "../entities/player.js";
import {
    getGameData,
    startReplayLevels,
    spinFinalWheel,
    finishEnding,
    resetRun
} from "../gameStorage.js";

const REQUIRED_COINS_TO_SAVE = 20;

export default class CourtyardScene extends Phaser.Scene {

    constructor() {
        super("CourtyardScene");
    }

    preload() {
        // Courtyard background
        if (!this.textures.exists("courtyard-background")) {
            this.load.image(
                "courtyard-background",
                "images/Courtyard.png"
            );
        }

        // Four level doors
        for (let level = 1; level <= 4; level++) {
            const key = `level-door-${level}`;

            if (!this.textures.exists(key)) {
                this.load.image(
                    key,
                    `images/doors/door ${level}.png`
                );
            }
        }

        // SATAN sprite
        if (!this.textures.exists("satan")) {
            this.load.image(
                "satan",
                "images/characters/satan.png"
            );
        }

        // Animated player
        Player.preload(this);
    }

    create() {
        this.cameras.main.setBackgroundColor("#130d13");
        this.physics.world.setBounds(0, 0, 900, 600);

        // Courtyard background
        this.add.image(
            450,
            300,
            "courtyard-background"
        ).setDisplaySize(900, 600).setDepth(-1);

        // Player
        this.player = new Player(this, 450, 470);
        this.player.sprite.setDepth(5);

        // Invisible outer walls
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

            const door = this.add.image(
                x,
                y,
                `level-door-${level}`
            ).setDisplaySize(110, 155);

            this.textures.get(
                `level-door-${level}`
            ).setFilter(Phaser.Textures.FilterMode.NEAREST);

            if (completed) {
                door.setTint(0x75656c);
            } else if (!unlocked) {
                door.setTint(0x555058);
            } else {
                door.clearTint();
            }

            // Level label
            this.add.text(
                x,
                232,
                `LEVEL ${level}`,
                {
                    fontSize: "16px",
                    color: "#f5ede4",
                    backgroundColor: "rgba(15, 6, 10, 0.8)",
                    padding: { x: 8, y: 4 }
                }
            ).setOrigin(0.5);

            // Level status
            this.add.text(
                x,
                257,
                unlocked
                    ? "UNLOCKED"
                    : completed
                        ? "COMPLETED"
                        : "LOCKED",
                {
                    fontSize: "12px",
                    color: unlocked ? "#ff8191" : "#aaaaaa",
                    backgroundColor: "rgba(15, 6, 10, 0.8)",
                    padding: { x: 6, y: 3 }
                }
            ).setOrigin(0.5);

            this.doors.push({
                x,
                y,
                level,
                unlocked
            });
        }

        // Courtyard EXIT
        this.exitDoor = this.add.rectangle(
            450,
            560,
            170,
            34,
            0x61202e
        );

        this.exitDoor.setStrokeStyle(3, 0xd3263d);
        this.exitDoor.setDepth(3);

        this.add.text(450, 560, "EXIT", {
            fontSize: "16px",
            color: "#f5ede4"
        }).setOrigin(0.5).setDepth(4);

        // SATAN - Left side
        this.satan = {
            x: 95,
            y: 315
        };

        this.textures.get("satan").setFilter(
            Phaser.Textures.FilterMode.NEAREST
        );

        this.add.image(
            this.satan.x,
            this.satan.y,
            "satan"
        ).setDisplaySize(110, 110).setDepth(4);

        this.add.text(
            this.satan.x,
            this.satan.y - 68,
            "SATAN",
            {
                fontSize: "14px",
                color: "#ff7185"
            }
        ).setOrigin(0.5).setDepth(5);

        // Dialogue
        this.dialogue = this.add.text(
            450,
            500,
            "",
            {
                fontSize: "18px",
                color: "#ff7185",
                align: "center",
                wordWrap: { width: 720 }
            }
        ).setOrigin(0.5).setDepth(10);

        // Final choice menu
        this.choiceBox = this.add.text(
            450,
            300,
            "",
            {
                fontSize: "22px",
                color: "#f5ede4",
                align: "center",
                backgroundColor: "#190a10",
                padding: { x: 20, y: 16 }
            }
        ).setOrigin(0.5)
         .setVisible(false)
         .setDepth(20);

        this.choiceOpen = false;

        // Keyboard controls
        this.interactKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.E
        );

        this.oneKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ONE
        );

        this.twoKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.TWO
        );

        this.threeKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.THREE
        );

        this.escapeKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ESC
        );

        // Interaction prompt
        this.prompt = this.add.text(
            450,
            525,
            "",
            {
                fontSize: "20px",
                color: "#f5ede4",
                backgroundColor: "rgba(15, 6, 10, 0.75)",
                padding: { x: 10, y: 5 }
            }
        ).setOrigin(0.5)
         .setDepth(10)
         .setVisible(false);
    }

    createWall(x, y, width, height) {
        const wall = this.add.rectangle(
            x,
            y,
            width,
            height,
            0x30212a
        ).setVisible(false);

        this.physics.add.existing(wall, true);

        this.physics.add.collider(
            this.player.sprite,
            wall
        );
    }

    getChoiceText(extra = "") {
        const replayUsed = getGameData()?.replayUsed ?? false;

        let text = extra ? `${extra}\n\n` : "";

        text += "1 - SAVE KAREENA\n";

        if (!replayUsed) {
            text += "2 - EARN MORE COINS\n";
        }

        text += "3 - SPIN WODOF";

        return text;
    }

    openSatanChoices(extra = "") {
        this.choiceOpen = true;

        this.player.sprite.body.setVelocity(0);

        this.dialogue.setText("");
        this.prompt.setVisible(false);

        this.choiceBox.setText(
            this.getChoiceText(extra)
        );

        this.choiceBox.setVisible(true);
    }

    // Display alternative choices when coins are insufficient
    showNotEnoughCoins() {
        const game = getGameData();

        const currentCoins = game?.currentCoins ?? 0;
        const replayUsed = game?.replayUsed ?? false;

        let message =
            "NOT ENOUGH COINS TO SAVE KAREENA!\n" +
            `You have ${currentCoins}/${REQUIRED_COINS_TO_SAVE} coins.\n\n`;

        if (!replayUsed) {
            message += "2 - EARN MORE COINS\n";
        }

        message += "3 - SPIN WODOF";

        this.choiceBox.setText(message);
        this.choiceBox.setVisible(true);
    }

    closeSatanChoices() {
        this.choiceOpen = false;

        this.choiceBox.setVisible(false);
        this.choiceBox.setText("");

        this.dialogue.setText("");
    }

    update() {
        if (this.choiceOpen) {
            this.player.sprite.body.setVelocity(0);

            if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
                this.closeSatanChoices();
                return;
            }

            // Option 1: Save Kareena
            if (Phaser.Input.Keyboard.JustDown(this.oneKey)) {
                try {
                    const game = getGameData();
                    const currentCoins = game?.currentCoins ?? 0;

                    // Must have at least 20 coins to save Kareena
                    if (currentCoins < REQUIRED_COINS_TO_SAVE) {
                        this.showNotEnoughCoins();
                        return;
                    }

                    // Enough coins: proceed to good ending
                    finishEnding();

                    this.choiceBox.setText(
                        "You Beat The House.\nGET OUT."
                    );

                    this.time.delayedCall(1200, () => {
                        resetRun();
                        window.location.href = "goodending.html";
                    });

                } catch (error) {
                    this.choiceBox.setText(error.message);
                }

                return;
            }

            // Option 2: Earn more coins (once only)
            if (Phaser.Input.Keyboard.JustDown(this.twoKey)) {
                const replayUsed =
                    getGameData()?.replayUsed ?? false;

                if (replayUsed) return;

                try {
                    startReplayLevels();

                    this.closeSatanChoices();
                    this.scene.restart();

                } catch (error) {
                    this.choiceBox.setText(error.message);
                }

                return;
            }

            // Option 3: Spin WODOF
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

                return;
            }

            return;
        }

        // Player movement
        this.player.update();

        let nearestDoor = null;
        let nearestDistance = Infinity;

        for (const door of this.doors) {
            const distance = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                door.x,
                door.y
            );

            if (
                distance < 100 &&
                distance < nearestDistance
            ) {
                nearestDoor = door;
                nearestDistance = distance;
            }
        }

        // Check EXIT distance
        const exitDistance = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            this.exitDoor.x,
            this.exitDoor.y
        );

        const nearExit = exitDistance < 95;

        // Check SATAN distance
        const satanDistance = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            this.satan.x,
            this.satan.y
        );

        const nearSatan = satanDistance < 90;

        const finalChoicesReady =
            (getGameData()?.nextLevel ?? 1) === 5;

        // Interaction prompts
        if (nearExit) {
            this.prompt.setText(
                "Press E to go outside"
            );

        } else if (nearSatan) {
            this.prompt.setText(
                finalChoicesReady
                    ? "Press E to speak with SATAN"
                    : "Press E to talk to SATAN"
            );

        } else if (nearestDoor) {
            if (nearestDoor.unlocked) {
                this.prompt.setText(
                    `Press E to enter Level ${nearestDoor.level}`
                );

            } else {
                this.prompt.setText(
                    `Level ${nearestDoor.level} is locked`
                );
            }

        } else {
            this.prompt.setText("");
            this.dialogue.setText("");
        }

        // Hide empty prompt background
        this.prompt.setVisible(this.prompt.text !== "");

        // Handle interaction
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            if (nearExit) {
                this.scene.start("OutsideScene", {
                    fromCourtyard: true
                });

                return;
            }

            if (nearSatan) {
                if (finalChoicesReady) {
                    this.openSatanChoices();
                } else {
                    this.dialogue.setText(
                        'SATAN: "Gamble with your soul, and BRING HER BACK."'
                    );
                }

                return;
            }

            if (nearestDoor && nearestDoor.unlocked) {
                this.scene.start("RoomScene", {
                    level: nearestDoor.level
                });

                return;
            }
        }
    }
}
