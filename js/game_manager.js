function GameManager(size, colors, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.colors         = colors;
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("goBack", this.move.bind(this, -1));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));
  
  this.undoStack = [];

  this.setup();
}

// Restart the game
GameManager.prototype.restart = function () {
  this.storageManager.clearGameState();
  this.actuator.continueGame(); // Clear the game won/lost message
  this.setup();
};

// Keep playing after winning (allows going over 2048)
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continueGame(); // Clear the game won/lost message
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
  return this.over || (this.won && !this.keepPlaying);
};

// Set up the game
GameManager.prototype.setup = function () {
  var previousState = this.storageManager.getGameState();

  // Reload the game from a previous game if present
  if (previousState) {
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.keepPlaying = previousState.keepPlaying;
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.keepPlaying = false;

    // Add the initial tiles
    this.addStartTiles();
  }

  // Update the actuator
  this.actuate();
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    
    var total = this.colors.reduce(function(sum, current) {
      return sum + current;
    }, 0);
    
    var color;
    var rand = Math.random() * total;
    var sum = 0;
    
    for (var i = 0; i < this.colors.length; i++) {
        sum += this.colors[i];
        // sum = +weight_sum.toFixed(2);
         
        if (rand <= sum) {
            color = i + 1;
            break;
        };
    }
    
    var tile = new Tile(this.grid.randomAvailableCell(), color);
    
    var nearTiles = this.findSimilarTilesNear(tile);
    
    if(nearTiles.length){
      this.addRandomTile();
    }
    
    else{
      this.grid.insertTile(tile);
    }

  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.storageManager.getBestScore() < this.score) {
    this.storageManager.setBestScore(this.score);
  }

  // Clear the state when the game is over (game over only, not win)
  if (this.over) {
    this.storageManager.clearGameState();
  } else {
    this.storageManager.setGameState(this.serialize());
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.storageManager.getBestScore(),
    terminated: this.isGameTerminated()
  });

};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying
  };
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      // tile.mergedFrom = null;
      tile.ahead = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  
  // 0: up, 1: right, 2: down, 3: left
  var self = this;
  
  if (direction == -1) {
    
    if (this.undoStack.length > 0) {
      
      var prev = this.undoStack.pop();
      
      this.grid.cells = this.grid.empty();
      this.score = prev.score;
      
      for (var i in prev.tiles) {
        var t = prev.tiles[i];
        var tile = new Tile({x: t.x, y: t.y}, t.color);
        
        tile.previousPosition = {
          x: t.previousPosition.x,
          y: t.previousPosition.y
        };
        
        this.grid.cells[tile.x][tile.y] = tile;
      }
      
      this.over = false;
      this.won = false;
      this.keepPlaying = false;
      
      this.actuate();
      
    }
    
    return;
  }

  if (this.isGameTerminated()){
    return;
  } // Don't do anything if the game's over

  var cell, tile;
  
  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;
  var droped     = false;
  var undo       = {score: this.score, tiles: []};

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  // var i = 0;
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);
      
      // i++;
      // setTimeout(function(){
        
      //   var item = document.querySelectorAll('.grid-row')[x].children[y]
        
      //   item.classList.add('highlight');
        
      //   setTimeout(function(){
      //     item.classList.remove('highlight')
      //   }, 1000);
      // }, 200 * i)

      if (tile) {
        // var positions = self.findFarthestPosition(cell, vector);
        
        if(tile.ahead !== null){
          var ahead = tile.ahead;
        }
        
        else{
          var asix = (vector.x == 0) ? 'x' : 'y';
          var ahead = self.countTilesAhead(cell, vector);
          var tilesNear = self.findSimilarTilesNear(tile, asix);
          
          if(tilesNear.length){
            var maxAhead = ahead;

            tilesNear.forEach(function(nearTile){
              var ahead = self.countTilesAhead(nearTile, vector);
              maxAhead = (maxAhead < ahead) ? ahead : maxAhead;
            });
            
            tilesNear.forEach(function(nearTile){
              nearTile.ahead = maxAhead;
            });

            tile.ahead = ahead = maxAhead;
          }
          
        }
        
        
        var farthest = {};
        
        
        if(vector.x == 0){
          farthest.x = cell.x;
        }
        
        else if(vector.x < 0){
          farthest.x = ahead;
        }
        
        else if(vector.x > 0){
          farthest.x = self.size - 1 - ahead;
        }
        
        if(vector.y == 0){
          farthest.y = cell.y;
        }
        
        else if(vector.y < 0){
          farthest.y = ahead;
        }
        
        else if(vector.y > 0){
          farthest.y = self.size - 1 - ahead;
        }
        

        undo.tiles.push(tile.save(farthest));
        
        // self.moveTile(tile, positions.farthest);
        self.moveTile(tile, farthest);


        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
        
      }
    });
  });

  var tiles  = self.grid.getTiles();
  
  tiles.forEach(function(tile){
    var tilesNear = self.findSimilarTilesNear(tile);
    
    
    if(tilesNear.length > 1){
      
      self.score += tilesNear.length + 1;
      
      tile.dropOut = true;
      droped = true;
      // self.grid.removeTile(tile);
      
      tilesNear.forEach(function(nearTile){
        nearTile.dropOut = true;
      });
    };
  });
  
  if (moved) {
    this.addRandomTile();
    
    // Save state
    this.undoStack.push(undo);

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }
    
    // if(droped){
    //   setTimeout(function(){
    //     self.move(direction);
    //   }, 500);
    // };
    
    this.actuate();
  }

};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};


GameManager.prototype.countTilesAhead = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  var count = 0;

  do {
    previous = cell;
    
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
    
    var tile = this.grid.cellContent(cell);
    
    if(tile){
      
      // console.log(tile);
      count++;
      
      if(tile.ahead){
        count += tile.ahead;
        break;
      }
    }
    
  } while (this.grid.withinBounds(cell));

  return count;
};


GameManager.prototype.findSimilarTilesNear = function (tile, asix) {
  var nearTiles = [];
  var self = this;
  var cells = this.grid.getCellsNear(tile, asix);
  
  cells.forEach(function (cell) {
    var nearTile = self.grid.cellContent(cell);
  
    if(nearTile && nearTile.color === tile.color){
      nearTiles.push(nearTile);
    };
  });
  
  return nearTiles;
};

GameManager.prototype.movesAvailable = function () {
  // return this.grid.cellsAvailable() || this.tileMatchesAvailable();
  return this.grid.cellsAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.grid.cellContent(cell);

          if (other && other.color === tile.color) {
            return true; // These two tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};
