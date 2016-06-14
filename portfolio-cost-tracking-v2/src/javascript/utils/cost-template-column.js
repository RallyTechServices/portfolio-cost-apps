

Ext.define('CArABU.technicalservices.CostTemplateColumn', {
    extend: 'Ext.grid.column.Template',
    alias: ['widget.costtemplatecolumn'],

    align: 'right',

    initComponent: function(){
        var me = this;

        Ext.QuickTips.init();

        me.tpl = new Ext.XTemplate('<tpl><div data-qtip="{[this.getTooltip(values)]}" style="cursor:pointer;text-align:right;">{[this.getCost(values)]}</div></tpl>',{
            costField: me.costField,

            getCost: function(values){
                console.log('getCost', values);
                if (values[this.costField] === null){
                    return CArABU.technicalservices.PortfolioItemCostTrackingSettings.notAvailableText;
                } else {
                    var html = CArABU.technicalservices.PortfolioItemCostTrackingSettings.formatCost(values[this.costField] || 0);
                    if (values._notEstimated && this.costField === '_rollupDataTotalCost'){
                        html = '<span class="picto icon-warning warning" style="color:#FAD200;font-size:10px;"></span>' + html;
                    }
                    return html;
                }
            },
            getTooltip: function(values){
                if (values._rollupDataToolTip){
                    return values._rollupDataToolTip;
                }
                return '';
            }

        });
        me.hasCustomRenderer = true;
        me.callParent(arguments);
    },
    getValue: function(){
        return values[this.costField] || 0;
    },
    defaultRenderer: function(value, meta, record) {
        var data = Ext.apply({}, record.data._rollupData); //, record.getAssociatedData());
        return this.tpl.apply(data);
    }
});
