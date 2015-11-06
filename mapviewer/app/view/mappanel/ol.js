/**
 * Created by Sarin on 5/10/2015.
 */
Ext.define('mapviewer.view.mappanel.ol', {

    statics: {
        FullScreenControl: function (opt_options) {
            var options = opt_options || {};
            var toggleFullScreen = function () {
                $('.x-viewport').toggleFullScreen();
            };

            $(document).bind("fullscreenchange", function () {
                if ($(document).fullScreen()) {
                    $('#btn_fullscreen').html('×').attr("title", "Exit Full Screen");
                } else {
                    $('#btn_fullscreen').html('↔').attr("title", "Full Screen");
                }
            });

            $(document).bind("fullscreenerror", function () {
                $('#btn_fullscreen').html('↔').attr("title", "Full Screen");
            });

            var button = document.createElement('button');
            button.setAttribute('id', 'btn_fullscreen');
            button.setAttribute('title', 'Full Screen');
            button.innerHTML = '↔';

            button.addEventListener('click', toggleFullScreen, false);
            button.addEventListener('touchstart', toggleFullScreen, false);

            var element = document.createElement('div');
            element.className = 'full-screen ol-unselectable ol-control';
            element.appendChild(button);

            ol.control.Control.call(this, {
                element: element,
                target: options.target
            });
        },
        zoomToWorldControl: function (opt_options) {
            var options = opt_options || {};

            var button = document.createElement('button');
            button.setAttribute('id', 'btn_zoomtoworld');
            button.setAttribute('title', 'Zoom to World');
            button.innerHTML = '<i class="fa fa-arrows-alt"></i>';

            $(button).click(function () {
                var Map = mapviewer.view.mappanel.Map;
                Map.zoomToWorld(Map.map);
            });

            var element = document.createElement('div');
            element.className = 'zoomtoworld ol-unselectable ol-control';
            element.appendChild(button);

            ol.control.Control.call(this, {
                element: element,
                target: options.target
            });
        },

        printMap: function (opt_options) {
            var options = opt_options || {};

            var button = document.createElement('button');
            button.setAttribute('title', 'Print This Map');
            button.innerHTML = '<i class="fa fa-print"></i>';



            $(button).click(function () {
                var link = document.createElement('a');
                link.setAttribute('download', map_config.about['title'] +'.png');
                var canvas = $('canvas')[0];
                var dt = canvas.toDataURL('image/png');
                link.href = dt.replace(/^data:image\/[^;]/, 'data:application/octet-stream');
                link.click();
            });

            var element = document.createElement('div');
            element.className = 'printMap ol-unselectable ol-control';
            element.appendChild(button);

            ol.control.Control.call(this, {
                element: element,
                target: options.target
            });
        },

        map3dControl: function (opt_options) {
            var options = opt_options || {};

            var button = document.createElement('button');
            var jbutton = $(button);
            button.setAttribute('id', 'btn_3dmap');
            button.setAttribute('title', 'Switch to 3D Viewer');
            button.setAttribute('class', 'unpressed');
            button.innerHTML = '<i class="fa fa-globe" style="color: white"></i>';

            $(button).click(function () {
                var Map = mapviewer.view.mappanel.Map;
                var element = $('.ol-overviewmap-map').parent();
                console.log(element);
                if (Map.ol3d.getEnabled()) {
                    element.removeClass('hidden');
                    Map.ol3d.setEnabled(false);
                } else {
                    element.addClass('hidden');
                    Map.ol3d.setEnabled(true);
                }
                jbutton.toggleClass("unpressed pressed");
                if (Map.draw) {
                    try {
                        Map.draw.finishDrawing();
                    } catch (error) {
                    }
                }
                Map.clearMeasure();
                Map.getMap().removeInteraction(Map.draw);
            });

            var element = document.createElement('div');
            element.className = 'switch3dMap ol-unselectable ol-control';
            element.appendChild(button);

            ol.control.Control.call(this, {
                element: element,
                target: options.target
            });
        },
        measureControl: function (opt_options) {
            var options = opt_options || {};

            var button = document.createElement('button');
            button.setAttribute('id', 'btn_measure');
            button.setAttribute('title', 'Measure');
            button.setAttribute('class', 'mv-ruler_white-icon unpressed');

            var splitElement = document.createElement('div');
            var lengthButton = document.createElement('button');
            var areaButton = document.createElement('button');
            var circleButton = document.createElement('button');
            $(circleButton).append('<i class="fa fa-circle-thin"></i>');

            splitElement.setAttribute('id', 'btn_split');
            lengthButton.setAttribute('id', 'btn_length');
            areaButton.setAttribute('id', 'btn_area');
            circleButton.setAttribute('id', 'btn_circle');

            lengthButton.setAttribute('title', 'Length');
            areaButton.setAttribute('title', 'Area');
            circleButton.setAttribute('title', 'Circle');

            splitElement.className = 'hidden';
            lengthButton.className = 'lengthControl mv-ruler_white-icon ol-unselectable ol-control';
            areaButton.className = 'areaControl mv-ruler_square_white-icon ol-unselectable ol-control';
            circleButton.className = 'circleControl ol-unselectable ol-control';

            splitElement.appendChild(lengthButton);
            splitElement.appendChild(areaButton);
            splitElement.appendChild(circleButton);

            var element = document.createElement('div');
            element.className = 'measureTools ol-unselectable ol-control';
            element.appendChild(button);
            element.appendChild(splitElement);

            var jbutton = $(button);
            var jsplitElement = $(splitElement);
            var jelement = $(element);
            var jlengthButton = $(lengthButton);
            var jareaButton = $(areaButton);
            var jcircleButton = $(circleButton);
            var is_touch_device = mapviewer.view.mappanel.Map.is_touch_device();
            jbutton.attr('pressed', 'false');
            var timer;
            if (!is_touch_device) {
                jelement.hover(function (event) {
                    if (event.type === 'mouseenter') {
                        clearTimeout(timer);
                        jsplitElement.removeClass('hidden');
                    } else if (event.type === 'mouseleave') {
                        timer = setTimeout(function () {
                            jsplitElement.addClass('hidden');
                        }, 1000);
                    }
                });
                jbutton.click(function () {
                    if (jbutton.attr('pressed') === 'true') {
                        jbutton.attr('pressed', 'false');
                        jbutton.removeClass('pressed');
                        jbutton.addClass('unpressed');
                        addInteraction();
                        jsplitElement.addClass('hidden');
                    } else {
                        jbutton.attr('pressed', 'true');
                        addInteraction('LineString');
                    }
                });
            } else {
                jbutton.bind('touchstart', function () {
                    if (jbutton.attr('pressed') === 'true') {
                        jbutton.attr('pressed', 'false');
                        jbutton.removeClass('pressed');
                        jbutton.addClass('unpressed');
                        addInteraction();
                        clearTimeout(timer);
                        jsplitElement.addClass('hidden');
                    } else {
                        jsplitElement.removeClass('hidden');
                        timer = setTimeout(function () {
                            jsplitElement.addClass('hidden');
                        }, 1000);
                    }
                });
            }

            jsplitElement.click(function () {
                jsplitElement.addClass('hidden');
            });

            function addInteraction(type) {
                var Map = mapviewer.view.mappanel.Map;


                if (Map.draw) {
                    try {
                        Map.draw.finishDrawing();
                    } catch (error) {

                    }
                }
                Map.clearMeasure();
                Map.getMap().removeInteraction(Map.draw);
                if (type) {
                    jbutton.attr('pressed', 'true');
                    jbutton.removeClass('unpressed');
                    jbutton.addClass('pressed');
                    Map.addInteraction(type);
                }
            }

            jlengthButton.click(function () {
                addInteraction('LineString');
            });

            jareaButton.click(function () {
                addInteraction('Polygon');
            });

            jcircleButton.click(function () {
                addInteraction('Circle');
            });

            ol.control.Control.call(this, {
                element: element,
                target: options.target
            });
        }
    }

});