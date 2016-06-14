
Ext.define('CArABU.technicalservices.ModelBuilder',{
    singleton: true,

    build: function(modelType, newModelName, prefPrefix) {
        var deferred = Ext.create('Deft.Deferred');

        Rally.data.ModelFactory.getModel({
            type: modelType,
            success: function (model) {

                var default_fields = [{
                    name: '__cost',
                    convert: function(v, record){
                        var obj = record.get('Value');
                        if (obj){
                            obj = Ext.JSON.decode(obj);
                            return obj.cost;
                        }
                    }
                }, {
                    name: '__userDisplayName',
                    convert: function(v, record){
                        var obj = record.get('Value');
                        if (obj) {
                            obj = Ext.JSON.decode(obj);
                            return obj.userDisplayName;
                        }
                    }
                }, {
                    name: '__asOfDate',
                    convert: function(v, record){
                        var obj = record.get('Value');
                        if (obj) {
                            obj = Ext.JSON.decode(obj);
                            return Rally.util.DateTime.fromIsoString(obj.asOfDate);
                        }
                    }
                }];

                var new_model = Ext.define(newModelName, {
                    extend: model,
                    logger: new Rally.technicalservices.Logger(),
                    fields: default_fields,
                    prefPrefix: prefPrefix,
                    setCostForProject: function(cost, asOfDate, userName){
                        var isoDate = Rally.util.DateTime.toIsoString(asOfDate),
                            name = this.prefPrefix + isoDate;

                        this.set('Name', name);

                        var obj = {
                            cost: cost,
                            asOfDate: isoDate,
                            userDisplayName: userName
                        };
                        this.logger.log('setCostPerProject', name, obj, cost, asOfDate, userName);

                        this.set('Value', Ext.JSON.encode(obj));
                    }
                });
                deferred.resolve(new_model);
            }
        });
        return deferred;
    }
});