export default class Player {

    constructor(scene, x, y) {
        this.scene = scene;
        this.speed = 170;

        // Temporary player character
        this.sprite = scene.add.rectangle(
            x, y, 28, 34, 0xf5ede4
        );

        this.sprite.setStrokeStyle(2, 0xd3263d);

        // Enable physics
        scene.physics.add.existing(this.sprite);

        // Prevent leaving the map
        this.sprite.body.setCollideWorldBounds(true);

        // Keyboard controls
        this.keys = scene.input.keyboard.addKeys(
            "W,A,S,D"
        );

        this.cursors =
            scene.input.keyboard.createCursorKeys();
    }

    update() {
        let x = 0;
        let y = 0;

        // Horizontal movement
        if (this.keys.A.isDown || this.cursors.left.isDown) {
            x = -1;
        } else if (
            this.keys.D.isDown ||
            this.cursors.right.isDown
        ) {
            x = 1;
        }

        // Vertical movement
        if (this.keys.W.isDown || this.cursors.up.isDown) {
            y = -1;
        } else if (
            this.keys.S.isDown ||
            this.cursors.down.isDown
        ) {
            y = 1;
        }

        // Normalise diagonal movement
        const length = Math.hypot(x, y) || 1;

        this.sprite.body.setVelocity(
            (x / length) * this.speed,
            (y / length) * this.speed
        );
    }

    get x() {
        return this.sprite.x;
    }

    get y() {
        return this.sprite.y;
    }
}