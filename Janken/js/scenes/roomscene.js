
import Player from "../entities/player.js";
import { getGameData } from "../gameStorage.js";

export default class RoomScene extends Phaser.Scene {
    constructor() {
        super("RoomScene");
    }

    init(data) {
        this.level = data.level || 1;
    }

    preload() {
        // Select assets based on the current level
        this.backgroundKey = `room-background-${this.level}`;
        this.tableKey = `room-table-${this.level}`;

        // Room background
        if (!this.textures.exists(this.backgroundKey)) {
            this.load.image(
                this.backgroundKey,
                `images/roombackgrounds/level${this.level}_background.png`
            );
        }

        // Gambling table
        if (!this.textures.exists(this.tableKey)) {
            this.load.image(
                this.tableKey,
                `images/tables/Table-${this.level}.png`
            );
        }

        // Cultist NPC
        if (!this.textures.exists("cultist")) {
            this.load.image(
                "cultist",
                "images/characters/cultist.png"
            );
        }

        // Animated player
        Player.preload(this);
    }

    create() {
        this.cameras.main.setBackgroundColor("#170b10");
        this.physics.world.setBounds(0, 0, 900, 600);

        // Background for the current level
        this.add.image(
            450,
            300,
            this.backgroundKey
        ).setDisplaySize(900, 600);

        // Room title
        this.add.text(450, 50, `LEVEL ${this.level}`, {
            fontSize: "29px",
            color: "#f5ede4"
        }).setOrigin(0.5);

        // Keep Cultist pixel art sharp
        this.textures.get("cultist").setFilter(
            Phaser.Textures.FilterMode.NEAREST
        );

        // NPCs
        if (this.level >= 3) {
            this.createNPC(310, 190, "NPC 1");
            this.createNPC(590, 190, "NPC 2");
        } else {
            this.createNPC(450, 180, "DEALER");
        }

        // Visual gambling table
        this.add.image(
            450,
            300,
            this.tableKey
        ).setDisplaySize(270, 140);

        // Invisible collision and interaction area
        this.table = this.add.rectangle(
            450,
            300,
            240,
            96,
            0x49212b
        ).setVisible(false);

        this.physics.add.existing(this.table, true);

        // Player
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

        // NPC dialogue
        this.dialogue = this.add.text(450, 100, "", {
            fontSize: "21px",
            color: "#ff7185",
            align: "center"
        }).setOrigin(0.5);

        // Show instructions only near the table
        this.prompt = this.add.text(450, 550, "", {
            fontSize: "19px",
            color: "#f5ede4"
        }).setOrigin(0.5);

        this.tableActivated = false;

        // Dialogue after completing a level
        this.events.on(Phaser.Scenes.Events.RESUME, () => {
            const nextLevel = getGameData()?.nextLevel ?? 1;

            if (this.level === 1 && nextLevel > 1) {
                this.dialogue.setText("shoo...Go away");

            } else if (this.level === 2 && nextLevel > 2) {
                this.dialogue.setText("C'mon, die already.");

            } else if (this.level === 3 && nextLevel > 3) {
                this.dialogue.setText("leave.");

            } else if (this.level === 4 && nextLevel > 4) {
                this.dialogue.setText("Begone Savior.");
            }
        });
    }

    createNPC(x, y, name) {
        // Stationary Cultist sprite
        this.add.image(
            x,
            y + 15,
            "cultist"
        ).setDisplaySize(118, 118);

        // NPC name above the sprite
        this.add.text(
            x,
            y - 45,
            name,
            {
                fontSize: "18px",
                color: "#f5ede4"
            }
        ).setOrigin(0.5);
    }

    update() {
        // ESC returns to courtyard
        if (Phaser.Input.Keyboard.JustDown(this.exitKey)) {
            this.scene.start("CourtyardScene");
            return;
        }

        // Stop movement during battles
        if (this.tableActivated) {
            this.player.sprite.body.setVelocity(0);
            return;
        }

        this.player.update();

        const distance = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            this.table.x,
            this.table.y
        );

        const nearTable = distance < 155;

        this.prompt.setText(
            nearTable ? "Press E to gamble" : ""
        );

        // Start battle when E is pressed near the table
        if (
            nearTable &&
            Phaser.Input.Keyboard.JustDown(this.interactKey)
        ) {
            this.tableActivated = true;

            this.player.sprite.body.setVelocity(0);
            this.dialogue.setText("");
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
