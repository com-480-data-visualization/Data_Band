let currentClusterBy = "Device_Type";
let fraudOnly = false;

function initSimilarityGraph(clusterBy = "Device_Type", showFraudOnly = false) {
  currentClusterBy = clusterBy;
  fraudOnly = showFraudOnly;

  const file = fraudOnly
    ? "data/user_similarity_graph_fraud_only.json"
    : "data/user_similarity_graph.json";

  fetch(file)
    .then(response => {
      if (!response.ok) throw new Error("Failed to load graph data.");
      return response.json();
    })
    .then(graph => drawSimilarityGraph(graph, clusterBy))
    .catch(error => {
      console.error("Error loading similarity graph:", error);
      document.getElementById("user-similarity-graph").innerHTML = "<p>Failed to load graph.</p>";
    });
}

function drawSimilarityGraph(graph, clusterBy) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const margin = 20;

  d3.select("#user-similarity-graph").html("");
  d3.select("#legend").html("");

  const svg = d3.select("#user-similarity-graph")
    .append("svg")
    .attr("viewBox", [-margin, -margin, width + 2 * margin, height + 2 * margin])
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100vw")
    .style("height", "100vh")
    .style("background", "#0d1117")
    .append("g");

  graph.nodes.forEach(d => {
    d.Risk_Category = +d.Risk_Score < 0.33 ? "Low" : +d.Risk_Score < 0.66 ? "Medium" : "High";
  });

  graph.nodes = graph.nodes.filter(d => d.id && d.hasOwnProperty(clusterBy));
  const validIds = new Set(graph.nodes.map(n => n.id));
  graph.links = graph.links.filter(l => validIds.has(l.source) && validIds.has(l.target));

  const uniqueGroups = [...new Set(graph.nodes.map(d => d[clusterBy]))];
  const color = d3.scaleOrdinal(d3.schemeTableau10).domain(uniqueGroups);

  const cols = Math.ceil(Math.sqrt(uniqueGroups.length));
  const spacingX = width / cols;
  const spacingY = height / Math.ceil(uniqueGroups.length / cols);
  const groupCenters = Object.fromEntries(uniqueGroups.map((group, i) => [
    group,
    {
      x: (i % cols) * spacingX + spacingX / 2,
      y: Math.floor(i / cols) * spacingY + spacingY / 2
    }
  ]));

  graph.nodes.forEach(d => {
    const center = groupCenters[d[clusterBy]];
    d.x = center.x + Math.random() * 50 - 25;
    d.y = center.y + Math.random() * 50 - 25;
  });

  const degreeMap = {};
  graph.links.forEach(l => {
    degreeMap[l.source] = (degreeMap[l.source] || 0) + 1;
    degreeMap[l.target] = (degreeMap[l.target] || 0) + 1;
  });

  function clusterForce(strength = 0.3) {
    return alpha => {
      graph.nodes.forEach(d => {
        const center = groupCenters[d[clusterBy]];
        d.vx += (center.x - d.x) * strength * alpha;
        d.vy += (center.y - d.y) * strength * alpha;
      });
    };
  }

  const simulation = d3.forceSimulation(graph.nodes)
    .force("link", d3.forceLink(graph.links).id(d => d.id).distance(d => 100 * (1 - d.weight)).strength(d => d.weight))
    .force("charge", d3.forceManyBody().strength(-20))
    .force("collision", d3.forceCollide().radius(16))
    .force("clustering", clusterForce(0.25))
    .velocityDecay(0.6)
    .alpha(1)
    .alphaDecay(0.08);

  const link = svg.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(graph.links)
    .join("line")
    .attr("stroke-width", d => 1 + d.weight * 3)
    .attr("stroke", d => d.weight > 0.8 ? "#FFD700" : "#888")
    .attr("stroke-opacity", d => d.weight > 0.6 ? 1 : 0.15);

  const node = svg.append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(graph.nodes)
    .join("circle")
    .attr("r", d => 4 + (+d.Risk_Score || 0) * 6)
    .attr("fill", d => color(d[clusterBy]))
    .attr("stroke", d => (+d.Fraud_Label || 0) === 1 ? "#ff4d4d" : "#fff")
    .attr("stroke-width", 1)
    .call(drag(simulation));

  const tooltip = d3.select("#tooltip");

  node.on("mouseover", (event, d) => {
    tooltip.transition().style("opacity", 1);
    tooltip.html(`
      <strong>User:</strong> ${d.id}<br>
      <strong>Device:</strong> ${d.Device_Type}<br>
      <strong>Location:</strong> ${d.Location}<br>
      <strong>Card Type:</strong> ${d.Card_Type}<br>
      <strong>Auth Method:</strong> ${d.Authentication_Method}<br>
      <strong>Risk Score:</strong> ${(+d.Risk_Score).toFixed(2)}<br>
      <strong>Fraud:</strong> ${+d.Fraud_Label === 1 ? "Yes" : "No"}<br>
      <strong>Links:</strong> ${degreeMap[d.id] || 0}
    `);
  }).on("mousemove", event => {
    tooltip.style("left", `${event.pageX + 15}px`).style("top", `${event.pageY + 15}px`);
  }).on("mouseout", () => tooltip.transition().style("opacity", 0));

  let tickCount = 0;
  simulation.on("tick", () => {
    tickCount++;
    node
      .attr("cx", d => d.x = Math.max(-margin + 10, Math.min(width + margin - 10, d.x)))
      .attr("cy", d => d.y = Math.max(-margin + 10, Math.min(height + margin - 10, d.y)));
    link
      .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    if (tickCount > 200) simulation.stop();
  });

  function drag(simulation) {
    return d3.drag()
      .on("start", event => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      })
      .on("drag", event => {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      .on("end", event => {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      });
  }

  const values = [...new Set(graph.nodes.map(d => d[clusterBy]))];
  const legendContainer = d3.select("#legend");
  legendContainer.append("p").text(clusterBy + ":").attr("class", "legend-title");
  values.forEach(val => {
    const item = legendContainer.append("div").attr("class", "legend-item");
    item.append("div").attr("class", "legend-color").style("background-color", color(val));
    item.append("span").text(val).attr("class", "legend-label");
  });

  d3.select("#riskSlider").on("input", function () {
    const threshold = parseFloat(this.value);
    d3.select("#riskValue").text(threshold.toFixed(2));
    node.style("opacity", d => (+d.Risk_Score || 0) >= threshold ? 1 : 0.1);
    link.style("opacity", d =>
      (+d.source.Risk_Score || 0) >= threshold && (+d.target.Risk_Score || 0) >= threshold ? d.weight : 0.05
    );
  });

  d3.select("#groupBy").on("change", function () {
    const selected = this.value;
    initSimilarityGraph(selected, fraudOnly);
  });

  d3.select("#fraudOnlyToggle").on("change", function () {
    const showFraudOnly = this.checked;
    initSimilarityGraph(currentClusterBy, showFraudOnly);
  });
}

initSimilarityGraph("Device_Type", false);












