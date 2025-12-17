// charts/customer-segment.js

export function initCustomerSegment(containerId, onClickHandler) {
    const container = d3.select(`#${containerId}`);
    
    // Resize logic
    const width = container.node().getBoundingClientRect().width || 400;
    const height = container.node().getBoundingClientRect().height || 300;

    const margin = { top: 40, right: 100, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    // Title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px") // Slightly smaller to fit
        .attr("font-weight", "bold")
        .text("Orders vs Average Sales by Segment");

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleLinear().range([0, innerWidth]);
    const y = d3.scaleLinear().range([innerHeight, 0]);
    
    const color = d3.scaleOrdinal()
        .domain(["Consumer", "Corporate", "Home Office"])
        .range(["#4CAF50", "#2196F3", "#FF9800"]);

    const xAxisG = chart.append("g").attr("transform", `translate(0, ${innerHeight})`);
    const yAxisG = chart.append("g");

    // Axis Labels
    chart.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text("Number of Orders");

    chart.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text("Average Sales ($)");

    const tooltip = d3.select("#tooltip");

    const legend = svg.append("g")
        .attr("transform", `translate(${width - 90}, ${margin.top})`);
    
    ["Consumer", "Corporate", "Home Office"].forEach((seg, i) => {
        const g = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
        g.append("circle").attr("r", 5).attr("fill", color(seg));
        g.append("text").attr("x", 10).attr("y", 4).attr("font-size", "10px").text(seg);
    });

    // --- UPDATE FUNCTION ---
    function update(data, activeSegment) {
        // ... (Aggregation logic stays the same) ...
        const rolledUp = d3.rollup(
            data,
            v => ({
                totalOrders: new Set(v.map(d => d["Order ID"])).size, 
                avgSales: d3.mean(v, d => d.Sales)
            }),
            d => d.Segment
        );
        const processedData = Array.from(rolledUp, ([Segment, stats]) => ({ Segment, ...stats }));

        // ... (Scales logic stays the same) ...
        x.domain([0, d3.max(processedData, d => d.totalOrders) * 1.1 || 10]); 
        y.domain([0, d3.max(processedData, d => d.avgSales) * 1.1 || 100]);

        // Draw Axes
        xAxisG.transition().duration(750).call(d3.axisBottom(x).ticks(5));
        yAxisG.transition().duration(750).call(d3.axisLeft(y).ticks(5));

        // Draw Circles
        const circles = chart.selectAll("circle").data(processedData, d => d.Segment);

        circles.join(
            enter => enter.append("circle")
                .attr("cx", d => x(d.totalOrders))
                .attr("cy", d => y(d.avgSales))
                .attr("r", 0)
                .attr("fill", d => color(d.Segment))
                .attr("stroke", "#333")
                .attr("stroke-width", 1)
                .attr("cursor", "pointer")
                .attr("opacity", 1) // Start fully opaque
                .on("click", (event, d) => {
                    event.stopPropagation();
                    onClickHandler(d.Segment);
                })
                .on("mouseover", function (event, d) {
                    // Only increase size, DO NOT touch opacity here
                    d3.select(this).transition().duration(200).attr("r", 12).attr("stroke-width", 2);
                    tooltip.style("opacity", 1)
                        .html(`<strong>${d.Segment}</strong><br/>Orders: ${d.totalOrders}<br/>Avg Sales: $${d.avgSales.toFixed(2)}`);
                })
                .on("mousemove", event => {
                    tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function () {
                    // Return to normal size
                    d3.select(this).transition().duration(200).attr("r", 8).attr("stroke-width", 1);
                    tooltip.style("opacity", 0);
                })
                .transition().duration(1000)
                .attr("r", 8),
            
            update => update.transition().duration(750)
                .attr("cx", d => x(d.totalOrders))
                .attr("cy", d => y(d.avgSales))
                .attr("r", 8)
                // STRICT OPACITY LOGIC
                .attr("opacity", d => {
                    // If NO segment is selected, everyone is Opacity 1
                    if (!activeSegment) return 1;
                    // If A segment is selected, only that one is 1, others are 0.3
                    return d.Segment === activeSegment ? 1 : 0.3;
                }),

            exit => exit.transition().duration(500).attr("r", 0).remove()
        );
    }

    return { update };
}