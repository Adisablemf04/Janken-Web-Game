
import OutsideScene from "./scenes/outsidescene.js";
import CourtyardScene from "./scenes/yardscene.js";
import RoomScene from "./scenes/roomscene.js";
import BattleScene from "./scenes/battlescene.js";
import Level3Scene from "./scenes/level3scene.js";
import Level4Scene from "./scenes/level4scene.js";

import { getCurrentUser } from "./accountStorage.js";

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

    new Phaser.Game(config);
}
