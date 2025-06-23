function mySubmitFunction(event) {
	
	let callSign = $("#inputCallsign").val().trim();

	(async () => {
		const ad1cCtyImpl = new AD1CCtyImpl();
		try {
			await ad1cCtyImpl.loadCty("demo/cty.dat"); // Replace with your file path
			console.log("Entities:" + ad1cCtyImpl.entities.size);
			console.log("Prefixes:" + ad1cCtyImpl.prefixes.size);
			console.log(ad1cCtyImpl.lookup(callSign));
		} catch (error) {
			console.error(error);
		}
	})();	
}

$(function(){

    $("#searchCallSign").click(function (event) {
		mySubmitFunction(event);		
    });
	
});
