
import Player from "../entities/player.js";

export default class OutsideScene extends Phaser.Scene {

    constructor() {
        super("OutsideScene");
    }

    init(data = {}) {
        this.fromCourtyard = data.fromCourtyard || false;
    }

    preload() {
        // Outside background
        if (!this.textures.exists("outside-background")) {
            this.load.image(
                "outside-background",
                "images/outside.png"
            );
        }

        // Animated player
        Player.preload(this);
    }

    create() {
        this.cameras.main.setBackgroundColor("#11151a");
        this.physics.world.setBounds(0, 0, 900, 600);

        // Outside background
        this.add.image(
            450,
            300,
            "outside-background"
        ).setDisplaySize(900, 600).setDepth(-1);

        // Invisible collision walls around the mansion
        // Thin walls prevent entering the house but leave
        // the garden and surrounding outdoor area accessible

        this.walls = [];

        // Left side of the mansion entrance
        this.createWall(255, 215, 310, 18);

        // Right side of the mansion entrance
        this.createWall(645, 215, 310, 18);

        // Main entrance barrier
        // Player must press E to enter
        this.createWall(450, 215, 80, 18);

        // Entrance interaction position
        this.door = {
            x: 450,
            y: 245
        };

        // Player spawn location
        const spawnY = this.fromCourtyard ? 355 : 490;

        this.player = new Player(this, 450, spawnY);

        // Add collision with mansion walls
        this.walls.forEach(wall => {
            this.physics.add.collider(
                this.player.sprite,
                wall
            );
        });

        // Interaction key
        this.interactKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.E
        );

        // Interaction prompt
        this.prompt = this.add.text(
            450,
            555,
            "Find the entrance to the building",
            {
                fontSize: "20px",
                color: "#f5ede4",
                backgroundColor: "rgba(15, 6, 10, 0.75)",
                padding: { x: 12, y: 8 }
            }
        ).setOrigin(0.5).setDepth(10);
    }

    createWall(x, y, width, height) {

        // Invisible collision wall
        const wall = this.add.rectangle(
            x,
            y,
            width,
            height,
            0x29212a
        ).setVisible(false);

        this.physics.add.existing(wall, true);

        this.walls.push(wall);
    }

    update() {

        // Update player movement
        this.player.update();

        // Check if player is directly in front
        // of the mansion entrance
        const nearDoor =
            Math.abs(this.player.x - this.door.x) < 55 &&
            this.player.y >= 225 &&
            this.player.y < 290;

        // Interaction prompt
        if (nearDoor) {

            this.prompt.setText(
                "Press E to enter GANKEN"
            );

        } else {

            this.prompt.setText(
                "Find the entrance to the building"
            );
        }

        // Enter the courtyard only at the entrance
        if (
            nearDoor &&
            Phaser.Input.Keyboard.JustDown(this.interactKey)
        ) {

            this.scene.start("CourtyardScene");
        }
    }
}