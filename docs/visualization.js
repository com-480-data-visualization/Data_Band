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
    drawTS(fraudData)
    console.log("Fraudulent transaction done...")
    choroplethMap(geoData, fraudData)
    console.log("Choropleth map done...")
});

function drawTS(fraudData){
    
    const { dates, counts, months, byMonthCity } = parseFraud(fraudData)
    drawTimeSeries(dates, counts)
    //drawMapSlider(months, byMonthCity) //create the bug

    function parseFraud(rows) {
        const fraudByDate = {};
        const fraudByMonthCity = {};
    
        rows.forEach(r => {
          if (r.Fraud_Label !== "1") return;
          const d = new Date(r.Timestamp);
          const day = d.toISOString().slice(0, 10);
        
          fraudByDate[day] = (fraudByDate[day] || 0) + 1;
         
          const month = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          fraudByMonthCity[month] = fraudByMonthCity[month] || {};
          fraudByMonthCity[month][r.Location] = (fraudByMonthCity[month][r.Location]||0) + 1;
        });
    
        return {
          dates: Object.keys(fraudByDate).sort(),
          counts: Object.keys(fraudByDate).sort().map(d => fraudByDate[d]),
          months: Object.keys(fraudByMonthCity).sort(),
          byMonthCity: fraudByMonthCity
        };
    }
    
    // Plotly Config
    function drawTimeSeries(dates, counts) {
        Plotly.newPlot(
            "fraud-time-chart",
            [{
                x: dates,
                y: counts,
                type: "scatter",
                mode: "lines",
                line: { shape: "spline", width: 2, color: "#e63946" },
                hoverinfo: "x+y"
            }],
            {
                xaxis: { title: "Date" },
                yaxis: { title: "Number of Fraud Cases" },
                margin: { t: 60, l: 60, r: 30, b: 60 },
                plot_bgcolor: "#f9f9f9",
                paper_bgcolor: "#fff"
            },
            { responsive: true }
        );
    }
    
    //Lealet + Slider
    function drawMapSlider(months, dataByMonth) {
        // City → [lat, lon]
        /*const cityCoords = {
            Tokyo: [35.6895, 139.6917],
            "New York": [40.7128, -74.0060],
            Sydney: [-33.8688, 151.2093],
            London: [51.5074, -0.1278],
            Mumbai: [19.0760, 72.8777]
        };*/

        // Initialize map
        const map = L.map("fraud-map").setView([20, 0], 2);
        L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
            { attribution: "", subdomains: "abcd" }
        ).addTo(map);

        // Slider and label
        const slider = document.getElementById("monthSlider");
        const label  = document.getElementById("selectedMonth");
        slider.max = months.length - 1;
        slider.value = 0;

        let markers = [];

        function updateMonth(idx) {
            // clear old markers
            markers.forEach(m => map.removeLayer(m));
            markers = [];

            const month = months[idx];
            label.textContent = `Month: ${month}`;

            const cityCounts = dataByMonth[month] || {};
            Object.entries(cityCounts).forEach(([city, count]) => {
            const coords = cityCoords[city];
            if (!coords) return;  // skip unknown cities

            const circle = L.circleMarker(coords, {
                radius: Math.sqrt(count) * 1.0,
                fillColor: "#e63946",
                color: "#fff",
                weight: 1,
                fillOpacity: 0.8
            }).addTo(map);

            circle.bindPopup(`<strong>${city}</strong><br>${count} cases`);
            markers.push(circle);
            });
        }

        // Wire up slider event and do initial render
        slider.addEventListener("input", () => updateMonth(+slider.value));
            updateMonth(0);
    }
}

function choroplethMap(geoData, fraudData){
    //Visualisation choropleth map
    const width = 960, height = 600;
    const svg = d3.select('#svg-vis-choropleth')
    
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

}