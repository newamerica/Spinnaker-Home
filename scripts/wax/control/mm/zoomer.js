// Wax: Zoom Control
// -----------------

// namespacing!
if (!com) {
    var com = { };
    if (!com.modestmaps) {
        com.modestmaps = { };
    }
}

// Add zoom links, which can be styled as buttons, to a `modestmaps.Map`
// control. This function can be used chaining-style with other
// chaining-style controls.
com.modestmaps.Map.prototype.zoomer = function() {
    var zoomin = $('<a class="zoomer zoomin" href="#zoomin">+</a>')
        .click($.proxy(function(e) {
            e.preventDefault();
            this.zoomIn();
        }, this))
        .appendTo(this.parent);
    var zoomout = $('<a class="zoomer zoomout" href="#zoomout">-</a>')
        .click($.proxy(function(e) {
            e.preventDefault();
            this.zoomOut();
        }, this))
        .appendTo(this.parent);
    this.addCallback('drawn', function(map, e) {
        if (map.coordinate.zoom === map.provider.outerLimits()[0].zoom) {
            zoomout.addClass('zoomdisabled');
        } else if (map.coordinate.zoom === map.provider.outerLimits()[1].zoom) {
            zoomin.addClass('zoomdisabled');
        } else {
            zoomin.removeClass('zoomdisabled');
            zoomout.removeClass('zoomdisabled');
        }
    });
    return this;
};
