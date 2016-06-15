Ext.define("snapshot-viewer", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'display_box'}
    ],

    integrationHeaders : {
        name : "snapshot-viewer"
    },
                        
    launch: function() {
        this._fetchSnapshotNames().then({
            success: this._initializeApp,
            failure: this._showError,
            scope: this
        });
    },
    _fetchSnapshotNames: function(){
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.wsapi.Store',{
            model: 'Preference',
            fetch: ['Name','CreationDate','LastUpdateDate','Value'],
            filters: [{
                property: 'Name',
                operator: 'contains',
                value: CArABU.technicalservices.PortfolioCostApps.toolbox.snapshotPrefPrefix
            }],
            limit: 'Infinity'
        }).load({
            callback: function(records, operation, success){
                if (success){
                    deferred.resolve(records);
                } else {
                    deferred.reject(operation.error.errors.join(','));
                }
            }
        });

        return deferred;
    },
    _showError: function(msg){
        Rally.ui.notify.Notifier.showError({message: msg });
    },
    _initializeApp: function(snapshotNames){
        this.logger.log('_initializeApp', snapshotNames);

        if (!snapshotNames || snapshotNames.length === 0){
            //write something in the container.
        }

        var snapshotData = _.map(snapshotNames, function(s){
            var name = s.get('Name');
            return {
                name: CArABU.technicalservices.PortfolioCostApps.toolbox.getFriendlyNameFromSnapshotName(name),
                value: name
            };
        });
        this.logger.log('snapshotData', snapshotData);
        var cb = this.add({
            xtype: 'rallycombobox',
            store: Ext.create('Rally.data.custom.Store',{
                data: snapshotData
            }),
            multiSelect: true,
            displayField: 'name',
            valueField: 'value'
        });
        cb.on('select', this._showSnapshots, this);

    },
    _showSnapshots: function(cb){
        this.logger.log('_showSnapshots', cb.getValue());
    },
    
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        // Ext.apply(this, settings);
        this.launch();
    }
});
