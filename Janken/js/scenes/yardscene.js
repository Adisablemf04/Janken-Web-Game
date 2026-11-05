import Player from "../entities/player.js";
import { getCurrentUser } from "../accountStorage.js";

export default class CourtyardScene extends Phaser.Scene {

    constructor() {
        super("CourtyardScene");
    }

    create() {

        this.cameras.main.setBackgroundColor("#130d13");

        this.physics.world.setBounds(0, 0, 900, 600);

        // Ground pattern
        const ground = this.add.graphics();
        ground.lineStyle(1, 0x39252f, 0.4);

        for (let x = 50; x < 900; x += 70) {
            ground.lineBetween(x, 0, x, 600);
        }

        for (let y = 50; y < 600; y += 70) {
            ground.lineBetween(0, y, 900, y);
        }

        // Courtyard title
        this.add.text(450, 42, "THE COURTYARD", {
            fontSize: "26px",
            color: "#f5ede4"
        }).setOrigin(0.5);

        // Player spawns inside the courtyard
        this.player = new Player(this, 450, 470);

        // Courtyard walls
        this.createWall(450, 15, 900, 30);
        this.createWall(15, 300, 30, 600);
        this.createWall(885, 300, 30, 600);
        this.createWall(450, 585, 900, 30);

        // Obstacles
        this.createWall(265, 355, 65, 65);
        this.createWall(635, 355, 65, 65);

        // Get current player's progress
        const user = getCurrentUser();

        const highestLevel =
            user?.game?.highestLevelCompleted ?? 0;

        // Four level doors
        const positions = [125, 340, 560, 775];

        this.doors = [];

        for (let level = 1; level <= 4; level++) {

            const x = positions[level - 1];

            const unlocked = level <= highestLevel + 1;

            const door = this.add.rectangle(
                x, 125, 125, 85,
                unlocked ? 0x61202e : 0x28232c
            );

            door.setStrokeStyle(
                3,
                unlocked ? 0xd3263d : 0x60545e
            );

            this.add.text(x, 113, `LEVEL ${level}`, {
                fontSize: "19px",
                color: "#f5ede4"
            }).setOrigin(0.5);

            this.add.text(
                x, 138,
                unlocked ? "UNLOCKED" : "LOCKED",
                {
                    fontSize: "12px",
                    color: unlocked ? "#ff8191" : "#999999"
                }
            ).setOrigin(0.5);

            this.doors.push({
                x: x,
                y: 125,
                level: level,
                unlocked: unlocked
            });
        }

        // Exit door leading back outside
        this.exitDoor = this.add.rectangle(
            450, 555, 150, 30, 0x61202e
        );

        this.exitDoor.setStrokeStyle(3, 0xd3263d);

        this.add.text(450, 555, "EXIT", {
            fontSize: "16px",
            color: "#f5ede4"
        }).setOrigin(0.5);

        // Interaction key
        this.interactKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.E
        );

        // Interaction prompt
        this.prompt = this.add.text(
            450, 525, "WASD to move | E to interact",
            {
                fontSize: "20px",
                color: "#f5ede4"
            }
        ).setOrigin(0.5);
    }

    createWall(x, y, width, height) {

        const wall = this.add.rectangle(
            x, y, width, height, 0x30212a
        );

        wall.setStrokeStyle(1, 0x704050);

        // Add solid physics
        this.physics.add.existing(wall, true);

        this.physics.add.collider(
            this.player.sprite,
            wall
        );
    }

    update() {

        // Update player movement
        this.player.update();

        let nearestDoor = null;
        let nearestDistance = Infinity;

        // Find the closest level door
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

        // Check distance from courtyard exit
        const exitDistance = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            this.exitDoor.x,
            this.exitDoor.y
        );

        const nearExit = exitDistance < 85;

        // Show relevant interaction prompt
        if (nearExit) {

            this.prompt.setText(
                "Press E to go outside"
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

            this.prompt.setText(
                "WASD to move | E to interact"
            );
        }

        // Detect a new E key press
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {

            // Exit courtyard and return outside
            if (nearExit) {

                this.scene.start("OutsideScene", {
                    fromCourtyard: true
                });

                return;
            }

            // Enter an unlocked level room
            if (nearestDoor && nearestDoor.unlocked) {

                this.scene.start("RoomScene", {
                    level: nearestDoor.level
                });

                return;
            }
        }
    }
}