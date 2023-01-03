(function($) {
    'use strict';

    if (!$.version || $.version.major < 2) {
        throw new Error('This version of OpenSeadragonMeasuretool requires OpenSeadragon version 2.0.0+');
    }

    $.Viewer.prototype.measuretool = function(options) {
        if (!this.measuretoolInstance || options) {
            options = options || {};
            options.viewer = this;
            this.measuretoolInstance = new $.Measuretool(options);
        }
        return this.measuretoolInstance;
    };


    /**
    * @class Measuretool
    * @classdesc Provides functionality for measuring distance in an image
    * @memberof OpenSeadragon
    * @param {Object} options
    */
    $.Measuretool = function (options) {

        $.extend( true, this, {
            // internal state properties
            viewer:                  null,
            isMeasuring:             false,
            buttonActiveImg:         false,
            rectDone:                true,
            quadrant:                0,
            switched:                false,

            // options
            element:                 null,
            pixelsPerMeter:          null,
            toggleButton:            null,
            showMeasuretoolControl:  true,
            showConfirmDenyButtons:  true,
            styleConfirmDenyButtons: true,
            returnPixelCoordinates:  true,
            keyboardShortcut:        'd',
            rect:                    null,
            startRotated:            false, // useful for rotated crops
            startRotatedHeight: 0.1,
            startAngle: 0,
            onMeasurementCanceled:   null,
            onMeasurementChanged:    null,
            onMeasurementToggled:    null
        }, options );

        if (!this.element) {
            this.element = $.makeNeutralElement('div');
            this.element.className = 'measuretool-box';
            //this.element.style.backgroundColor = 'yellow';

            // add diagonal line
            var lineDiv = $.makeNeutralElement('div');
            lineDiv.style.position = 'absolute';
            lineDiv.style.width = '100%';
            lineDiv.style.height = '0px';
            lineDiv.style.border = '1px solid brown';
            lineDiv.style.backgroundColor = 'brown';
            lineDiv.className = 'measuretool-box-line';
            this.element.appendChild(lineDiv);

            // add info box
            var infoDiv = $.makeNeutralElement('div');
            infoDiv.style.position = 'absolute';
            infoDiv.style.color = 'brown';
            infoDiv.style.fontWeight = 'bold';
            infoDiv.style.padding = '2px';
            infoDiv.style.top = '50%';
            infoDiv.style.left = '50%';
            infoDiv.style.minWidth = '5em';
            infoDiv.style.textAlign = 'center';
            infoDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
            infoDiv.className = 'measuretool-box-info';
            this.element.appendChild(infoDiv);
        }
        //this.borders = this.borders || [];
        var corners = [];
        for (var i = 0; i < 2; i++) {
            
            corners[i]                  = $.makeNeutralElement('div');
            corners[i].className        = 'corner-' + i + '-handle';
            corners[i].id               = 'corner-' + i;
            corners[i].style.position   = 'absolute';
            corners[i].style.width      = '10px';
            corners[i].style.height     = '10px';
            corners[i].style.background = '#000';
            corners[i].style.border     = '1px solid #ccc';
            new $.MouseTracker({
                element:     corners[i],
                dragHandler: onCornerDrag.bind(this, i),
                dragEndHandler: onCornerDragEnd.bind(this, i),
            });

            // defer corners, so they are appended last
            setTimeout(this.element.appendChild.bind(this.element, corners[i]), 0);
        }
        corners[0].style.bottom = '-5px';
        corners[0].style.left = '-5px';
        corners[1].style.top = '-5px';
        corners[1].style.right = '-5px';
        
        if (!this.overlay) {
            this.overlay = new $.MeasuretoolOverlay(this.element, this.rect || new $.MeasuretoolRect());
        }
/*
        this.innerTracker = new $.MouseTracker({
            element:            this.element,
            clickTimeThreshold: this.viewer.clickTimeThreshold,
            clickDistThreshold: this.viewer.clickDistThreshold,
          //  dragHandler:        $.delegate( this, onInsideDrag ),
          //  dragEndHandler:     $.delegate( this, onInsideDragEnd ),
            // keyHandler:         $.delegate( this, onKeyPress ),
            clickHandler:       $.delegate( this, onClick ),
            // scrollHandler:      $.delegate( this.viewer, this.viewer.innerTracker.scrollHandler ),
            // pinchHandler:       $.delegate( this.viewer, this.viewer.innerTracker.pinchHandler ),
        });
        */
        this.outerTracker = new $.MouseTracker({
            element:            this.viewer.canvas,
            clickTimeThreshold: this.viewer.clickTimeThreshold,
            clickDistThreshold: this.viewer.clickDistThreshold,
            dragHandler:        $.delegate( this, onOutsideDrag ),
            dragEndHandler:     $.delegate( this, onOutsideDragEnd ),
            clickHandler:       $.delegate( this, onClick ),
            startDisabled:      !this.isMeasuring,
        });

        if (this.keyboardShortcut) {
            $.addEvent(
                this.viewer.container,
                'keypress',
                $.delegate(this, onKeyPress),
                false
            );
        }

        var useGroup = this.viewer.buttons && this.viewer.buttons.buttons;
        var anyButton = useGroup ? this.viewer.buttons.buttons[0] : null;
        var onFocusHandler = anyButton ? anyButton.onFocus : null;
        var onBlurHandler = anyButton ? anyButton.onBlur : null;
        if (this.showMeasuretoolControl) {
            this.toggleButton = new $.Button({
                element:    this.toggleButton ? $.getElement( this.toggleButton ) : null,
                clickTimeThreshold: this.viewer.clickTimeThreshold,
                clickDistThreshold: this.viewer.clickDistThreshold,
                tooltip:    $.getString('Tooltips.MeasuretoolToggle') || 'Toggle measuretool',
                onRelease:  this.toggleState.bind( this ),
                onFocus:    onFocusHandler,
                onBlur:     onBlurHandler
            });
            if (useGroup) {
                this.viewer.buttons.buttons.push(this.toggleButton);
                this.viewer.buttons.element.appendChild(this.toggleButton.element);
            }
            if (this.toggleButton.imgDown) {
                this.buttonActiveImg = this.toggleButton.imgDown.cloneNode(true);
                this.toggleButton.element.appendChild(this.buttonActiveImg);
            }
        }
        if (this.showConfirmDenyButtons) {
            this.cancelButton = new $.Button({
                element:    this.cancelButton ? $.getElement( this.cancelButton ) : null,
                clickTimeThreshold: this.viewer.clickTimeThreshold,
                clickDistThreshold: this.viewer.clickDistThreshold,
                tooltip:    $.getString('Tooltips.MeasuretoolConfirm') || 'Cancel measuretool',
                onRelease:  this.cancel.bind( this ),
                onFocus:    onFocusHandler,
                onBlur:     onBlurHandler
            });
            var cancel = this.cancelButton.element;
            cancel.classList.add('cancel-button');
            this.element.appendChild(cancel);

            if (this.styleConfirmDenyButtons) {
                cancel.style.position = 'absolute';
                cancel.style.top = '50%';
                cancel.style.left = '50%';
                cancel.style.transform = 'translate(0, -50%)';
            }
        }

        this.viewer.addHandler('measurement_cancel', this.onMeasurementCanceled);
        this.viewer.addHandler('measurement_change', this.onMeasurementChange);
        this.viewer.addHandler('measurement_toggle', this.onMeasurementToggled);

        this.viewer.addHandler('open', this.draw.bind(this));
        this.viewer.addHandler('animation', this.draw.bind(this));
        this.viewer.addHandler('resize', this.draw.bind(this));
        this.viewer.addHandler('rotate', this.draw.bind(this));
    };

    $.extend($.Measuretool.prototype, $.ControlDock.prototype, /** @lends OpenSeadragon.Selection.prototype */{

        toggleState: function() {
            return this.setState(!this.isMeasuring);
        },

        setState: function(enabled) {
            this.isMeasuring = enabled;
            this.viewer.setMouseNavEnabled(!enabled);
            // this.viewer.innerTracker.setTracking(!enabled);
            this.outerTracker.setTracking(enabled);
            enabled ? this.draw() : this.undraw();
            if (this.buttonActiveImg) {
                this.buttonActiveImg.style.visibility = enabled ? 'visible' : 'hidden';
            }
            this.viewer.raiseEvent('measurement_toggle', { enabled: enabled });
            return this;
        },

        enable: function() {
            return this.setState(true);
        },

        disable: function() {
            return this.setState(false);
        },

        draw: function() {
            if (this.rect) {

                var _quadrant = this.quadrant;

                var degrees = this.viewer.viewport.getRotation();
                
                if (document.getElementById('corner-0')) {
                    switch (_quadrant) {
                        case 0:
                            document.getElementById('corner-0').style.right = '';
                            document.getElementById('corner-1').style.left = '';

                            document.getElementById('corner-0').style.left = '-5px';
                            document.getElementById('corner-1').style.right = '-5px';
                            break;
                        case 1:
                            document.getElementById('corner-0').style.left = '';
                            document.getElementById('corner-1').style.right = '';

                            document.getElementById('corner-0').style.right = '-5px';
                            document.getElementById('corner-1').style.left = '-5px';
                            break;
                        case 2:
                            document.getElementById('corner-0').style.right = '';
                            document.getElementById('corner-1').style.left = '';

                            document.getElementById('corner-0').style.left = '-5px';
                            document.getElementById('corner-1').style.right = '-5px';
                            break;
                        case 3:
                            document.getElementById('corner-0').style.left = '';
                            document.getElementById('corner-1').style.right = '';

                            document.getElementById('corner-0').style.right = '-5px';
                            document.getElementById('corner-1').style.left = '-5px';
                            break;
                    }
                }

                var result = this.rect.clone();
                var real = this.viewer.viewport.viewportToViewerElementRectangle(result);
                real = $.MeasuretoolRect.fromRect(real);
                real.rotation = result.rotation;
                result = real;
                
                var lineDiv = this.element.children[0];
                var lineDivWidthNew = Math.sqrt(Math.pow(result.width, 2) + Math.pow(result.height, 2));
                this.drawLength(lineDivWidthNew);
                lineDiv.style.width = lineDivWidthNew + 'px';
                var a = Math.atan(result.height / result.width) * (180 / Math.PI);

                if (_quadrant === 0 || _quadrant === 2) {
                    if (degrees >= 270) {
                        if (this.startAngle >= 270) {
                            a = 90 - a;
                        } else {
                            a -= 90;
                        }
                    } else if (degrees >= 180) {
                        
                    } else if (degrees >= 90) {
                        if (this.startAngle >= 90 && this.startAngle < 180) {
                            a = 90 - a;
                        } else {
                            a -= 90;
                        }
                    }
                    if (this.startAngle >= 270 && degrees >= 270 || (this.startAngle >= 90 && this.startAngle < 180 && degrees >= 90 && degrees < 180)) {
                        lineDiv.style.transform = 'translateY(' + result.width / 2 + 'px) translateX(-' + (lineDivWidthNew - result.height) / 2 + 'px) rotate(-' + a + 'deg)';
                    } else {
                        lineDiv.style.transform = 'translateY(' + result.height / 2 + 'px) translateX(-' + (lineDivWidthNew - result.width) / 2 + 'px) rotate(-' + a + 'deg)';
                    }
                } else if (_quadrant === 1 || _quadrant === 3) {
                    if (degrees >= 270) {
                        a = 90 - a;
                        lineDiv.style.transform = 'translateY(' + result.width / 2 + 'px) translateX(-' + (lineDivWidthNew - result.height) / 2 + 'px) rotate(' + a + 'deg)';
                    } else if (degrees >= 180) {
                        lineDiv.style.transform = 'translateY(' + result.height / 2 + 'px) translateX(-' + (lineDivWidthNew - result.width) / 2 + 'px) rotate(' + a + 'deg)';
                    } else if (degrees >= 90) {
                        a = 90 - a;
                        lineDiv.style.transform = 'translateY(' + result.width / 2 + 'px) translateX(-' + (lineDivWidthNew - result.height) / 2 + 'px) rotate(' + a + 'deg)';
                    } else {
                        lineDiv.style.transform = 'translateY(' + result.height / 2 + 'px) translateX(-' + (lineDivWidthNew - result.width) / 2 + 'px) rotate(' + a + 'deg)';
                    }
                } /*else if (_quadrant === 2) {
                    if (degrees >= 270) {
                        if (this.startAngle >= 270) {
                            a = 90 - a;
                        } else {
                            a -= 90;
                        }
                    } else if (degrees >= 180) {

                    } else if (degrees >= 90) {
                        if (this.startAngle >= 90 && this.startAngle < 180) {
                            a = 90 - a;
                        } else {
                            a -= 90;
                        }
                    }
                    if (this.startAngle >= 270 && degrees >= 270 || (this.startAngle >= 90 && this.startAngle < 180 && degrees >= 90 && degrees < 180)) {
                        lineDiv.style.transform = 'translateY(' + result.width / 2 + 'px) translateX(-' + (lineDivWidthNew - result.height) / 2 + 'px) rotate(-' + a + 'deg)';
                    } else {
                        lineDiv.style.transform = 'translateY(' + result.height / 2 + 'px) translateX(-' + (lineDivWidthNew - result.width) / 2 + 'px) rotate(-' + a + 'deg)';
                    }
                } else if (_quadrant === 3) {
                    if (degrees >= 270) {
                        a = 90 - a;
                        lineDiv.style.transform = 'translateY(' + result.width / 2 + 'px) translateX(-' + (lineDivWidthNew - result.height) / 2 + 'px) rotate(' + a + 'deg)';
                    } else if (degrees >= 180) {
                        lineDiv.style.transform = 'translateY(' + result.height / 2 + 'px) translateX(-' + (lineDivWidthNew - result.width) / 2 + 'px) rotate(' + a + 'deg)';
                    } else if (degrees >= 90) {
                        a = 90 - a;
                        lineDiv.style.transform = 'translateY(' + result.width / 2 + 'px) translateX(-' + (lineDivWidthNew - result.height) / 2 + 'px) rotate(' + a + 'deg)';
                    } else {
                        lineDiv.style.transform = 'translateY(' + result.height / 2 + 'px) translateX(-' + (lineDivWidthNew - result.width) / 2 + 'px) rotate(' + a + 'deg)';
                    }
                } // */

                this.overlay.update(this.rect.normalize());
                this.overlay.drawHTML(this.viewer.drawer.container, this.viewer.viewport);
            }
            this.viewer.raiseEvent('measurement_change', this.rect ? this.rect.normalize() : null);
            return this;
        },

        undraw: function() {
            this.overlay.destroy();
            this.rect = null;
            return this;
        },

        cancel: function () {
            if (this.rect) {
                var result = this.rect.normalize();
                if (this.returnPixelCoordinates) {
                    var real = this.viewer.viewport.viewportToImageRectangle(result);
                    real = $.MeasuretoolRect.fromRect(real).round();
                    real.rotation = result.rotation;
                    result = real;
                }
                this.viewer.raiseEvent('measurement_cancel', result);
                this.undraw();
            }
            return this;
        },

        drawLength: function (pixelLength) {
            var infoDiv = this.element.children[1];
            var viewport = this.viewer.viewport;
            var zoom = this.viewer.world.getItemAt(0).viewportToImageZoom(viewport.getZoom(true));
            var currentPPM = zoom * this.pixelsPerMeter;
            var text = getRoundedWithUnit(pixelLength / currentPPM, 2, 'm');
            infoDiv.innerHTML = text;
            var degrees = this.viewer.viewport.getRotation();
            infoDiv.style.transform = 'rotate(-' + degrees + 'deg)';
        }

    });

    function onOutsideDrag(e) {
        if (this.rectDone && this.rect) {
            this.rectDone = false;
            this.rect = null;
        }
        // Disable move when makeing new selection
        this.viewer.setMouseNavEnabled(false);
        var delta = this.viewer.viewport.deltaPointsFromPixels(e.delta, true);
        var end = this.viewer.viewport.pointFromPixel(e.position, true);
        var start = new $.Point(end.x - delta.x, end.y - delta.y);
        var degrees = this.viewer.viewport.getRotation();
        this.startAngle = degrees;
        if (!this.rect) {
            if (this.startRotated) {
                this.rotatedStartPoint = start;
                this.rect = getPrerotatedRect(start, end, this.startRotatedHeight);
            } else {
                this.rect = new $.MeasuretoolRect(start.x, start.y, delta.x, delta.y);
            }
            this.rectDone = false;
        } else {
            this.rect.width += delta.x;
            this.rect.height += delta.y;

            if (end.x - this.rect.x < 0) {
                if (end.y - this.rect.y < 0) {
                    this.quadrant = 1;
                    this.switched = false;
                } else {
                    this.quadrant = 2;
                    this.switched = true;
                }
            } else if (end.y - this.rect.y < 0) {
                this.quadrant = 0;
                this.switched = false;
            } else {
                this.quadrant = 3;
                this.switched = true;
            }

            //msg(this.quadrant + (this.switched ? " switched" : ""), "#000", 1, true);
        }
        this.draw();
    }

    function onOutsideDragEnd() {
        // Enable move after new selection is done
        this.viewer.setMouseNavEnabled(true);
        this.rectDone = true;

        //this.outerTracker.setTracking(false);
    }

    function onClick() {
        this.viewer.canvas.focus();
    }

    function onCornerDrag(corner, e) {
        var delta = e.delta;
        var rotation = this.rect.getDegreeRotation();
        var degrees = this.viewer.viewport.getRotation();
        this.startAngle = degrees;
        var center;
        if (rotation !== 0) {
            // adjust vector
            delta = delta.rotate(-1 * rotation, new $.Point(0, 0));
            center = this.rect.getCenter();
        }
        delta = this.viewer.viewport.deltaPointsFromPixels(delta, true);
        var currentCorner = corner;
        if (this.switched) {
            currentCorner = 1 - currentCorner;
        }
        switch (currentCorner) {
            case 0:
                this.rect.y += delta.y;
                this.rect.height -= delta.y;
                this.rect.x += delta.x;
                this.rect.width -= delta.x;
                break;
            case 1:
                this.rect.width += delta.x;
                this.rect.height += delta.y;
                break;
        }
        
        if (this.rect.width < 0) {
            if (this.rect.height < 0) {
                this.quadrant = 1;
            } else {
                this.quadrant = 2;
            }
        } else if (this.rect.height < 0) {
            this.quadrant = 0;
        } else {
            this.quadrant = 3;
        }

        if (corner === 0) {
            this.quadrant = (this.quadrant + 2) % 4;
        }

        if (rotation !== 0) {
            // calc center deviation
            var newCenter = this.rect.getCenter();
            // rotate new center around old
            var target = newCenter.rotate(rotation, center);
            // adjust new center
            delta = target.minus(newCenter);
            this.rect.x += delta.x;
            this.rect.y += delta.y;
        }

        //msg(this.quadrant + (this.switched ? " switched" : ""), "#000", 1, true);

        this.draw();
    }


    function onCornerDragEnd(corner) {
        if (corner === 0) {
            this.switched = this.quadrant === 0 || this.quadrant === 1;
        }
        else if (corner === 1) {
            this.switched = this.quadrant === 2 || this.quadrant === 3;
        }
    }

    function onKeyPress(e) {
        var key = e.keyCode ? e.keyCode : e.charCode;
        if (key === 13) {
            this.confirm();
        } else if (String.fromCharCode(key) === this.keyboardShortcut) {
            this.toggleState();
        }
    }

    function getPrerotatedRect(start, end, height) {
        if (start.x > end.x) {
            // always draw left to right
            var x = start;
            start = end;
            end = x;
        }
        var delta = end.minus(start);
        var dist = start.distanceTo(end);
        var angle = -1 * Math.atan2(delta.x, delta.y) + (Math.PI / 2);
        var center = new $.Point(
            delta.x / 2 + start.x,
            delta.y / 2 + start.y
        );
        var rect = new $.MeasuretoolRect(
            center.x - (dist / 2),
            center.y - (height / 2),
            dist,
            height,
            angle
        );
        var heightModDelta = new $.Point(0, height);
        heightModDelta = heightModDelta.rotate(rect.getDegreeRotation(), new $.Point(0, 0));
        rect.x += heightModDelta.x / 2;
        rect.y += heightModDelta.y / 2;
        return rect;
    }

    

    function getWithUnit(value, unitSuffix) {
        if (value < 0.000001) {
            return value * 1000000000 + ' n' + unitSuffix;
        }
        if (value < 0.00001) { // mm measure up to 10 micrometer, then micrometer measure.
            return value * 1000000 + ' μ' + unitSuffix;
        }
        if (value < 1) {
            return value * 1000 + ' m' + unitSuffix;
        }
        if (value >= 1000) {
            return value / 1000 + ' k' + unitSuffix;
        }
        return value + ' ' + unitSuffix;
    }

    function getRoundedWithUnit(value, sig, unitSuffix) {
        if (sig < 0) {
            return getWithUnit(value, unitSuffix);
        }

        var factor = Math.pow(10, sig);

        if (value < 0.000001) {
            return Math.round(factor * value * 1000000000) / factor + ' n' + unitSuffix;
        }
        if (value < 0.00001) { // mm measure up to 10 micrometer, then micrometer measure.
            return Math.round(factor * value * 1000000) / factor + ' μ' + unitSuffix;
        }
        if (value < 1) {
            return Math.round(factor * value * 1000) / factor + ' m' + unitSuffix;
        }
        if (value >= 1000) {
            return Math.round(factor * value / 1000) / factor + ' k' + unitSuffix;
        }
        return Math.round(factor * value) / factor + ' ' + unitSuffix;
    }


})(OpenSeadragon);
