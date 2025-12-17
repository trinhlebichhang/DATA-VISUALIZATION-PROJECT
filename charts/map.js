// charts/map.js
export function initMap(containerId, usData, onClickHandler) {
    const container = document.getElementById(containerId);
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create SVG
    const svg = d3.select(`#${containerId}`).append("svg")
        .attr("width", width)
        .attr("height", height);

    const gMap = svg.append("g");
    
    // Zoom behavior
    svg.call(d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", (event) => gMap.attr("transform", event.transform))
    ).on("click", () => onClickHandler(null)); // Background click triggers reset

    // Projection
    const projection = d3.geoAlbersUsa()
        .translate([width / 2, height / 2])
        .scale(width * 1.1);

    const path = d3.geoPath().projection(projection);
    const statesGeo = topojson.feature(usData, usData.objects.states).features;

    // Draw Static Layers (Nation & State Borders)
    gMap.append("path")
        .datum(topojson.feature(usData, usData.objects.nation))
        .attr("d", path).attr("fill", "#f4f4f4");

    gMap.append("path")
        .datum(topojson.mesh(usData, usData.objects.states, (a, b) => a !== b))
        .attr("d", path).attr("fill", "none").attr("stroke", "#ccc").attr("stroke-dasharray", "2,2");

    // Labels
    gMap.selectAll("text.state-label")
        .data(statesGeo)
        .enter().append("text")
        .attr("class", "state-label")
        .attr("transform", d => {
            const c = projection(d3.geoCentroid(d));
            return c ? `translate(${c[0]}, ${c[1]})` : "translate(-999,-999)";
        })
        .text(d => d.properties.name)
        .attr("font-size", "10px")
        .attr("text-anchor", "middle")
        .attr("fill", "#555")
        .attr("dy", "1.8em");

    // Tooltip
    const tooltip = d3.select("body").append("div").attr("class", "tooltip");

    // The Bubble Group (empty initially)
    let bubbles = gMap.selectAll("circle.bubble");

    // --- UPDATE FUNCTION ---
    function update(data, colorScale, radiusScale, activeCategory, selectedState) {
        // Aggregate data by State
        const salesByState = d3.rollup(data, v => d3.sum(v, d => d.Sales), d => d.State);
        
        // Bind data to bubbles
        bubbles = gMap.selectAll("circle.bubble").data(statesGeo);

        // Enter + Update
        bubbles.join(
            enter => enter.append("circle")
                .attr("class", "bubble")
                .attr("transform", d => {
                    const c = projection(d3.geoCentroid(d));
                    return c ? `translate(${c[0]}, ${c[1]})` : "translate(-999,-999)";
                })
                .attr("fill-opacity", 0.7)
                .attr("stroke", "#333")
                .attr("stroke-width", 1)
                .on("mouseover", function(event, d) {
                    const val = salesByState.get(d.properties.name) || 0;
                    tooltip.style("opacity", 1)
                           .html(`<strong>${d.properties.name}</strong><br>$${val.toLocaleString()}`);
                    d3.select(this).attr("stroke", "black").attr("stroke-width", 2);
                })
                .on("mousemove", event => {
                    tooltip.style("left", (event.pageX + 10) + "px")
                           .style("top", (event.pageY + 10) + "px");
                })
                .on("mouseout", function() {
                    tooltip.style("opacity", 0);
                    d3.select(this).attr("stroke", "#333").attr("stroke-width", 1);
                })
                .on("click", (event, d) => {
                    event.stopPropagation();
                    onClickHandler(d.properties.name);
                }),
            update => update
        )
        .transition().duration(750)
        .attr("r", d => radiusScale(salesByState.get(d.properties.name) || 0))
        .attr("fill", d => activeCategory ? colorScale(activeCategory) : "steelblue")
        .attr("opacity", d => {
            // Logic: If a state is selected, dim others. If no state selected, all 0.7
            if (selectedState) {
                return d.properties.name === selectedState ? 1 : 0.1;
            }
            return 0.7;
        });
    }

    return { update };
}