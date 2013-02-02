Ti.API.trace("START:knot/composite.js");


// require in Alloy, undersore, and backbone
// var Alloy = require('alloy'), _ = require("alloy/underscore")._, Backbone = require("alloy/backbone");

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
//		alert("whee!");
//	}
	
//	_.wrap(Alloy.M,function(func, name, modelDesc, migrations){
		Ti.API.trace("wrapped Alloy.M function called");
		
//		debugger;
		// * start alloy code *
		var config = modelDesc.config;
	    var type = (config.adapter ? config.adapter.type : null) || 'localDefault';
	    if (type!=='composite'){
	    	return oldM(name,modelDesc,migrations);
	    }
	    // * end alloy code *	
	    
	
//		var adapter = require('alloy/sync/'+type);
	    var extendObj = {
			defaults: config.defaults,
	        sync: _sync
/*	        
	        function(method, model, opts) {
				var config = model.config || {};
				var adapterObj = config.adapter || {};
				var type = (config.adapter ? config.adapter.type : null) || 'localDefault';
				if (type === 'localDefault') {
			    	type = OS_MOBILEWEB ? 'localStorage' : 'sql';
			    }
	
				require('alloy/sync/'+type).sync(method,model,opts);
			}
*/			
		};
	
		var extendClass = {};
	
/*	
		// construct the model based on the current adapter type
		if (migrations) { extendClass.migrations = migrations; }
	
		// Run the pre model creation code, if any
	    if (_.isFunction(adapter.beforeModelCreate)) {
	    	config = adapter.beforeModelCreate(config, name) || config;
	    }
*/
	
	    // Create the Model object
		var Model = Backbone.Model.extend(extendObj, extendClass);
		Model.prototype.config = config;
	
		// Extend the Model with extendModel(), if defined

		if (_.isFunction(modelDesc.extendModel)) {
			Model = modelDesc.extendModel(Model) || Model;
		}
	
/*	
		// Run the post model creation code, if any
		if (_.isFunction(adapter.afterModelCreate)) {
			adapter.afterModelCreate(Model, name);
		}
*/	
		return Model;
	}
	
	var oldC = Alloy.C;
	Alloy.C = function(name, modelDesc, model) {
		Ti.API.trace("wrapped Alloy.C function called");
//		debugger;
		// * start alloy code *
		var config = model.prototype.config; // modelDesc.config;
	    var type = (config.adapter ? config.adapter.type : null) || 'localDefault';
	    if (type!=='composite'){
	    	return oldC(name,modelDesc,model);
	    }


	    var extendObj = {
			model: model,
	        sync: _sync
/*
 	        function(method, model, opts) {
				var config = (model.config || {});
				var type = (config.adapter ? config.adapter.type : null) || 'localDefault';
				if (type === 'localDefault') {
			    	type = OS_MOBILEWEB ? 'localStorage' : 'sql';
			    }
	
				require('alloy/sync/'+type).sync(method,model,opts);
			}
*/			
		};
	
		var Collection = Backbone.Collection.extend(extendObj);
		//var config =
		Collection.prototype.config = config; // model.prototype.config;
//		var type = (config.adapter ? config.adapter.type : null) || 'localDefault';

/*
		var adapter = require('alloy/sync/'+type);
		if (_.isFunction(adapter.afterCollectionCreate)) { adapter.afterCollectionCreate(Collection); }
*/	
		if (_.isFunction(modelDesc.extendCollection)) {
			Collection = modelDesc.extendCollection(Collection) || Collection;
		}

		return Collection;
	}
	
	
	// public interface -------------------------------------------------------
	
	return Composite;
	
}())
