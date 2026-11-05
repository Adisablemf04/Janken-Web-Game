
import Player from "../entities/player.js";

export default class RoomScene extends Phaser.Scene {

    constructor() {
        super("RoomScene");
    }

    init(data) {
        this.level = data.level || 1;
    }

    create() {
        this.cameras.main.setBackgroundColor("#170b10");
        this.physics.world.setBounds(0, 0, 900, 600);

        // Room title
        this.add.text(
            450, 50,
            `LEVEL ${this.level} - GAMBLING ROOM`,
            {
                fontSize: "29px",
                color: "#f5ede4"
            }
        ).setOrigin(0.5);

        // Levels 3 and 4 contain two NPCs
        if (this.level >= 3) {
            this.createNPC(310, 190, "NPC 1");
            this.createNPC(590, 190, "NPC 2");
        } else {
            this.createNPC(450, 180, "DEALER");
        }

        // Gambling table
        this.table = this.add.rectangle(
            450, 300, 240, 96, 0x49212b
        );

        this.table.setStrokeStyle(3, 0xb32e46);

        this.add.text(450, 300, "RPS TABLE", {
            fontSize: "24px",
            color: "#f5ede4"
        }).setOrigin(0.5);

        // Solid table
        this.physics.add.existing(this.table, true);

        // Player character
        this.player = new Player(this, 450, 485);

        this.physics.add.collider(
            this.player.sprite,
            this.table
        );

        // Keyboard controls
        this.interactKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.E
        );

        this.exitKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ESC
        );

        // Room dialogue
        this.dialogue = this.add.text(
            450, 100, "",
            {
                fontSize: "21px",
                color: "#ff7185",
                align: "center"
            }
        ).setOrigin(0.5);

        // Interaction instructions
        this.prompt = this.add.text(
            450, 550,
            "Approach the table | ESC to leave",
            {
                fontSize: "19px",
                color: "#f5ede4"
            }
        ).setOrigin(0.5);

        this.tableActivated = false;
    }

    // Reusable method for creating NPCs
    createNPC(x, y, name) {
        this.add.rectangle(
            x, y, 32, 38, 0xa43145
        );

        this.add.text(x, y - 35, name, {
            fontSize: "18px",
            color: "#f5ede4"
        }).setOrigin(0.5);
    }

    update() {

        // Return to courtyard
        if (Phaser.Input.Keyboard.JustDown(this.exitKey)) {
            this.scene.start("CourtyardScene");
            return;
        }

        // Stop movement during a battle
        if (this.tableActivated) {
            this.player.sprite.body.setVelocity(0);
            return;
        }

        this.player.update();

        // Check distance from table
        const distance = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            this.table.x,
            this.table.y
        );

        const nearTable = distance < 155;

        this.prompt.setText(
            nearTable
                ? "Press E to gamble"
                : "Approach the table | ESC to leave"
        );

        // Start the appropriate level
        if (
            nearTable &&
            Phaser.Input.Keyboard.JustDown(this.interactKey)
        ) {
            this.tableActivated = true;

            this.player.sprite.body.setVelocity(0);
            this.dialogue.setText("");

            // Pause exploration
            this.scene.pause();

            if (this.level === 4) {
                this.scene.run("Level4Scene");
            } else if (this.level === 3) {
                this.scene.run("Level3Scene");
            } else {
                this.scene.run("BattleScene", {
                    level: this.level
                });
            }
        }
    }
}
