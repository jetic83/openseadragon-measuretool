# OpenSeadragon-measuretool

An OpenSeadragon plugin that provides functionality for measure distances in an image.


## Usage

Include `dist/openseadragon-measuretool.min.js` after OpenSeadragon in your html. Then after you create a viewer:

    var measuretool = viewer.measuretool(options);

Then you can alter the selection state with any of these:

    measuretool.enable();
    measuretool.disable();
    measuretool.toggleState();

## Options

    viewer.measuretool({
        // options
        element:                 null, // html element to use for overlay
        pixelsPerMeter:          null, // ppm, used to calculate length of ruler
        toggleButton:            null, // dom element to use as toggle button
        showMeasuretoolControl:  true,
        showConfirmDenyButtons:  true,
        styleConfirmDenyButtons: true,
        returnPixelCoordinates:  true,
        keyboardShortcut:        'd', // key to toggle measurement mode
        rect:                    null,
        startRotated:            false, // useful for rotated crops
        startRotatedHeight: 0.1,
        startAngle: 0,
        onMeasurementCanceled:   null, // callback
        onMeasurementChanged:    null, // callback
        onMeasurementToggled:    null, // callback
        prefixUrl:               null, // overwrites OpenSeadragon's option
        navImages:               {
            measuretool: {
                REST:   'measuretool_rest.png',
                GROUP:  'measuretool_grouphover.png',
                HOVER:  'measuretool_hover.png',
                DOWN:   'measuretool_pressed.png'
            },
            measuretoolCancel: {
                REST:   'measuretool_cancel_rest.png',
                GROUP:  'measuretool_cancel_grouphover.png',
                HOVER:  'measuretool_cancel_hover.png',
                DOWN:   'measuretool_cancel_pressed.png'
            },
        }
    });
