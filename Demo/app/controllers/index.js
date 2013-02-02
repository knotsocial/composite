Ti.API.trace("START:controllers/index.js");
var books = Alloy.Collections.book;

function doClick(e) {  
    alert($.label.text);
}

function onBtnClick(e){
	switch(e.index)
	{
		case 0:
		    // add model
		    var neuromancer = books.create({author:"William Gibson",title:"Neuromancer",isbn:"9780441569564"})
		    Ti.API.trace( JSON.stringify( neuromancer.toJSON()) )
			break;
		case 1:
			// add event
			var countZero = composite.publish.DATA_Add( "book", {author:"William Gibson",title:"Count Zero",isbn:"9780575036963"})
			break;
		case 2:
			// update model
			break;
		case 3:
			// update event
			break;
		case 4:
			// delete model
			break;
		case 5:
			// delete event
			break;
		case 6:
			// fetch
			books.fetch();
			break;
	} 
}

$.index.open();
