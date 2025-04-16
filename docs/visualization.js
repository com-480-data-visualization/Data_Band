import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm"

d3.csv("https://raw.githubusercontent.com/thetorf/files/main/test.csv").then(
    function(data) {
        
        for (let index = 0; index < data.length; index++){
            const element = data[index]
            console.log(element)
        }
        
        

    }
);