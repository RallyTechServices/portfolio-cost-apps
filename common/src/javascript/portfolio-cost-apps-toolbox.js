Ext.define('CArABU.technicalservices.PortfolioCostApps.toolbox',{
    singleton: true,

    snapshotPrefPrefix: 'portfolioSnapshot-v1-',
    teamCostPrefPrefix: 'costAsOf-',
    getSnapshotPreferenceName: function(name){
        return Ext.String.format("{0}{1}",CArABU.technicalservices.PortfolioCostApps.toolbox.snapshotPrefPrefix,name);
    },
    getFriendlyNameFromSnapshot: function(snap){
        var name = snap.get('Name');
        return name.replace(CArABU.technicalservices.PortfolioCostApps.toolbox.snapshotPrefPrefix,'');
    },
    getSnapshotModelType: function(snap){
        var obj = Ext.JSON.decode(snap.get('Value'));
        return obj.type || null;
    },
    getSnapshotData: function(snap){
        var obj = Ext.JSON.decode(snap.get('Value'));
        return obj.data || {};
    },
    getEncodedSnapshotValueString: function(oidValueHash, type){
        var obj = {
            type: type,
            data: oidValueHash
        };
        return Ext.JSON.encode(obj);
    }
});
