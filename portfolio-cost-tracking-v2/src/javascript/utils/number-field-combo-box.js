/**
 * Created this to allow for any custom fields to be used as the Preliminary Budget field
 * Requirements changed to only allow Preliminary Budget and Refined Estimate.
 */

Ext.define('CArABU.technicalservices.NumberFieldComboBox', {
    requires: [],
    extend: 'Rally.ui.combobox.FieldComboBox',
    alias: 'widget.numberfieldcombobox',
    _isNotHidden: function(field) {
        var validFields= ['PreliminaryEstimate','RefinedEstimate'],
            allowCustomNumberFields = false;

        if (!field.hidden) {

            if (Ext.Array.contains(validFields, field.name)) {
                return true;
            }

            //Allow for custom number fields
            if (allowCustomNumberFields && field.custom && field.attributeDefinition) {
                return (field.attributeDefinition.AttributeType === "INTEGER" ||
                field.attributeDefinition.AttributeType === "DECIMAL");
            }
        }
        return false;
    }
});
