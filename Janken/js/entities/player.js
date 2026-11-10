const DIRECTIONS = {
    down: { start: 0, end: 5, idle: 0 },
    left: { start: 18, end: 23, idle: 18 },
    up: { start: 12, end: 17, idle: 12 },
    right: { start: 6, end: 11, idle: 6 }
};

export default class Player {

    static preload(scene) {
        // Load the player spritesheet only if needed
        if (!scene.textures.exists("ganken-player")) {
            scene.load.spritesheet(
                "ganken-player",
                "images/characters/player.png",
                {
                    frameWidth: 32,
                    frameHeight: 32
                }
            );
        }
    }

    constructor(scene, x, y) {
        this.scene = scene;
        this.speed = 170;
        this.direction = "down";

        // Animated player character
        this.sprite = scene.physics.add.sprite(
            x, y, "ganken-player", 0
        );

        // Enlarge the pixel-art character
        this.sprite.setScale(2);

        // Keep pixel art sharp
        scene.textures.get("ganken-player").setFilter(
            Phaser.Textures.FilterMode.NEAREST
        );

        // Keep collision size close to the original player
        this.sprite.setBodySize(14, 17, true);

        // Prevent leaving the map
        this.sprite.body.setCollideWorldBounds(true);

        // Create walking animations once
        for (const [direction, frames] of Object.entries(DIRECTIONS)) {
            const key = `ganken-player-walk-${direction}`;

            if (!scene.anims.exists(key)) {
                scene.anims.create({
                    key: key,
                    frames: scene.anims.generateFrameNumbers(
                        "ganken-player",
                        {
                            start: frames.start,
                            end: frames.end
                        }
                    ),
                    frameRate: 10,
                    repeat: -1
                });
            }
        }

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

        // Walking animations
        if (x !== 0 || y !== 0) {

            if (y < 0) {
                this.direction = "up";
            } else if (y > 0) {
                this.direction = "down";
            } else if (x < 0) {
                this.direction = "left";
            } else {
                this.direction = "right";
            }

            this.sprite.anims.play(
                `ganken-player-walk-${this.direction}`,
                true
            );

        } else {

            // Return to the standing pose
            this.sprite.anims.stop();

            this.sprite.setFrame(
                DIRECTIONS[this.direction].idle
            );
        }
    }

    get x() {
        return this.sprite.x;
    }

    get y() {
        return this.sprite.y;
    }
}
