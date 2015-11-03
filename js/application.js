// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  // new GameManager(5, [0.3, 0.22, 0.18, 0.15, 0.1, 0.05], KeyboardInputManager, HTMLActuator, LocalStorageManager);
  
  loadJSON('inicialization.json', function(res){
    
    new GameManager(
      res.size,
      res.colorsVariability,
      KeyboardInputManager,
      HTMLActuator,
      LocalStorageManager
    );
  });
});

function loadJSON(file, callback) {
  var xobj = new XMLHttpRequest();
  
  xobj.overrideMimeType("application/json");
  xobj.open('GET', file, true); // Replace 'my_data' with the path to your file
  
  xobj.onreadystatechange = function () {
    if (xobj.readyState == 4 && xobj.status == "200") {
      // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
      callback(JSON.parse(xobj.responseText));
    }
  };
  xobj.send(null);
}