import Player from "../entities/player.js";
import { getGameData } from "../gameStorage.js";

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
        this.add.text(450, 50, `LEVEL ${this.level}`, {
            fontSize: "29px", color: "#f5ede4"
        }).setOrigin(0.5);

        // NPCs
        if (this.level >= 3) {
            this.createNPC(310, 190, "NPC 1");
            this.createNPC(590, 190, "NPC 2");
        } else {
            this.createNPC(450, 180, "DEALER");
        }

        // Gambling table
        this.table = this.add.rectangle(450, 300, 240, 96, 0x49212b);
        this.table.setStrokeStyle(3, 0xb32e46);

        this.add.text(450, 300, "RPS TABLE", {
            fontSize: "24px", color: "#f5ede4"
        }).setOrigin(0.5);

        this.physics.add.existing(this.table, true);

        // Player
        this.player = new Player(this, 450, 485);
        this.physics.add.collider(this.player.sprite, this.table);

        // Keyboard controls
        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.exitKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // NPC dialogue
        this.dialogue = this.add.text(450, 100, "", {
            fontSize: "21px", color: "#ff7185", align: "center"
        }).setOrigin(0.5);

        // Show instructions only near the table
        this.prompt = this.add.text(450, 550, "", {
            fontSize: "19px", color: "#f5ede4"
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
        this.add.rectangle(x, y, 32, 38, 0xa43145);
        this.add.text(x, y - 35, name, {
            fontSize: "18px", color: "#f5ede4"
        }).setOrigin(0.5);
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
            this.player.x, this.player.y,
            this.table.x, this.table.y
        );

        const nearTable = distance < 155;
        this.prompt.setText(nearTable ? "Press E to gamble" : "");

        // Start battle when E is pressed near the table
        if (nearTable && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            this.tableActivated = true;
            this.player.sprite.body.setVelocity(0);
            this.dialogue.setText("");
            this.scene.pause();

            if (this.level === 4) {
                this.scene.run("Level4Scene");
            } else if (this.level === 3) {
                this.scene.run("Level3Scene");
            } else {
                this.scene.run("BattleScene", { level: this.level });
            }
        }
    }
}
