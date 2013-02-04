Ti.API.trace("START:controllers/index.js");
// get a reference to the book collection singleton
var books = Alloy.Collections.book;
// create the burningChrome book object, which we use to test the update code
var burningChrome = books.create({author:"William Gibson",title:"emorhC gninruB",isbn:"9780441089345"})
Ti.API.trace( 'Setup:+M(Burnin Chrome)'+ JSON.stringify( burningChrome.toJSON()) );
var neuromancer = null;

function doClick(e) {  
    alert($.label.text);
}

function onBtnClick(e){
	switch(e.index)
	{
		case 0:
		    // add model
		    neuromancer = books.create({author:"William Gibson",title:"Neuromancer",isbn:"9780441569564"})
		    Ti.API.trace( '+M(Neuromancer)'+ JSON.stringify( neuromancer.toJSON()) )
			break;
		case 1:
			// add event
			var countZero = {author:"William Gibson",title:"Count Zero",isbn:"9780575036963"};
		    Ti.API.trace( '+E(Count Zero)'+ JSON.stringify( countZero ) )
			Composite.publish.DATA_Create( "book", countZero)
			break;
		case 2:
			// update model
			var title = burningChrome.get("title");
		    if (title ==="emorhC gninruB"){
		    	burningChrome.set( { title: "Burning Chrome"});
		    } else {
		    	burningChrome.set( { title: "emorhC gninruB"});
		    }
		    var result = burningChrome.save()
		    Ti.API.trace( 'uM(Burning Chrome:title)'+ JSON.stringify( result) );
			break;
		case 3:
			// update event
			var j = burningChrome.toJSON();
		    if (title ==="emorhC gninruB"){
		    	j.title="Burning Chrome";
		    } else {
		    	j.title="emorhC gninruB";
		    }
		    Ti.API.trace( 'uE(Burning Chrome:isbn)'+ JSON.stringify( j ) );
			Composite.publish.DATA_Update( "book", j );
			break;
		case 4:
			// delete model
			if (neuromancer!==null){
				var result = neuromancer.destroy();
			    Ti.API.trace( 'dM(Neuromancer)'+ JSON.stringify( result ) )
			    neuromancer = null;
			} else {
				Ti.API.trace("dM(Neuromancer) request but no model - create model first");
			}
			break;
		case 5:
			// delete event
			if (neuromancer!==null){
				Ti.API.trace("dE(Neuromancer)");
				var j = neuromancer.toJSON();
				Composite.publish.DATA_Delete( "book", j );
			    neuromancer = null;
			} else {
				Ti.API.trace("dM request but no model - create model first");
			}
			break;
		case 6:
			// fetch
			books.fetch();
			break;
	} 
}

var _compositeEventSignatures = {
	DATA_Create: function( cn, data ){ Ti.API.trace("DATA_Create:"+cn+":"+JSON.stringify(data)) },
	DATA_Update: function( cn, data ){ Ti.API.trace("DATA_Update:"+cn+":"+JSON.stringify(data)) },
	DATA_Delete: function( cn, data ){ Ti.API.trace("DATA_Delete:"+cn+":"+JSON.stringify(data)) }
}


$.index.open();