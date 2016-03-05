define(["underscore", "backbone", "text!sdk/toolbar.html"], function(_, Backbone, toolbarTemplate) {
  var Player = function() {
    this.facade = _.extend({}, Backbone.Events);

    this.facade.on('all', this.debug);
  };

  Player.prototype.start = function() {
    this.facade.trigger("render");
  };

  Player.prototype.debug = function() {
    if (!window.console) return;
    var args = _.toArray(arguments);
    var eventData = ['EVENT:', args.shift()];
    if (args.length) {
      eventData = eventData.concat('ARGUMENTS:', args)
    }
    console.debug.apply(console, eventData);
  };

  Player.prototype.loadFromDist = function() {
    require(["dist/gadget"], function(Gadget){ console.log(Gadget); });
  };

  return Player;
});
