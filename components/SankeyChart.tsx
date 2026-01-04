import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

interface SankeyNodeData {
    name: string;
    value?: number;
    color: string;
}

interface SankeyLinkData {
    source: number;
    target: number;
    value: number;
    color?: string;
}

interface SankeyChartProps {
    nodes: SankeyNodeData[];
    links: SankeyLinkData[];
    currency?: string;
}

// Format large numbers
const formatValue = (n: number): string => {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
};

export const SankeyChart: React.FC<SankeyChartProps> = ({
    nodes,
    links,
    currency = 'USD'
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
    const [isDarkMode, setIsDarkMode] = useState(true);

    // Detect theme changes
    useEffect(() => {
        const checkTheme = () => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        };

        checkTheme();

        // Watch for class changes on documentElement
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, []);

    // Responsive: observe container size
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                // Maintain aspect ratio, minimum height 350px
                const height = Math.max(350, Math.min(500, width * 0.5));
                setDimensions({ width, height });
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        if (!svgRef.current || nodes.length === 0 || links.length === 0) return;

        const { width, height } = dimensions;
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        // Theme-aware colors
        const textPrimaryColor = isDarkMode ? '#f4f4f5' : '#18181b';
        const textSecondaryColor = isDarkMode ? '#a1a1aa' : '#52525b';
        const nodeStrokeColor = isDarkMode ? '#27272a' : '#e4e4e7';

        // Responsive margins based on width
        const margin = {
            top: 30,
            right: Math.max(120, width * 0.15),
            bottom: 30,
            left: Math.max(20, width * 0.02)
        };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create sankey generator
        const sankeyGenerator = sankey<SankeyNodeData, SankeyLinkData>()
            .nodeId((d: any) => d.index)
            .nodeWidth(20)
            .nodePadding(Math.max(20, height * 0.06))
            .extent([[0, 0], [innerWidth, innerHeight]])
            .nodeSort(null);

        // Prepare data
        const sankeyData = sankeyGenerator({
            nodes: nodes.map((n, i) => ({ ...n, index: i })),
            links: links.map(l => ({ ...l }))
        });

        // Create gradient definitions for links
        const defs = svg.append('defs');

        sankeyData.links.forEach((link: any, i: number) => {
            const sourceColor = (link.source as any).color || '#6b7280';
            const targetColor = (link.target as any).color || '#6b7280';

            const gradient = defs.append('linearGradient')
                .attr('id', `gradient-${i}`)
                .attr('gradientUnits', 'userSpaceOnUse')
                .attr('x1', link.source.x1)
                .attr('x2', link.target.x0);

            gradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', sourceColor)
                .attr('stop-opacity', 0.7);

            gradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', targetColor)
                .attr('stop-opacity', 0.7);
        });

        // Draw links
        g.append('g')
            .attr('fill', 'none')
            .selectAll('path')
            .data(sankeyData.links)
            .join('path')
            .attr('d', sankeyLinkHorizontal())
            .attr('stroke', (d: any, i: number) => `url(#gradient-${i})`)
            .attr('stroke-width', (d: any) => Math.max(2, d.width))
            .attr('opacity', 0.8)
            .style('mix-blend-mode', 'normal')
            .on('mouseenter', function () {
                d3.select(this).attr('opacity', 1);
            })
            .on('mouseleave', function () {
                d3.select(this).attr('opacity', 0.8);
            })
            .append('title')
            .text((d: any) => `${d.source.name} → ${d.target.name}\n${formatValue(d.value)}`);

        // Draw nodes
        const nodeGroup = g.append('g')
            .selectAll('g')
            .data(sankeyData.nodes)
            .join('g');

        nodeGroup.append('rect')
            .attr('x', (d: any) => d.x0)
            .attr('y', (d: any) => d.y0)
            .attr('height', (d: any) => Math.max(4, d.y1 - d.y0))
            .attr('width', (d: any) => d.x1 - d.x0)
            .attr('fill', (d: any) => d.color || '#6b7280')
            .attr('rx', 4)
            .attr('stroke', nodeStrokeColor)
            .attr('stroke-width', 1.5);

        // Responsive font sizes
        const nameFontSize = Math.max(13, Math.min(16, width * 0.018));
        const valueFontSize = Math.max(11, Math.min(14, width * 0.015));

        // Node labels - Name
        nodeGroup.append('text')
            .attr('x', (d: any) => d.x0 < innerWidth / 2 ? d.x1 + 10 : d.x0 - 10)
            .attr('y', (d: any) => (d.y1 + d.y0) / 2 - 8)
            .attr('dy', '0.35em')
            .attr('text-anchor', (d: any) => d.x0 < innerWidth / 2 ? 'start' : 'end')
            .attr('fill', textPrimaryColor)
            .attr('font-size', `${nameFontSize}px`)
            .attr('font-weight', '700')
            .attr('font-family', 'system-ui, -apple-system, sans-serif')
            .text((d: any) => d.name);

        // Value labels (below name)
        nodeGroup.append('text')
            .attr('x', (d: any) => d.x0 < innerWidth / 2 ? d.x1 + 10 : d.x0 - 10)
            .attr('y', (d: any) => (d.y1 + d.y0) / 2 + 10)
            .attr('dy', '0.35em')
            .attr('text-anchor', (d: any) => d.x0 < innerWidth / 2 ? 'start' : 'end')
            .attr('fill', textSecondaryColor)
            .attr('font-size', `${valueFontSize}px`)
            .attr('font-weight', '600')
            .attr('font-family', 'system-ui, -apple-system, sans-serif')
            .text((d: any) => formatValue(d.value || 0));

    }, [nodes, links, dimensions, isDarkMode]);

    return (
        <div
            ref={containerRef}
            className="w-full bg-gray-100 dark:bg-zinc-900/50 rounded-xl p-4 transition-colors duration-300"
        >
            <svg
                ref={svgRef}
                width={dimensions.width}
                height={dimensions.height}
                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-auto"
            />
        </div>
    );
};

export default SankeyChart;
