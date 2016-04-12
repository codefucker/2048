function Tile(position, color, merged) {
  this.x                = position.x;
  this.y                = position.y;
  // this.value            = value || 2;
  this.color            = color  || 1;
  this.merged           = merged || null;

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
    merged: this.merged,
    color: this.color
  };
};

Tile.prototype.save = function (next) {
  var copy = {};
  
  copy.x = this.x;
  copy.y = this.y;
  copy.color = this.color;
  
  copy.previousPosition = {
    // In order to reverse the animation, we store the
    // next position as the previous
    x: next.x,
    y: next.y
  }
  
  return copy;
}
