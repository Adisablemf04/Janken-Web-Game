import Player from "../entities/player.js";

export default class OutsideScene extends Phaser.Scene {

    constructor() {
        super("OutsideScene");
    }

    init(data) {

        // Check whether player is returning from courtyard
        this.fromCourtyard = data.fromCourtyard || false;
    }

    create() {

        this.cameras.main.setBackgroundColor("#11151a");

        this.physics.world.setBounds(0, 0, 900, 600);

        // Outdoor ground
        this.add.rectangle(
            450, 300, 900, 600, 0x1b2420
        );

        // Path leading to the building entrance
        this.add.rectangle(
            450, 445, 150, 310, 0x494348
        );

        // Building exterior
        const building = this.add.rectangle(
            450, 160, 620, 280, 0x29212a
        );

        building.setStrokeStyle(4, 0x8d3345);

        // Give the building solid physics
        this.physics.add.existing(building, true);

        // Building name
        this.add.text(450, 65, "GANKEN", {
            fontSize: "38px",
            color: "#d83d55"
        }).setOrigin(0.5);

        // Main entrance door
        this.door = this.add.rectangle(
            450, 265, 110, 110, 0x58202d
        );

        this.door.setStrokeStyle(3, 0xb83c51);

        this.add.text(450, 250, "ENTRANCE", {
            fontSize: "16px",
            color: "#f5ede4"
        }).setOrigin(0.5);

        // Door handle
        this.add.circle(488, 283, 5, 0xd0a76c);

        // Decorative objects
        this.add.circle(120, 430, 65, 0x162b20);
        this.add.circle(780, 430, 65, 0x162b20);

        // Player spawn location
        // Returning players spawn closer to the entrance
        const spawnY = this.fromCourtyard ? 355 : 490;

        this.player = new Player(this, 450, spawnY);

        // Prevent walking through the building
        this.physics.add.collider(
            this.player.sprite,
            building
        );

        // Interaction key
        this.interactKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.E
        );

        // Interaction prompt
        this.prompt = this.add.text(
            450, 555,
            "Find the entrance to the building",
            {
                fontSize: "20px",
                color: "#f5ede4"
            }
        ).setOrigin(0.5);
    }

    update() {

        // Update player movement
        this.player.update();

        // Calculate distance to entrance
        const distance = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            this.door.x,
            this.door.y
        );

        const nearDoor = distance < 110;

        // Show interaction prompt
        if (nearDoor) {

            this.prompt.setText(
                "Press E to enter GANKEN"
            );

        } else {

            this.prompt.setText(
                "Find the entrance to the building"
            );
        }

        // Enter the courtyard
        if (
            nearDoor &&
            Phaser.Input.Keyboard.JustDown(this.interactKey)
        ) {

            this.scene.start("CourtyardScene");
        }
    }
}