// charts/pie.js
export function initPie(containerId, onClickHandler) {
    const container = d3.select(`#${containerId}`);
    const w = container.node().getBoundingClientRect().width;
    const h = container.node().getBoundingClientRect().height;
    const radius = Math.min(w, h) * 0.35;

    const svg = container.append("svg").attr("width", w).attr("height", h);
    const g = svg.append("g").attr("transform", `translate(${w / 2}, ${h / 2})`);

    // Title
    const titleText = svg.append("text")
        .attr("x", w / 2).attr("y", 40)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px").attr("font-weight", "bold").attr("fill", "#333")
        .text("Total US Revenue");

    // Generators
    const pieLayout = d3.pie().value(d => d[1]).sort(null);
    const arcGenerator = d3.arc().innerRadius(0).outerRadius(radius);

    // Legend Container
    const legend = container.append("div")
        .style("position", "absolute").style("bottom", "20px").style("right", "20px")
        .style("background", "rgba(255,255,255,0.9)").style("padding", "10px")
        .style("border-radius", "8px").style("font-size", "12px")
        .style("box-shadow", "0 2px 5px rgba(0,0,0,0.1)");

    // --- UPDATE FUNCTION ---
    function update(data, currentTitle, colorScale, activeCategory) {
        // Aggregate data by Category
        const salesByCat = d3.rollup(data, v => d3.sum(v, d => d.Sales), d => d.Category);
        const pieData = pieLayout(Array.from(salesByCat));
        const totalSales = d3.sum(pieData, d => d.value);

        // Update Title
        titleText.text(currentTitle);

        // Update Legend
        legend.html("");
        Array.from(salesByCat.keys()).sort().forEach(cat => {
            legend.append("div").html(
                `<span style="display:inline-block;width:12px;height:12px;background:${colorScale(cat)};border-radius:2px;margin-right:8px;"></span>${cat}`
            );
        });

        // Update Slices
        const paths = g.selectAll("path.pie-slice").data(pieData, d => d.data[0]);

        paths.join(
            enter => enter.append("path")
                .attr("class", "pie-slice")
                .attr("fill", d => colorScale(d.data[0]))
                .attr("stroke", "white").attr("stroke-width", 2)
                .attr("d", arcGenerator)
                .each(function(d) { this._current = d; }) // Store for animation
                .on("mouseover", function() { d3.select(this).attr("stroke", "#333"); })
                .on("mouseout", function() { d3.select(this).attr("stroke", "white"); })
                .on("click", (event, d) => {
                    event.stopPropagation();
                    onClickHandler(d.data[0]);
                }),
            update => update.transition().duration(750)
                .attrTween("d", function(d) {
                    const i = d3.interpolate(this._current, d);
                    this._current = i(0);
                    return t => arcGenerator(i(t));
                })
        )
        .attr("opacity", d => {
            // If specific category is active, highlight it, else all 1
            if (activeCategory) {
                return d.data[0] === activeCategory ? 1 : 0.3;
            }
            return 1;
        });

        // Update Labels (Percent)
        const texts = g.selectAll("text.pie-label").data(pieData, d => d.data[0]);
        texts.join(
            enter => enter.append("text")
                .attr("class", "pie-label")
                .attr("transform", d => `translate(${arcGenerator.centroid(d)})`)
                .attr("text-anchor", "middle").attr("font-size", "14px")
                .attr("fill", "white").attr("font-weight", "bold").attr("pointer-events", "none")
                .text(d => d.value > 0 ? ((d.value / totalSales) * 100).toFixed(0) + "%" : ""),
            update => update.transition().duration(750)
                .attr("transform", d => `translate(${arcGenerator.centroid(d)})`)
                .text(d => d.value > 0 ? ((d.value / totalSales) * 100).toFixed(0) + "%" : "")
                .style("opacity", d => (d.endAngle - d.startAngle < 0.2) ? 0 : 1)
        );
    }

    return { update };
}