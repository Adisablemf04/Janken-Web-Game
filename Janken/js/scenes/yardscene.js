import Player from "../entities/player.js";
import {
    getGameData,
    startReplayLevels,
    spinFinalWheel,
    finishEnding,
    resetRun
} from "../gameStorage.js";

export default class CourtyardScene extends Phaser.Scene {
    constructor() {
        super("CourtyardScene");
    }

    create() {
        this.cameras.main.setBackgroundColor("#130d13");
        this.physics.world.setBounds(0, 0, 900, 600);

        const ground = this.add.graphics();
        ground.lineStyle(1, 0x39252f, 0.4);

        for (let x = 50; x < 900; x += 70) {
            ground.lineBetween(x, 0, x, 600);
        }

        for (let y = 50; y < 600; y += 70) {
            ground.lineBetween(0, y, 900, y);
        }

        this.player = new Player(this, 450, 470);

        // Outer walls only
        this.createWall(450, 15, 900, 30);
        this.createWall(15, 300, 30, 600);
        this.createWall(885, 300, 30, 600);
        this.createWall(450, 585, 900, 30);

        const nextLevel = getGameData()?.nextLevel ?? 1;
        const positions = [125, 340, 560, 775];

        this.doors = [];

        for (let level = 1; level <= 4; level++) {
            const x = positions[level - 1];
            const unlocked = level === nextLevel;

            this.add.rectangle(
                x, 125, 125, 85,
                unlocked ? 0x61202e : 0x28232c
            ).setStrokeStyle(
                3,
                unlocked ? 0xd3263d : 0x60545e
            );

            this.add.text(x, 113, `LEVEL ${level}`, {
                fontSize: "19px",
                color: "#f5ede4"
            }).setOrigin(0.5);

            this.add.text(
                x, 138,
                unlocked ? "UNLOCKED" : level < nextLevel ? "COMPLETED" : "LOCKED",
                {
                    fontSize: "12px",
                    color: unlocked ? "#ff8191" : "#999999"
                }
            ).setOrigin(0.5);

            this.doors.push({ x, y: 125, level, unlocked });
        }

        this.exitDoor = this.add.rectangle(
            450, 555, 150, 30, 0x61202e
        );

        this.exitDoor.setStrokeStyle(3, 0xd3263d);

        this.add.text(450, 555, "EXIT", {
            fontSize: "16px",
            color: "#f5ede4"
        }).setOrigin(0.5);

        this.satan = { x: 85, y: 540 };

        this.add.rectangle(
            this.satan.x,
            this.satan.y,
            28, 36,
            0x1a1a1a
        ).setStrokeStyle(2, 0xd3263d);

        this.add.text(this.satan.x, this.satan.y - 30, "SATAN", {
            fontSize: "14px",
            color: "#ff7185"
        }).setOrigin(0.5);

        this.dialogue = this.add.text(450, 500, "", {
            fontSize: "18px",
            color: "#ff7185",
            align: "center",
            wordWrap: { width: 720 }
        }).setOrigin(0.5);

        this.choiceBox = this.add.text(450, 300, "", {
            fontSize: "22px",
            color: "#f5ede4",
            align: "center",
            backgroundColor: "#190a10",
            padding: { x: 20, y: 16 }
        }).setOrigin(0.5).setVisible(false);

        this.choiceOpen = false;

        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.oneKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
        this.twoKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
        this.threeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
        this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // Instructions appear only near interactive objects
        this.prompt = this.add.text(450, 525, "", {
            fontSize: "20px",
            color: "#f5ede4"
        }).setOrigin(0.5);
    }

    createWall(x, y, width, height) {
        const wall = this.add.rectangle(x, y, width, height, 0x30212a);
        wall.setStrokeStyle(1, 0x704050);
        this.physics.add.existing(wall, true);
        this.physics.add.collider(this.player.sprite, wall);
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
        this.choiceBox.setText(this.getChoiceText(extra));
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

            // Option 2: Earn more coins (once only)
            if (Phaser.Input.Keyboard.JustDown(this.twoKey)) {
                const replayUsed = getGameData()?.replayUsed ?? false;
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

            if (distance < 100 && distance < nearestDistance) {
                nearestDoor = door;
                nearestDistance = distance;
            }
        }

        const exitDistance = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            this.exitDoor.x,
            this.exitDoor.y
        );

        const nearExit = exitDistance < 85;

        const satanDistance = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            this.satan.x,
            this.satan.y
        );

        const nearSatan = satanDistance < 90;
        const finalChoicesReady = (getGameData()?.nextLevel ?? 1) === 5;

        if (nearExit) {
            this.prompt.setText("Press E to go outside");
        } else if (nearSatan) {
            this.prompt.setText(
                finalChoicesReady
                    ? "Press E to speak with SATAN"
                    : "Press E to talk to SATAN"
            );
        } else if (nearestDoor) {
            if (nearestDoor.unlocked) {
                this.prompt.setText(`Press E to enter Level ${nearestDoor.level}`);
            } else {
                this.prompt.setText(`Level ${nearestDoor.level} is locked`);
            }
        } else {
            this.prompt.setText("");
            this.dialogue.setText("");
        }

        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            if (nearExit) {
                this.scene.start("OutsideScene", { fromCourtyard: true });
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
