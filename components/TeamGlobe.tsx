
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TeamMember } from '../types';

interface TeamGlobeProps {
    members: TeamMember[];
}

export const TeamGlobe: React.FC<TeamGlobeProps> = ({ members }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Render Globe with GeoJSON source
    useEffect(() => {
         const renderGlobe = async () => {
            if (!svgRef.current || !containerRef.current) return;

            const width = containerRef.current.clientWidth;
            const height = 450;
            
            const svg = d3.select(svgRef.current)
                .attr("width", width)
                .attr("height", height);
            
            svg.selectAll("*").remove();

            // Load GeoJSON directly
            const response = await fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson');
            const data = await response.json();

            const projection = d3.geoOrthographic()
                .scale(height / 2.3)
                .translate([width / 2, height / 2])
                .clipAngle(90);

            const path = d3.geoPath().projection(projection);

            // Groups
            const globeGroup = svg.append("g");
            const mapGroup = globeGroup.append("g");
            const markersGroup = globeGroup.append("g");

            // Water
            mapGroup.append("path")
                .datum({ type: "Sphere" })
                .attr("class", "fill-blue-50 dark:fill-slate-900 stroke-none")
                .attr("d", path as any);

            // Graticule
            const graticule = d3.geoGraticule();
            mapGroup.append("path")
                .datum(graticule)
                .attr("class", "fill-none stroke-blue-100 dark:stroke-slate-800 stroke-[0.5px]")
                .attr("d", path as any);

            // Countries
            mapGroup.selectAll("path.country")
                .data(data.features)
                .enter().append("path")
                .attr("class", "country fill-slate-200 dark:fill-slate-700 stroke-white dark:stroke-slate-800 stroke-[0.5px]")
                .attr("d", path as any);

            // Borders
            mapGroup.append("path")
                .datum({ type: "Sphere" })
                .attr("class", "fill-none stroke-slate-300 dark:stroke-slate-700 stroke-[1.5px]")
                .attr("d", path as any);

            // Markers
            const updateMarkers = () => {
                const visibleMembers = members.filter(m => {
                    if (!m.lat || !m.lng) return false;
                    const center = projection.invert?.([width/2, height/2]);
                    if (!center) return false;
                    return d3.geoDistance(
                        [m.lng, m.lat], 
                        center
                    ) < 1.57; // Approx 90 degrees
                });

                const markers = markersGroup.selectAll("g.marker")
                    .data(visibleMembers, (d: any) => d.id);

                markers.exit().remove();

                const enter = markers.enter().append("g")
                    .attr("class", "marker cursor-pointer");

                // Pulse effect
                enter.append("circle")
                    .attr("r", 8)
                    .attr("class", "fill-blue-500/30 animate-ping");

                enter.append("circle")
                    .attr("r", 4)
                    .attr("class", "fill-blue-600 dark:fill-blue-400 stroke-white dark:stroke-slate-900 stroke-2");

                // Tooltip Label
                enter.append("text")
                    .text(d => d.name)
                    .attr("y", -10)
                    .attr("text-anchor", "middle")
                    .attr("class", "text-[10px] font-bold fill-slate-700 dark:fill-white drop-shadow-md");

                markersGroup.selectAll("g.marker")
                    .attr("transform", (d: any) => {
                        const coords = projection([d.lng || 0, d.lat || 0]);
                        return coords ? `translate(${coords[0]}, ${coords[1]})` : null;
                    })
                    .style("display", (d: any) => {
                         // Hide if back of globe
                         const center = projection.invert?.([width/2, height/2]);
                         if (!center) return "none";
                         
                         const coords = [d.lng || 0, d.lat || 0];
                         const gdistance = d3.geoDistance(coords as [number, number], center);
                         return gdistance > 1.57 ? "none" : "block";
                    });
            };

            // Rotation
            let rotate = [0, -30];
            const velocity = [0.05, 0];
            
            const timer = d3.timer(() => {
                rotate[0] += velocity[0];
                projection.rotate(rotate as [number, number]);
                
                mapGroup.selectAll("path").attr("d", path as any);
                updateMarkers();
            });

            // Drag behavior
            const drag = d3.drag<SVGSVGElement, unknown>()
                .on("start", () => {
                    timer.stop();
                    document.body.style.cursor = "grabbing";
                })
                .on("drag", (event) => {
                    const rotate = projection.rotate();
                    const k = 75 / projection.scale();
                    projection.rotate([
                        rotate[0] + event.dx * k,
                        rotate[1] - event.dy * k
                    ]);
                    mapGroup.selectAll("path").attr("d", path as any);
                    updateMarkers();
                })
                .on("end", () => {
                    // Restart rotation slowly from current position
                    rotate = projection.rotate() as [number, number];
                    timer.restart(() => {
                         rotate[0] += velocity[0];
                         projection.rotate(rotate as [number, number]);
                         mapGroup.selectAll("path").attr("d", path as any);
                         updateMarkers();
                    });
                    document.body.style.cursor = "default";
                });

            svg.call(drag as any);

            return () => {
                timer.stop();
            };
        };

        renderGlobe();
    }, [members]);

    return (
        <div ref={containerRef} className="w-full h-[450px] bg-slate-100 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative shadow-inner">
             <div className="absolute top-4 left-4 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-slate-500 border border-slate-200 dark:border-slate-700 shadow-sm">
                Interactive Team Map
            </div>
            <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing"></svg>
        </div>
    );
};
