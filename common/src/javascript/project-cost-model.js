
Ext.define('CArABU.technicalservices.ProjectCostModelBuilder',{
    singleton: true,
    prefPrefix: 'costAsOf-',
    build: function(modelType, newModelName) {
        var deferred = Ext.create('Deft.Deferred');
        var prefPrefix = CArABU.technicalservices.ProjectCostModelBuilder.prefPrefix;

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
                },{
                    name: '__comments',
                    convert: function(v, record){
                        var obj = record.get('Value');
                        if (obj){
                            obj = Ext.JSON.decode(obj);
                            return obj.comments;
                        }
                    }
                },{
                    name: '__avgDayRate',
                    convert: function(v, record){
                        var obj = record.get('Value');
                        if (obj){
                            obj = Ext.JSON.decode(obj);
                            return obj.avgDayRate;
                        }
                    }
                },{
                    name: '__noOfTeamMembers',
                    convert: function(v, record){
                        var obj = record.get('Value');
                        if (obj){
                            obj = Ext.JSON.decode(obj);
                            return obj.noOfTeamMembers;
                        }
                    }
                },{
                    name: '__teamType',
                    convert: function(v, record){
                        var obj = record.get('Value');
                        if (obj){
                            obj = Ext.JSON.decode(obj);
                            return obj.teamType;
                        }
                    }
                },{
                    name: '__sprintDays',
                    convert: function(v, record){
                        var obj = record.get('Value');
                        if (obj){
                            obj = Ext.JSON.decode(obj);
                            return obj.sprintDays;
                        }
                    }
                }];

                var new_model = Ext.define(newModelName, {
                    extend: model,
                    logger: new Rally.technicalservices.Logger(),
                    fields: default_fields,
                    prefPrefix: prefPrefix,
                    setCostForProject: function(cost, asOfDate, userName, comments, avgDayRate, noOfTeamMembers,teamType,sprintDays){
                        var isoDate = Rally.util.DateTime.toIsoString(asOfDate),
                            name = this.prefPrefix + isoDate;

                        this.set('Name', name);

                        var obj = {
                            cost: cost,
                            asOfDate: isoDate,
                            userDisplayName: userName,
                            comments: comments,
                            avgDayRate: avgDayRate,
                            noOfTeamMembers: noOfTeamMembers,
                            teamType: teamType,
                            sprintDays:sprintDays
                        };
                        this.logger.log('setCostPerProject', name, obj, cost, asOfDate, userName, comments, avgDayRate, noOfTeamMembers,teamType,sprintDays);

                        this.set('Value', Ext.JSON.encode(obj));
                    }
                });
                deferred.resolve(new_model);
            }
        });
        return deferred;
    }
});