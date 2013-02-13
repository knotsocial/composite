// $model updates for each row, so we need to persist it for each row
var thisModel = $model;

function onBtnModelClick(e){
	switch(e.index)
	{
		case 0:
			// update model
			var title = thisModel.get("title");
			var newTitle = title.split('').reverse().join('');
			thisModel.set( { title: newTitle });			
		    var result = thisModel.save();
		    Ti.API.trace( 'uM:'+title+">"+newTitle+"="+JSON.stringify( result) );
			break;
		case 1:
			// update event
			var j = thisModel.toJSON();
			var title = j.title;
			var newTitle = title.split('').reverse().join('');
			j.title=newTitle;
		    Ti.API.trace( 'uE:'+title+">"+newTitle+":"+JSON.stringify(j) );
			Composite.publish.DATA_Update( "book", j );
			break;
		case 2:
			// delete model
			var result = thisModel.destroy();
		    Ti.API.trace( 'dM='+ JSON.stringify( result ) )
			break;
		case 3:
			// delete event
			var j = thisModel.toJSON();
			Ti.API.trace("dE:"+JSON.stringify(j) );
			Composite.publish.DATA_Delete( "book", j );
			break;
	} 
}

