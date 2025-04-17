import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm"

const cityCoords = {
    "London": { lat: 51.5074, lon: -0.1278 },
    "Mumbai": { lat: 19.0760, lon: 72.8777 },
    "New York": { lat: 40.7128, lon: -74.0060 },
    "Sydney": { lat: -33.8688, lon: 151.2093 },
    "Tokyo": { lat: 35.6895, lon: 139.6917 }
};

Promise.all([
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
    d3.csv("https://raw.githubusercontent.com/thetorf/files/main/fraud_dataset.csv")
]).then(([geoData, fraudData]) => {
            
            //Visualisation choropleth map
            const width = 960, height = 600;
            const svg = d3.select('#svg-vis-choropleth')
            
            console.log(fraudData)
            
            svg.attr("width", width)
                .attr("height", height)
            
            const projection = d3.geoMercator().scale(150).translate([width / 2, height / 1.5])
            const path = d3.geoPath().projection(projection)
            
            svg.selectAll("path")
                .data(geoData.features)
                .enter()
                .append("path")
                .attr("d", path)
                .attr("fill", "#eee")
                .attr("stroke", "#999")

            const fraudByCity = {};
            fraudData.forEach(d => {
                if (d.Fraud_Label === "1" && cityCoords[d.Location]) {
                    const city = d.Location;
                    const amount = +d.Transaction_Amount;
                    fraudByCity[city] = (fraudByCity[city] || 0) + amount;
                }
            })

            console.log(fraudByCity)

            const fraudPoints = Object.entries(fraudByCity).map(([city, amount]) => {
                return {
                    city,
                    amount,
                    ...cityCoords[city]
                }
            })

            const radius = d3.scaleSqrt()
                .domain(d3.extent(fraudPoints, d => d.amount))
                .range([5, 25]);
            
            console.log(fraudPoints)

            svg.selectAll("circle")
                .data(fraudPoints)
                .enter()
                .append("circle")
                .attr("cx", d => projection([d.lon, d.lat])[0])
                .attr("cy", d => projection([d.lon, d.lat])[1])
                .attr("r", d => radius(d.amount))
                .attr("fill", "red")
                .attr("opacity", 0.6)
                .attr("stroke", "#900");

            console.log("Choropleth map done...")

        }
    );