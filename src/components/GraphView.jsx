import React, { useEffect, useRef, useState } from "react";

const GraphView = ({ notes, onSelectNote }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Resize canvas
    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    // Initialize Simulation
    const nodes = notes.map((n) => ({
      id: n.id,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: 0,
      vy: 0,
      radius: 5 + Math.min(n.content.length / 500, 10), // Size based on content length
      label: n.title || "Untitled",
    }));

    const links = [];

    // Create links based on [[WikiLinks]]
    notes.forEach((sourceNote) => {
      const sourceNode = nodes.find((n) => n.id === sourceNote.id);
      if (!sourceNode) return;

      const linkRegex = /\[\[(.*?)\]\]/g;
      let match;
      while ((match = linkRegex.exec(sourceNote.content)) !== null) {
        const targetTitle = match[1];
        const targetNote = notes.find(
          (n) => n.title.toLowerCase() === targetTitle.toLowerCase()
        );
        if (targetNote) {
          const targetNode = nodes.find((n) => n.id === targetNote.id);
          if (targetNode && targetNode !== sourceNode) {
            links.push({ source: sourceNode, target: targetNode });
          }
        }
      }
    });

    let animationFrameId;
    let isDragging = false;
    let dragNode = null;

    // Force Layout Physics
    const simulate = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Physics constants
      const repulsion = 1000;
      const springLength = 100;
      const springStrength = 0.05;
      const centeringForce = 0.01;
      const damping = 0.9;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Apply forces
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Center attraction
        node.vx += (cx - node.x) * centeringForce;
        node.vy += (cy - node.y) * centeringForce;

        // Repulsion
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const other = nodes[j];
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (dist * dist);
          node.vx += (dx / dist) * force;
          node.vy += (dy / dist) * force;
        }
      }

      // Spring force
      links.forEach((link) => {
        const dx = link.target.x - link.source.x;
        const dy = link.target.y - link.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - springLength) * springStrength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        link.source.vx += fx;
        link.source.vy += fy;
        link.target.vx -= fx;
        link.target.vy -= fy;
      });

      // Update positions
      nodes.forEach((node) => {
        if (node === dragNode) return; // Don't move dragged node
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;

        // Boundary
        node.x = Math.max(
          node.radius,
          Math.min(canvas.width - node.radius, node.x)
        );
        node.y = Math.max(
          node.radius,
          Math.min(canvas.height - node.radius, node.y)
        );
      });

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw links
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      links.forEach((link) => {
        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle =
          node === dragNode || node === hoveredNode ? "#6366f1" : "#a5b4fc";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Labels
        ctx.fillStyle = "#374151";
        ctx.font = "10px Inter";
        ctx.textAlign = "center";
        ctx.fillText(node.label, node.x, node.y + node.radius + 12);
      });

      animationFrameId = requestAnimationFrame(simulate);
    };

    simulate();

    // Interaction Handlers
    const handleMouseDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Find clicked node
      const clicked = nodes.find((n) => {
        const dx = n.x - x;
        const dy = n.y - y;
        return dx * dx + dy * dy <= n.radius * n.radius + 100; // Hit area
      });

      if (clicked) {
        isDragging = true;
        dragNode = clicked;
      }
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isDragging && dragNode) {
        dragNode.x = x;
        dragNode.y = y;
        dragNode.vx = 0;
        dragNode.vy = 0;
      }

      const hovered = nodes.find((n) => {
        const dx = n.x - x;
        const dy = n.y - y;
        return dx * dx + dy * dy <= n.radius * n.radius + 100;
      });
      setHoveredNode(hovered || null);
      canvas.style.cursor = hovered ? "pointer" : "default";
    };

    const handleMouseUp = () => {
      if (!isDragging && hoveredNode) {
        onSelectNote(hoveredNode.id);
      }
      isDragging = false;
      dragNode = null;
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", () => {
      isDragging = false;
      dragNode = null;
    });

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [notes, onSelectNote]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-gray-50 relative overflow-hidden rounded-lg border border-gray-200"
    >
      <canvas ref={canvasRef} className="absolute inset-0 block" />
      <div className="absolute top-4 right-4 bg-white/80 backdrop-blur p-2 rounded-lg shadow text-xs text-gray-500">
        Interactive Graph View
      </div>
    </div>
  );
};

export default GraphView;
