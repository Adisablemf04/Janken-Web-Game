import Player from "../entities/player.js";
export default class OutsideScene extends Phaser.Scene {
    constructor() { super("OutsideScene"); }

    init(data = {}) {
        this.fromCourtyard = data.fromCourtyard || false;
    }

    preload() {
        if (!this.textures.exists("outside-background")) {
            this.load.image("outside-background", "images/outside.png");
        }
        Player.preload(this);
    }

    create() {
        this.cameras.main.setBackgroundColor("#11151a");
        this.physics.world.setBounds(0, 0, 900, 600);
        this.add.image(450, 300, "outside-background")
            .setDisplaySize(900, 600).setDepth(-1);

        // Mansion collision walls
        this.walls = [];
        this.createWall(255, 215, 310, 18);
        this.createWall(645, 215, 310, 18);
        this.createWall(450, 215, 80, 18);
        this.door = { x: 450, y: 245 };
        this.player = new Player(this, 450, this.fromCourtyard ? 355 : 490);
        this.walls.forEach(wall => {
            this.physics.add.collider(this.player.sprite, wall);
        });

        this.interactKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.E
        );

        this.prompt = this.add.text(450, 555, "Find the entrance to the building", {
            fontSize: "20px",
            color: "#f5ede4",
            backgroundColor: "rgba(15, 6, 10, 0.75)",
            padding: { x: 12, y: 8 }
        }).setOrigin(0.5).setDepth(10);
    }

    createWall(x, y, width, height) {
        const wall = this.add.rectangle(x, y, width, height, 0x29212a)
            .setVisible(false);
        this.physics.add.existing(wall, true);
        this.walls.push(wall);
    }

    update() {
        this.player.update();
        const nearDoor =
            Math.abs(this.player.x - this.door.x) < 55 &&
            this.player.y >= 225 &&
            this.player.y < 290;
        this.prompt.setText(
            nearDoor ? "Press E to enter GANKEN" : "Find the entrance to the building"
        );

        if (nearDoor && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            this.scene.start("CourtyardScene");
        }
    }
}