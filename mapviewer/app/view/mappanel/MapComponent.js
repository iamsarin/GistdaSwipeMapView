/**
 * Created by Sarin on 1/10/2015.
 */
Ext.define('mapviewer.view.mappanel.MapComponent', {
    extend: 'GeoExt.component.Map',
    xtype: 'mapcomponent',

    requires: [
        //'mapviewer.view.main.Main'
    ],

    map: mapviewer.view.mappanel.Map.setMap()
});