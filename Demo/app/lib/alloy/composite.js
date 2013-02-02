Ti.API.trace("START:knot/composite.js");

module.exports = (function(){ 
	
	// private variables ------------------------------------------------------
	
	var Composite = {};
	
	// private methods --------------------------------------------------------
	
	function _sync(method, model, opts) {
		alert("alloy injection syncing")
	}
	
	// alloy injections -------------------------------------------------------
	
	Ti.API.trace("injecting");
	
	var oldM = Alloy.M;	
	Alloy.M = function(name, modelDesc, migrations){
//		Ti.API.trace("wrapped Alloy.M function called");
		var config = modelDesc.config;
	    var type = (config.adapter ? config.adapter.type : null) || 'localDefault';
	    if (type!=='composite'){
	    	return oldM(name,modelDesc,migrations);
	    }
	    var extendObj = {
			defaults: config.defaults,
	        sync: _sync
		};
		var extendClass = {};
		// note: beforeModelCreate went here
	    // Create the Model object
		var Model = Backbone.Model.extend(extendObj, extendClass);
		Model.prototype.config = config;
		// Extend the Model with extendModel(), if defined
		if (_.isFunction(modelDesc.extendModel)) {
			Model = modelDesc.extendModel(Model) || Model;
		}
		// note: afterModelCreate went here
		return Model;
	}
	
	var oldC = Alloy.C;
	Alloy.C = function(name, modelDesc, model) {
//		Ti.API.trace("wrapped Alloy.C function called");
		var config = model.prototype.config; // modelDesc.config;
	    var type = (config.adapter ? config.adapter.type : null) || 'localDefault';
	    if (type!=='composite'){
	    	return oldC(name,modelDesc,model);
	    }
	    var extendObj = {
			model: model,
	        sync: _sync
		};
		var Collection = Backbone.Collection.extend(extendObj);
		Collection.prototype.config = config; // model.prototype.config;
		// afterCollectionCreate went here
		if (_.isFunction(modelDesc.extendCollection)) {
			Collection = modelDesc.extendCollection(Collection) || Collection;
		}
		return Collection;
	}
	
	
	// public interface -------------------------------------------------------
	
	return Composite;
	
}())
