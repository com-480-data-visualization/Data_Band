import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm"

d3.csv("https://raw.githubusercontent.com/thetorf/files/main/fraud_dataset.csv").then(
    function(d) {
        
        let data = d.slice(0,10)

        for (let index = 0; index < data.length; index++){
            const element = data[index]
            console.log(element)
        }

        console.log(d3.select("div.content-box").node())

        const table = d3.select("div.content-box")
            .append("table");

        const thead = table.append("thead");
        const tbody = table.append("tbody");

        thead.append("tr")
            .selectAll("th")
            .data(d.columns)
            .enter()
            .append("th")
            .text(d => d);

        data.forEach(row => {
            const tr = tbody.append("tr");
            Object.entries(row).forEach(value => {
                tr.append("td")
                    .text(value[1]);
            });
        });
        
    }
);