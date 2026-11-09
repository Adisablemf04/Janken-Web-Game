
import OutsideScene from "./scenes/outsidescene.js";
import CourtyardScene from "./scenes/yardscene.js";
import RoomScene from "./scenes/roomscene.js";
import BattleScene from "./scenes/battlescene.js";
import Level3Scene from "./scenes/level3scene.js";
import Level4Scene from "./scenes/level4scene.js";

import { getCurrentUser } from "./accountStorage.js";
import { playMusic } from "./audioManager.js";

const currentUser = getCurrentUser();

if (!currentUser) {

    window.location.replace("login.html");

} else {

    const config = {
        type: Phaser.AUTO,

        width: 900,
        height: 600,

        parent: "game_container",

        backgroundColor: "#100508",

        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },

        physics: {
            default: "arcade",

            arcade: {
                gravity: { x: 0, y: 0 },
                debug: false
            }
        },

        scene: [
            OutsideScene,
            CourtyardScene,
            RoomScene,
            BattleScene,
            Level3Scene,
            Level4Scene
        ]
    };

    const game = new Phaser.Game(config);

    // Music changes only when entering an area or level room.
    game.events.once(Phaser.Core.Events.READY, () => {

        function updateMusic(scene) {
            const key = scene.sys.settings.key;

            if (key === "OutsideScene") {
                playMusic("outside.mp3");
            } else if (key === "CourtyardScene") {
                playMusic("inside.mp3");
            } else if (key === "RoomScene") {
                const tracks = {
                    1: "level 1 - 2.mp3",
                    2: "level 1 - 2.mp3",
                    3: "level 3.mp3",
                    4: "level 4.mp3"
                };

                playMusic(tracks[scene.level]);
            }
        }

        // Watch for scenes being created.
        game.scene.scenes.forEach(scene => {
            scene.events.on(Phaser.Scenes.Events.CREATE, () => {
                updateMusic(scene);
            });
        });

        // Handle an initial scene that is already active.
        const activeScene = game.scene.getScenes(true).find(scene =>
            ["OutsideScene", "CourtyardScene", "RoomScene"]
                .includes(scene.sys.settings.key)
        );

        if (activeScene) {
            updateMusic(activeScene);
        }
    });
}
