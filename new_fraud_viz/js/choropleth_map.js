async function drawChoroplethMap() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const svg = d3.select("#choropleth-map")
    .html("")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100vh")
    .style("background", "#0d1117");

  const g = svg.append("g");

  const projection = d3.geoMercator()
    .scale(150)
    .translate([width / 2, height / 2]);

  const path = d3.geoPath().projection(projection);

  const world = await d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson");
  g.selectAll("path")
    .data(world.features)
    .join("path")
    .attr("d", path)
    .attr("fill", "#1e1e1e")
    .attr("stroke", "#444")
    .attr("stroke-width", 0.5);

  const data = await d3.json("data/fraud_choropleth.json");
  const counts = Object.values(data).map(d => d.count);

  const color = d3.scaleSequential()
    .domain([d3.min(counts), d3.max(counts)])
    .interpolator(d3.interpolateOrRd);

  const tooltip = d3.select("#tooltip");

  const circles = g.selectAll("circle")
    .data(Object.entries(data))
    .join("circle")
    .attr("cx", d => projection([d[1].lon, d[1].lat])[0])
    .attr("cy", d => projection([d[1].lon, d[1].lat])[1])
    .attr("r", 0)
    .attr("fill", d => color(d[1].count))
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .attr("opacity", 0.85)
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(150).style("opacity", 1);
      tooltip.html(`
        <div style="background:#222;padding:8px;border-radius:4px;color:white;font-size:0.9rem;">
          <strong>City:</strong> ${d[0]}<br>
          <strong>Fraud Cases:</strong> ${d[1].count}<br>
          <strong>Avg Risk:</strong> ${d[1].avg_risk.toFixed(2)}
        </div>
      `);
    })
    .on("mousemove", event => {
      tooltip
        .style("left", `${event.pageX + 15}px`)
        .style("top", `${event.pageY + 15}px`);
    })
    .on("mouseout", () => tooltip.transition().duration(200).style("opacity", 0));

  const countExtent = d3.extent(Object.values(data), d => d.count);
  const radiusScale = d3.scaleSqrt()
    .domain(countExtent)
    .range([4, 20]); // Adjust size range as needed

// 2. Animate circles using that scale
  circles.transition()
    .duration(800)
    .attr("r", d => radiusScale(d[1].count));

  // Add zoom/pan support
  svg.call(
    d3.zoom()
      .scaleExtent([1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      })
  );

  const legendContainer = d3.select("#choropleth-legend").html(""); 

  legendContainer.append("p")
    .html(`<strong style="color: #e0f0ff;">Legend</strong>`)
    .style("font-family", "Inter, sans-serif")
    .style("color", "#e0f0ff")
    .style("margin-bottom", "4px");

  const maxColor = color(d3.max(counts));
  const midColor = color(d3.median(counts));
  const minColor = color(d3.min(counts));

  const items = [
    { label: "Low Fraud", color: minColor },
    { label: "Medium", color: midColor },
    { label: "High Fraud", color: maxColor }
  ];

  items.forEach(item => {
    const row = legendContainer.append("div").style("display", "flex").style("align-items", "center").style("gap", "6px").style("margin-bottom", "4px");
    row.append("div")
      .style("width", "14px")
      .style("height", "14px")
      .style("background-color", item.color)
      .style("border-radius", "2px");
    row.append("span")
      .text(item.label)
      .style("font-size", "0.9rem")
      .style("color", "#e0f0ff");
  });

  legendContainer.append("p")
    .html(`<span style="color:#e0f0ff;">Bubble size</span> = average risk score`)
    .style("margin-top", "8px")
    .style("font-size", "0.85rem")
    .style("color", "#ccc");
}
drawChoroplethMap();




