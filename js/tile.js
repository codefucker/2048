function Tile(position, color) {
  this.x                = position.x;
  this.y                = position.y;
  // this.value            = value || 2;
  this.color            = color || 1;

  this.previousPosition = null;
  this.ahead            = null;
  this.dropOut          = false;
};

Tile.prototype.savePosition = function () {
  this.previousPosition = { x: this.x, y: this.y };
};

Tile.prototype.updatePosition = function (position) {
  this.x = position.x;
  this.y = position.y;
};

Tile.prototype.serialize = function () {
  
  if(this.dropOut){
    return null;
  };
  
  return {
    position: {
      x: this.x,
      y: this.y
    },
    color: this.color
  };
};
