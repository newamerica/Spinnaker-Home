// Wax: Fullscreen
// -----------------
// A simple fullscreen control for Modest Maps

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
com.modestmaps.Map.prototype.fullscreen = function() {
    // Modest Maps demands an absolute height & width, and doesn't auto-correct
    // for changes, so here we save the original size of the element and
    // restore to that size on exit from fullscreen.
    $('<a class="wax-fullscreen" href="#fullscreen">fullscreen</a>')
        .toggle(
            $.proxy(function(e) {
                e.preventDefault();
                this.smallSize = [$(this.parent).width(), $(this.parent).height()];
                $(this.parent).addClass('wax-fullscreen-map');
                this.setSize(
                    $(this.parent).outerWidth(),
                    $(this.parent).outerHeight());
            }, this),
            $.proxy(function(e) {
                e.preventDefault();
                $(this.parent).removeClass('wax-fullscreen-map');
                this.setSize(
                    this.smallSize[0],
                    this.smallSize[1]);
            }, this)
        )
        .appendTo(this.parent);
    return this;
};
