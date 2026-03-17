import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Clock, Moon, Play, Pause } from 'lucide-react';
import { TeamMember } from '../types';

interface TimelineSliderProps {
    currentDate: Date;
    onChange: (date: Date) => void;
    onReset: () => void;
    isLive?: boolean;
    members?: TeamMember[];
}

export const TimelineSlider: React.FC<TimelineSliderProps> = ({ currentDate, onChange, onReset, isLive = false, members = [] }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Fixed Height for compact view
    const TOTAL_HEIGHT = 120;
    const MARGIN = { left: 20, right: 20 };

    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return;

        const width = containerRef.current.clientWidth;
        const innerWidth = width - MARGIN.left - MARGIN.right;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // 24 Hour Window centered around current time
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);

        const xScale = d3.scaleTime()
            .domain([startOfDay, endOfDay])
            .range([0, innerWidth]);

        const g = svg.append("g")
            .attr("transform", `translate(${MARGIN.left}, 0)`);

        // --- Axis ---
        const xAxis = d3.axisTop(xScale)
            .ticks(d3.timeHour.every(3))
            .tickFormat((d) => d3.timeFormat("%H:%M")(d as Date))
            .tickSize(0)
            .tickPadding(10);

        const axisGroup = g.append("g")
            .attr("class", "axis-group text-slate-400 dark:text-slate-500 text-xs select-none font-medium")
            .attr("transform", `translate(0, 30)`)
            .call(xAxis);
        
        axisGroup.select(".domain").remove();

        // Draw major ticks manually for better styling
        const ticks = xScale.ticks(d3.timeHour.every(1));
        g.selectAll(".tick-mark")
            .data(ticks)
            .enter()
            .append("line")
            .attr("x1", d => xScale(d))
            .attr("x2", d => xScale(d))
            .attr("y1", 35)
            .attr("y2", (d) => (d.getHours() % 3 === 0) ? 50 : 42)
            .attr("class", (d) => (d.getHours() % 3 === 0) ? "stroke-slate-300 dark:stroke-slate-600" : "stroke-slate-200 dark:stroke-slate-800")
            .attr("stroke-width", 1);


        // --- Compact Member Lines ---
        // Instead of full rows, we draw a set of stacked lines at the bottom
        const LINES_START_Y = 60;
        const LINE_HEIGHT = 4;
        const LINE_GAP = 2;
        
        members.forEach((member, index) => {
            const y = LINES_START_Y + (index * (LINE_HEIGHT + LINE_GAP));
            if (y > TOTAL_HEIGHT - 10) return; // Clip if too many members

            // Draw full background line
            g.append("line")
                .attr("x1", 0)
                .attr("x2", innerWidth)
                .attr("y1", y)
                .attr("y2", y)
                .attr("class", "stroke-slate-100 dark:stroke-slate-800/50")
                .attr("stroke-width", LINE_HEIGHT)
                .attr("stroke-linecap", "round");

            // Calculate work segments
            const startX = xScale(startOfDay);
            const endX = xScale(endOfDay);
            const pixels = d3.range(0, innerWidth, 2);

            const checkTime = (date: Date) => {
                 try {
                    const localStr = date.toLocaleString("en-US", { timeZone: member.timezone });
                    const localDate = new Date(localStr);
                    const h = localDate.getHours();
                    if (member.workStartHour < member.workEndHour) {
                        return h >= member.workStartHour && h < member.workEndHour;
                    } else {
                        return h >= member.workStartHour || h < member.workEndHour;
                    }
                 } catch(e) { return false; }
            };

            // Optimization: Create segments
            let segments: {x: number, w: number}[] = [];
            let currentStart = -1;
            
            // Simplified logic: Check every pixel is expensive. Check every 30 mins (approx 20px)
            // Better: Iterate hours 0-24, convert to x
            for(let h=0; h<24; h++) {
                // Check if this UTC hour is working for member
                const dateAtHour = new Date(startOfDay);
                dateAtHour.setHours(h);
                if (checkTime(dateAtHour)) {
                    const x1 = xScale(dateAtHour);
                    const x2 = xScale(new Date(startOfDay).setHours(h+1));
                    g.append("line")
                        .attr("x1", x1)
                        .attr("x2", x2)
                        .attr("y1", y)
                        .attr("y2", y)
                        .attr("class", "stroke-blue-400 dark:stroke-blue-500/70")
                        .attr("stroke-width", LINE_HEIGHT);
                }
            }
        });


        // --- Interaction ---

        // Background click area
        g.append("rect")
            .attr("width", innerWidth)
            .attr("height", TOTAL_HEIGHT)
            .attr("fill", "transparent")
            .attr("cursor", "crosshair")
            .on("click", (event) => {
                 const [x] = d3.pointer(event);
                 const newTime = xScale.invert(x);
                 const updatedDate = new Date(currentDate);
                 updatedDate.setHours(newTime.getHours(), newTime.getMinutes());
                 onChange(updatedDate);
            });

        // Drag Behavior
        const drag = d3.drag<SVGGElement, unknown>()
            .on("start", () => setIsDragging(true))
            .on("drag", (event) => {
                let newX = event.x;
                if (newX < 0) newX = 0;
                if (newX > innerWidth) newX = innerWidth;
                
                const newTime = xScale.invert(newX);
                const updatedDate = new Date(currentDate);
                updatedDate.setHours(newTime.getHours(), newTime.getMinutes());
                onChange(updatedDate);
            })
            .on("end", () => setIsDragging(false));

        const xPos = xScale(currentDate);

        // Cursor Group
        const cursorGroup = g.append("g")
            .attr("transform", `translate(${xPos}, 0)`)
            .style("cursor", "grab")
            .call(drag as any);

        // Vertical Line
        cursorGroup.append("line")
            .attr("y1", 20)
            .attr("y2", TOTAL_HEIGHT)
            .attr("class", `stroke-blue-600 dark:stroke-blue-500 stroke-2 ${isLive ? 'opacity-100' : 'opacity-70'}`);

        // Top Handle
        cursorGroup.append("path")
            .attr("d", "M -6,20 L 6,20 L 6,30 L 0,36 L -6,30 Z")
            .attr("class", "fill-blue-600 dark:fill-blue-500");
        
        // Time Label Bubble
        cursorGroup.append("rect")
            .attr("x", -22)
            .attr("y", 0)
            .attr("width", 44)
            .attr("height", 18)
            .attr("rx", 4)
            .attr("class", `${isLive ? 'fill-red-500' : 'fill-slate-800'} transition-colors`);

        cursorGroup.append("text")
            .attr("x", 0)
            .attr("y", 12)
            .attr("text-anchor", "middle")
            .attr("class", "fill-white font-bold text-[10px]")
            .text(d3.timeFormat("%H:%M")(currentDate));

    }, [currentDate, onChange, members, TOTAL_HEIGHT, isLive]);

    return (
        <div className="w-full bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-lg dark:shadow-none transition-all duration-300">
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                    <span className="font-medium text-sm">Global Reference Time</span>
                    {isLive && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> LIVE
                        </span>
                    )}
                </div>
                <button 
                    onClick={onReset}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-medium
                        ${isLive 
                            ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                >
                    {isLive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    {isLive ? 'Pause Clock' : 'Return to Live'}
                </button>
            </div>
            
            <div ref={containerRef} className="w-full" style={{ height: TOTAL_HEIGHT }}>
                <svg ref={svgRef} width="100%" height="100%" className="overflow-visible"></svg>
            </div>
            
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-2 px-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                <div className="flex items-center gap-1"><Moon className="w-3 h-3"/> 00:00</div>
                <div className="flex items-center gap-1">24:00 <Moon className="w-3 h-3"/></div>
            </div>
        </div>
    );
};