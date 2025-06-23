function mySubmitFunction(callSign) {
	
	$("#result").html("");
	
	(async () => {
		const ad1cCtyImpl = new AD1CCtyImpl();
		try {
			await ad1cCtyImpl.loadCty("demo/cty.dat"); // Replace with your file path
			console.log("Entities:" + ad1cCtyImpl.entities.size);
			console.log("Prefixes:" + ad1cCtyImpl.prefixes.size);
			let message =  ad1cCtyImpl.lookup(callSign);
			$("#result").html(JSON.stringify(message, null, 2));
		} catch (error) {
			console.error(error);
		}
	})();	
}

$(function(){

	const params = new URLSearchParams(window.location.search);
	const callSign = params.get('cs'); // "LY1H"
	if(callSign && callSign.length > 0) {
		mySubmitFunction(callSign)
	}

    $("#searchCallSign").click(function (event) {
		let callSign = $("#inputCallsign").val().trim();
		if(callSign && callSign.length > 0) {
			mySubmitFunction(callSign);		
		}
    });
	
});
