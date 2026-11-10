import OutsideScene from "./scenes/outsidescene.js";
import CourtyardScene from "./scenes/yardscene.js";
import RoomScene from "./scenes/roomscene.js";
import BattleScene from "./scenes/battlescene.js";
import Level3Scene from "./scenes/level3scene.js";
import Level4Scene from "./scenes/level4scene.js";
import { getCurrentUser } from "./accountStorage.js";
import { playMusic } from "./audioManager.js";

if (!getCurrentUser()) {
    window.location.replace("login.html");
} else {
    const game = new Phaser.Game({
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
            arcade: { gravity: { x: 0, y: 0 } }
        },
        scene: [
            OutsideScene, CourtyardScene, RoomScene,
            BattleScene, Level3Scene, Level4Scene
        ]
    });

    // Change music when entering a new area
    game.events.once(Phaser.Core.Events.READY, () => {
        function updateMusic(scene) {
            const key = scene.sys.settings.key;
            if (key === "OutsideScene") {
                playMusic("outside.mp3");
            } else if (key === "CourtyardScene") {
                playMusic("inside.mp3");
            } else if (key === "RoomScene") {
                const track = scene.level <= 2
                    ? "level 1 - 2.mp3"
                    : `level ${scene.level}.mp3`;
                playMusic(track);
            }
        }
        game.scene.scenes.forEach(scene => {
            scene.events.on(Phaser.Scenes.Events.CREATE, () => updateMusic(scene));
        });
        const activeScene = game.scene.getScenes(true).find(scene =>
            ["OutsideScene", "CourtyardScene", "RoomScene"]
                .includes(scene.sys.settings.key)
        );
        if (activeScene) updateMusic(activeScene);
    });
}