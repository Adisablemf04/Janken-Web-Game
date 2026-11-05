
import OutsideScene from "./scenes/outsidescene.js";
import CourtyardScene from "./scenes/yardscene.js";
import RoomScene from "./scenes/roomscene.js";
import BattleScene from "./scenes/battlescene.js";

import { getCurrentUser } from "./accountStorage.js";

// Get the currently logged-in player
const currentUser = getCurrentUser();

if (!currentUser) {

    // Guests must log in before playing
    window.location.replace("login.html");

} else {

    // Phaser game configuration
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

        // Register all game scenes
        scene: [
            OutsideScene,
            CourtyardScene,
            RoomScene,
            BattleScene
        ]
    };

    // Start GANKEN
    new Phaser.Game(config);
}
