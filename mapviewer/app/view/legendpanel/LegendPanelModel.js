/**
 * Created by Sarin on 8/10/2015.
 */
Ext.define('mapviewer.view.legendpanel.LegendPanelModel', {
    extend: 'Ext.app.ViewModel',
    alias: 'viewmodel.legend',

    stores: {
        /*
         A declaration of Ext.data.Store configurations that are first processed as binds to produce an effective
         store configuration. For example:

         users: {
         model: 'Legend',
         autoLoad: true
         }
         */
    },

    data: {
        legendImages: function () {
            var table = '<table class="tab_legend"><thead><tr><th>Name</th><th>Legend</th></tr></thead>';
            jQuery.each(map_config.map.layers, function (key, val) {
                var source = val.source;
                var ptype = map_config.sources[source].ptype;

                if (ptype == 'gxp_wmscsource') {
                    table += '<tr>';
                    table += '<td>' + val.name.replace(':', '<br>') + '</td><td>';

                    var src = map_config.sources[source].url
                        + '?' + 'Service=WMS&'
                        + 'REQUEST=GetLegendGraphic&' + 'VERSION=1.3.0&'
                        + 'FORMAT=image/png&'
                        + 'LAYER=' + val.name;
                    var img = '<img onerror="this.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode);" src="' + src + '">';
                    table += img + '</td></tr>';
                }
            });
            table += '</table>';
            console.log(table);
            return table;
        }()
    }
});