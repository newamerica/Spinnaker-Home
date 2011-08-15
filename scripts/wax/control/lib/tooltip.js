// Wax GridUtil
// ------------

// Wax header
var wax = wax || {};
wax.tooltip = {};

// Get the active tooltip for a layer or create a new one if no tooltip exists.
// Hide any tooltips on layers underneath this one.
wax.tooltip.getToolTip = function(feature, context, index, evt) {
    var tooltip = $(context).children('div.wax-tooltip-' +
        index +
        ':not(.removed)');
    if (tooltip.size() === 0) {
        tooltip = $("<div class='wax-tooltip wax-tooltip-" +
            index +
            "'>" +
            '</div>').html(feature);
        if (!$(context).triggerHandler('addedtooltip', [tooltip, context, evt])) {
            $(context).append(tooltip);
        }
    }
    for (var i = (index - 1); i > 0; i--) {
        var fallback = $('div.wax-tooltip-' + i + ':not(.removed)');
        if (fallback.size() > 0) {
            fallback.addClass('hidden').hide();
        }
    }
    return tooltip;
};

// Expand a tooltip to be a "popup". Suspends all other tooltips from being
// shown until this popup is closed or another popup is opened.
wax.tooltip.click = function(feature, context, index) {
    var tooltip = wax.tooltip.getToolTip(feature, context, index);
    var close = $('<a href="#close" class="close">Close</a>');
    close.click(function() {
        tooltip
            .addClass('removed')
            .fadeOut('fast', function() { $(this).remove(); });
        return false;
    });
    tooltip
        .addClass('wax-popup')
        .html(feature)
        .append(close);
};

// Show a tooltip.
wax.tooltip.select = function(feature, context, layer_id, evt) {
    if (!feature) return;

    wax.tooltip.getToolTip(feature, context, layer_id, evt);
    $(context).css('cursor', 'pointer');
    $('div', context).css('cursor', 'pointer');
};

// Hide all tooltips on this layer and show the first hidden tooltip on the
// highest layer underneath if found.
wax.tooltip.unselect = function(feature, context, layer_id, evt) {
    $(context)
        .css('cursor', 'default');
    if (layer_id) {
        $('div.wax-tooltip-' + layer_id + ':not(.wax-popup)')
            .remove();
    } else {
        $('div.wax-tooltip:not(.wax-popup)')
            .remove();
    }

    // TODO: remove
    $('div', context).css('cursor', 'default');

    $('div.wax-tooltip:first')
        .removeClass('hidden')
        .show();

    $(context).triggerHandler('removedtooltip', [feature, context, evt])
};
