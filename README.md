# Download
You must have cty.dat downloaded from officially maintained site

Download it here http://www.country-files.com/bigcty/cty.dat

# Usage

    (async () => {
        const ad1cCtyImpl = new AD1CCtyImpl();
        try {
            await ad1cCtyImpl.loadCty("cty.dat"); // Replace with your file path
            console.log("Entities:" + ad1cCtyImpl.entities.size);
            console.log("Prefixes:" + ad1cCtyImpl.prefixes.size);
            console.log(ad1cCtyImpl.lookup("LY1H"));
        } catch (error) {
            console.error(error);
        }
    })();

# Demo
