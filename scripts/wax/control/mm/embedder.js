// Wax: Embedder Control
// -------------------

// namespacing!
if (!com) {
    var com = { };
    if (!com.modestmaps) {
        com.modestmaps = { };
    }
}

com.modestmaps.Map.prototype.embedder = function(options) {
    options = options || {};
    if ($('#' + this.el + '-script').length) {
      $(this.parent).prepend($('<input type="text" class="embed-src" />')
        .css({
            'z-index': '9999999999',
            'position': 'relative'
        })
        .val("<div id='" + this.el + "-script'>" + $('#' + this.el + '-script').html() + '</div>'));
    }
    return this;
};
