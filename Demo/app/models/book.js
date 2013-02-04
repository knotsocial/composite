exports.definition = {
	
	config: {
		"columns": {
			"author":"string",
			"title":"string",
			"isbn":"string"
		},
		"adapter": {
			"type": "composite",
			"collection_name": "book"
		}
	},		

	extendModel: function(Model) {		
		_.extend(Model.prototype, {
						
			// extended functions go here

		}); // end extend
		
		return Model;
	},
	
	
	extendCollection: function(Collection) {		
		_.extend(Collection.prototype, {
			
			// extended functions go here			
			
		}); // end extend
		
		return Collection;
	}
		
}

