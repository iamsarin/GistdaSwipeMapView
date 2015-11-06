/**
 * Created by Sarin on 1/10/2015.
 */
Ext.define('mapviewer.view.descriptionpanel.DescriptionPanelModel', {
    extend: 'Ext.app.ViewModel',
    alias: 'viewmodel.descriptionpanel',

    stores: {
        /*
        A declaration of Ext.data.Store configurations that are first processed as binds to produce an effective
        store configuration. For example:

        users: {
            model: 'DescriptionPanel',
            autoLoad: true
        }
        */
    },

    data: {
        mapName: map_config.about['title'],
        mapDesc: map_config.about['abstract']
    }
});