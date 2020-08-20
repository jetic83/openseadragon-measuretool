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
        onMeasurementToggled:    null // callback
    });
