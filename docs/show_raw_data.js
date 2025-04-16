import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm"

d3.csv("https://raw.githubusercontent.com/thetorf/files/main/test.csv").then(
    function(data) {
        
        for (let index = 0; index < data.length; index++){
            const element = data[index]
            console.log(element)
        }
        
        console.log(d3.select("div.content-box").node())

        const table = d3.select("div.content-box")
            .append("table")
            .style("border-collapse", "collapse")
            .style("margin", "20px")
            .style("margin-left", "auto")
            .style("margin-right", "auto");

        const thead = table.append("thead");
        const tbody = table.append("tbody");

        thead.append("tr")
            .selectAll("th")
            .data(data.columns)
            .enter()
            .append("th")
            .text(d => d)
            .style("border", "1px solid #ccc")
            .style("padding", "8px")
            .style("background-color", "#3b3b3b")
            .style("color", "#ffffff");

        data.forEach(row => {
            const tr = tbody.append("tr");
            Object.entries(row).forEach(value => {
                tr.append("td")
                .text(value[1])
                .style("border", "1px solid #ccc")
                .style("padding", "8px")
                .style("background-color", '#f3f4f6');
            });
        });


    }
);