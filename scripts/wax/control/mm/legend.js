// Wax: Legend Control
// -------------------
// Requires:
//
// * modestmaps
// * wax.Legend

// namespacing!
if (!com) {
    var com = { };
    if (!com.modestmaps) {
        com.modestmaps = { };
    }
}

// The Modest Maps version of this control is a very, very
// light wrapper around the `/lib` code for legends.
com.modestmaps.Map.prototype.legend = function(options) {
    options = options || {};
    this.legend = new wax.Legend(this.parent, options.container);
    this.legend.render([
        this.provider.getTileUrl({
            zoom: 0,
            column: 0,
            row: 0
        })
    ]);
    return this;
};
