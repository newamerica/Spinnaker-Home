// Wax header
var wax = wax || {};
wax.ol = wax.ol || {};

// An interaction toolkit for tiles that implement the
// [MBTiles UTFGrid spec](https://github.com/mapbox/mbtiles-spec)
wax.ol.Interaction =
    OpenLayers.Class(OpenLayers.Control, {
    feature: {},
    handlerOptions: null,
    handlers: null,

    gm: new wax.GridManager(),

    initialize: function(options) {
        this.options = options || {};
        this.clickAction = this.options.clickAction || 'full';
        OpenLayers.Control.prototype.initialize.apply(this, [this.options || {}]);

        this.callbacks = {
            out: wax.tooltip.unselect,
            over: wax.tooltip.select,
            click: wax.tooltip.click
        };
    },

    setMap: function(map) {
        $(map.viewPortDiv).bind('mousemove', $.proxy(this.getInfoForHover, this));
        $(map.viewPortDiv).bind('mouseout', $.proxy(this.resetLayers, this));
        this.clickHandler = new OpenLayers.Handler.Click(
            this, {
                click: this.getInfoForClick
            }
        );

        this.clickHandler.setMap(map);
        this.clickHandler.activate();

        map.events.on({
            addlayer: this.resetLayers,
            changelayer: this.resetLayers,
            removelayer: this.resetLayers,
            changebaselayer: this.resetLayers,
            scope: this
        });

        OpenLayers.Control.prototype.setMap.apply(this, arguments);
    },

    // Get an Array of the stack of tiles under the mouse.
    // This operates with pixels only, since there's no way
    // to bubble through an element which is sitting on the map
    // (like an SVG overlay).
    //
    // If no tiles are under the mouse, returns an empty array.
    getTileStack: function(layers, sevt) {
        var tiles = [];
        layerfound: for (var j = 0; j < layers.length; j++) {
            for (var x = 0; x < layers[j].grid.length; x++) {
                for (var y = 0; y < layers[j].grid[x].length; y++) {
                    var divpos = $(layers[j].grid[x][y].imgDiv).offset();
                    if (divpos &&
                        ((divpos.top < sevt.pageY) &&
                         ((divpos.top + 256) > sevt.pageY) &&
                         (divpos.left < sevt.pageX) &&
                         ((divpos.left + 256) > sevt.pageX))) {
                        tiles.push(layers[j].grid[x][y]);
                    continue layerfound;
                    }
                }
            }
        }
        return tiles;
    },

    // Get all interactable layers
    viableLayers: function() {
        if (this._viableLayers) return this._viableLayers;
        return this._viableLayers = $(this.map.layers).filter(
            function(i) {
            // TODO: make better indication of whether
            // this is an interactive layer
            return (this.map.layers[i].visibility === true) &&
                (this.map.layers[i].CLASS_NAME === 'OpenLayers.Layer.TMS');
        }
        );
    },

    resetLayers: function() {
        this._viableLayers = null;
        this.callbacks['out']();
    },

    // React to a click mouse event
    // This is the `pause` handler attached to the map.
    getInfoForClick: function(evt) {
        var layers = this.viableLayers();
        var tiles = this.getTileStack(this.viableLayers(), evt);
        var feature = null,
        g = null;
        var that = this;

        for (var t = 0; t < tiles.length; t++) {
            this.gm.getGrid(tiles[t].url, function(g) {
                if (!g) return;
                var feature = g.getFeature(evt.pageX, evt.pageY, tiles[t].imgDiv, {
                    format: that.clickAction
                });
                if (feature) {
                    switch (that.clickAction) {
                        case 'full':
                            that.callbacks.click(feature, tiles[t].layer.map.viewPortDiv, t);
                        break;
                        case 'location':
                            window.location = feature;
                        break;
                    }
                }
            });
        }
    },

    // React to a hover mouse event, by finding all tiles,
    // finding features, and calling `this.callbacks[]`
    // This is the `click` handler attached to the map.
    getInfoForHover: function(evt) {
        var options = { format: 'teaser' };
        var layers = this.viableLayers();
        var tiles = this.getTileStack(this.viableLayers(), evt);
        var feature = null,
        g = null;
        var that = this;

        for (var t = 0; t < tiles.length; t++) {
            // This features has already been loaded, or
            // is currently being requested.
            this.gm.getGrid(tiles[t].url, function(g) {
                if (g && tiles[t]) {
                    var feature = g.getFeature(evt.pageX, evt.pageY, tiles[t].imgDiv, options);
                    if (feature) {
                        if (!tiles[t]) return;
                        if (feature && that.feature[t] !== feature) {
                            that.feature[t] = feature;
                            that.callbacks.out(feature, tiles[t].layer.map.div, t, evt);
                            that.callbacks.over(feature, tiles[t].layer.map.div, t, evt);
                        } else if (!feature) {
                            that.feature[t] = null;
                            that.callbacks.out(feature, tiles[t].layer.map.div, t, evt);
                        }
                    } else {
                        // Request this feature
                        // TODO(tmcw) re-add layer
                        that.feature[t] = null;
                        if (tiles[t]) {
                            that.callbacks.out({}, tiles[t].layer.map.div, t, evt);
                        } else {
                            that.callbacks.out({}, false, t);
                        }
                    }
                }
            });
        }
    },
    CLASS_NAME: 'wax.ol.Interaction'
});
