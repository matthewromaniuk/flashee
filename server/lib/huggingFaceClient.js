//UNFINISHED

import { Client } from "@gradio/client";
	
	const response_0 = await fetch("https://github.com/gradio-app/gradio/raw/main/test/test_files/sample_file.pdf");
	const exampleFile = await response_0.blob();
						
	const client = await Client.connect("iammraat/flashcards");
	const result = await client.predict("/run_pipeline", { 
					pdf_file: exampleFile, 
						
	});

	console.log(result.data);
	