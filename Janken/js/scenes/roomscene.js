
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

        // NPC character
        this.add.rectangle(
            450, 180, 32, 38, 0xa43145
        );

        this.add.text(450, 145, "DEALER", {
            fontSize: "18px",
            color: "#f5ede4"
        }).setOrigin(0.5);

        // Gambling table
        this.table = this.add.rectangle(
            450, 300, 240, 96, 0x49212b
        );

        this.table.setStrokeStyle(3, 0xb32e46);

        this.add.text(450, 300, "RPS TABLE", {
            fontSize: "24px",
            color: "#f5ede4"
        }).setOrigin(0.5);

        // Make the table solid
        this.physics.add.existing(this.table, true);

        // Create player below the table
        this.player = new Player(this, 450, 485);

        this.physics.add.collider(
            this.player.sprite,
            this.table
        );

        // Interaction key
        this.interactKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.E
        );

        // Leave room key
        this.exitKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.ESC
        );

        // NPC dialogue
        this.dialogue = this.add.text(
            450, 100, "",
            {
                fontSize: "21px",
                color: "#ff7185",
                align: "center"
            }
        ).setOrigin(0.5);

        // Instructions
        this.prompt = this.add.text(
            450, 550,
            "Approach the table | ESC to leave",
            {
                fontSize: "19px",
                color: "#f5ede4"
            }
        ).setOrigin(0.5);

        // Prevent duplicate table interactions
        this.tableActivated = false;
    }

    update() {

        // Return to courtyard when not gambling
        if (Phaser.Input.Keyboard.JustDown(this.exitKey)) {

            this.scene.start("CourtyardScene");

            return;
        }

        // Stop movement when the table is activated
        if (this.tableActivated) {

            this.player.sprite.body.setVelocity(0);

            return;
        }

        // Normal player movement
        this.player.update();

        // Calculate distance from gambling table
        const distance = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            this.table.x,
            this.table.y
        );

        const nearTable = distance < 155;

        // Interaction prompt
        if (nearTable) {

            this.prompt.setText(
                "Press E to gamble"
            );

        } else {

            this.prompt.setText(
                "Approach the table | ESC to leave"
            );
        }

        // Interact with the gambling table
        if (
            nearTable &&
            Phaser.Input.Keyboard.JustDown(this.interactKey)
        ) {

            // Only Level 1 is implemented for now
            if (this.level !== 1) {

                this.dialogue.setText(
                    "This battle is not ready yet..."
                );

                return;
            }

            // Mark the table as activated
            this.tableActivated = true;

            // Stop the player
            this.player.sprite.body.setVelocity(0);

            // Clear the room's existing dialogue
            this.dialogue.setText("");

            // Open the battle interface
            this.scene.pause();

            this.scene.run("BattleScene", {
                level: this.level
            });
        }
    }
}
