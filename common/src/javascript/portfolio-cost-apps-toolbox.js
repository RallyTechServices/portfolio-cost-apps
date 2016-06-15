Ext.define('CArABU.technicalservices.PortfolioCostApps.toolbox',{
    singleton: true,

    snapshotPrefPrefix: 'pSnapshot-',
    teamCostPrefPrefix: 'costAsOf-',
    getSnapshotPreferenceName: function(name){
        return CArABU.technicalservices.PortfolioCostApps.toolbox.snapshotPrefPrefix + name;
    },
    getFriendlyNameFromSnapshotName: function(name){
        return name.replace(CArABU.technicalservices.PortfolioCostApps.toolbox.snapshotPrefPrefix,'');
    }
});
