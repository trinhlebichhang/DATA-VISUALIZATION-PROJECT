// charts/top-10-product-by-sales-and-profit.js

export function initTop10Bar(containerId, onClickHandler) {
    const container = d3.select(`#${containerId}`);
    
    // Auto-resize
    const width = container.node().getBoundingClientRect().width || 500;
    const height = container.node().getBoundingClientRect().height || 300;

    const margin = { top: 60, right: 100, bottom: 40, left: 160 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);
    
    // Title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Top 10 Products: Sales and Profit");

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleLinear().range([0, innerWidth]);
    const y = d3.scaleBand().range([0, innerHeight]).padding(0.2);
    const ySubgroup = d3.scaleBand().padding(0.05);
    const color = d3.scaleOrdinal()
        .domain(["Sales", "Profit"])
        .range(["#4CAF50", "#2196F3"]);

    const xAxisG = chart.append("g");
    const yAxisG = chart.append("g");
    
    const zeroLine = chart.append("line")
        .attr("stroke", "#000")
        .attr("stroke-dasharray", "4,2");

    const tooltip = d3.select("#tooltip");

    // Legend
    const legendData = [
        { label: "Sales", color: "#4CAF50" },
        { label: "Profit (Gain)", color: "#2196F3" },
        { label: "Profit (Loss)", color: "#F44336" }
    ];
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 90}, ${margin.top})`);

    legend.selectAll("g")
        .data(legendData)
        .enter().append("g")
        .attr("transform", (d, i) => `translate(0, ${i * 24})`)
        .each(function (d) {
            d3.select(this).append("rect").attr("width", 14).attr("height", 14).attr("fill", d.color);
            d3.select(this).append("text").attr("x", 20).attr("y", 12).attr("font-size", "12px").text(d.label);
        });

    // --- UPDATE FUNCTION ---
    function update(data, activeProduct) {
        // 1. Rollup Data
        const rolledUp = d3.rollup(data, 
            v => ({
                Sales: d3.sum(v, d => d.Sales),
                Profit: d3.sum(v, d => d.Profit)
            }),
            d => d["Product Name"] // Group by Product Name
        );

        // 2. Sort and Slice
        const processedData = Array.from(rolledUp, ([Product, totals]) => ({ Product, ...totals }))
            .sort((a, b) => d3.descending(a.Sales, b.Sales))
            .slice(0, 10);

        const subgroups = ["Sales", "Profit"];

        // 3. Update Domains
        x.domain([
            Math.min(0, d3.min(processedData, d => d.Profit)),
            d3.max(processedData, d => d.Sales)
        ]).nice();

        y.domain(processedData.map(d => d.Product));
        ySubgroup.domain(subgroups).range([0, y.bandwidth()]);

        // 4. Draw Axes
        xAxisG.transition().duration(750).call(d3.axisTop(x).ticks(5, "s"));
        yAxisG.transition().duration(750).call(d3.axisLeft(y));
        yAxisG.selectAll("text").style("font-size", "10px"); 

        zeroLine.transition().duration(750)
            .attr("x1", x(0)).attr("x2", x(0))
            .attr("y1", 0).attr("y2", innerHeight);

        // 5. Draw Bars
        const groups = chart.selectAll(".product-group")
            .data(processedData, d => d.Product);

        const groupsEnter = groups.enter().append("g")
            .attr("class", "product-group")
            .attr("transform", d => `translate(0, ${y(d.Product)})`);
        
        groupsEnter.merge(groups)
            .transition().duration(750)
            .attr("transform", d => `translate(0, ${y(d.Product)})`);

        groups.exit().remove();

        // 6. Draw Rects
        // IMPORTANT: We pass 'd.Product' into the rect data so we know which product belongs to which bar
        const rects = groupsEnter.merge(groups).selectAll("rect")
            .data(d => subgroups.map(key => ({ key, value: d[key], product: d.Product })));

        rects.enter().append("rect")
            .merge(rects)
            .attr("cursor", "pointer")
            // --- CLICK HANDLER ---
            .on("click", (event, d) => {
                event.stopPropagation();
                onClickHandler(d.product);
            })
            // --- OPACITY LOGIC ---
            .attr("opacity", d => {
                if (activeProduct) {
                    return d.product === activeProduct ? 1 : 0.2; // Dim others
                }
                return 1;
            })
            // --- HOVER EFFECTS ---
            .on("mouseover", function (event, d) {
                // Determine opacity on hover (don't brighten if it's supposed to be dimmed)
                const isDimmed = activeProduct && d.product !== activeProduct;
                d3.select(this).attr("opacity", isDimmed ? 0.4 : 0.7);

                tooltip.style("opacity", 1)
                    .html(`<strong>${d.product}</strong><br/>${d.key}: $${Math.round(d.value).toLocaleString()}`);
            })
            .on("mousemove", event => {
                tooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function (event, d) {
                // Restore logic
                const opacity = activeProduct && d.product !== activeProduct ? 0.2 : 1;
                d3.select(this).attr("opacity", opacity);
                tooltip.style("opacity", 0);
            })
            .transition().duration(750)
            .attr("x", d => x(Math.min(0, d.value)))
            .attr("y", d => ySubgroup(d.key))
            .attr("width", d => Math.abs(x(d.value) - x(0)))
            .attr("height", ySubgroup.bandwidth())
            .attr("fill", d => d.key === "Profit" && d.value < 0 ? "#F44336" : color(d.key));
            
        rects.exit().remove();
    }

    return { update };
}