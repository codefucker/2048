// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  new GameManager(5, [0.3, 0.22, 0.18, 0.15, 0.1, 0.05], KeyboardInputManager, HTMLActuator, LocalStorageManager);
});
