import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

const InteractiveD3ChartWithNumbers = () => {
  const svgRef = useRef();
  const [dotGroups, setDotGroups] = useState([]);
  const [mode, setMode] = useState("add");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [currentGroupId, setCurrentGroupId] = useState(0);
  const [rotationDegree, setRotationDegree] = useState(0);

  const isPointInRotatedRect = (point, rect, angle) => {
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;

    // Translate point to origin
    const translatedX = point[0] - centerX;
    const translatedY = point[1] - centerY;

    // Rotate point around origin
    const angleRad = (angle * Math.PI) / 180;
    const rotatedX = translatedX * Math.cos(angleRad) + translatedY * Math.sin(angleRad);
    const rotatedY = -translatedX * Math.sin(angleRad) + translatedY * Math.cos(angleRad);

    // Translate back
    const finalX = rotatedX + centerX;
    const finalY = rotatedY + centerY;

    // Check if point is inside rectangle
    return (
      finalX >= rect.x &&
      finalX <= rect.x + rect.width &&
      finalY >= rect.y &&
      finalY <= rect.y + rect.height
    );
  };

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg
      .attr("width", 800)
      .attr("height", 400)
      .style("background", "#e9f5ff")
      .style("cursor", mode === "select" ? "pointer" : "crosshair");

    svg.selectAll("*").remove();

    let selection = null;
    const dotSpacing = 30;

    const dragBehavior = d3
      .drag()
      .on("start", (event) => {
        if (mode === "select") return;
        const [x, y] = d3.pointer(event);
        selection = { x, y, width: 0, height: 0 };
        svg.append("rect").attr("class", "selection");
        svg.append("text").attr("class", "dimension-text");
      })
      .on("drag", (event) => {
        if (mode === "select") return;
        const [x, y] = d3.pointer(event);
        selection.width = Math.abs(x - selection.x);
        selection.height = Math.abs(y - selection.y);
        selection.x = x < selection.x ? x : selection.x;
        selection.y = y < selection.y ? y : selection.y;

        svg
          .select(".selection")
          .attr("x", selection.x)
          .attr("y", selection.y)
          .attr("width", selection.width)
          .attr("height", selection.height)
          .style("fill", "rgba(100, 150, 255, 0.3)");

        const rowCount = Math.floor(selection.height / dotSpacing);
        const colCount = Math.floor(selection.width / dotSpacing);

        svg
          .select(".dimension-text")
          .attr("x", selection.x + selection.width / 2)
          .attr("y", selection.y + selection.height / 2)
          .text(`${colCount}x${rowCount}`);
      })
      .on("end", () => {
        if (mode === "select" || !selection) return;

        if (mode === "add") {
          const rowCount = Math.floor(selection.height / dotSpacing);
          const colCount = Math.floor(selection.width / dotSpacing);
          generateDots(selection, rowCount, colCount);
        } else if (mode === "delete") {
          deleteDots(selection);
        }

        svg.select(".selection").remove();
        svg.select(".dimension-text").remove();
        selection = null;
      });

    svg.call(dragBehavior);

    svg.on("click", (event) => {
      if (mode !== "select") return;

      const [x, y] = d3.pointer(event);
      const clickedGroup = dotGroups.find((group) =>
        isPointInRotatedRect([x, y], group.bounds, group.rotation || 0)
      );

      if (clickedGroup) {
        setSelectedGroup(clickedGroup.id);
        setRotationDegree(clickedGroup.rotation || 0);
      } else {
        setSelectedGroup(null);
      }
    });

    dotGroups.forEach((group) => {
      const isSelected = group.id === selectedGroup;
      const rotation = group.rotation || 0;

      // Calculate center point of the group
      const centerX = group.bounds.x + group.bounds.width / 2;
      const centerY = group.bounds.y + group.bounds.height / 2;

      // Create a group element for the entire dot group
      const groupElement = svg
        .append("g")
        .attr("class", `dot-group-${group.id}`)
        .attr("transform", `rotate(${rotation}, ${centerX}, ${centerY})`);

      if (isSelected) {
        groupElement
          .append("rect")
          .attr("x", group.bounds.x - 2)
          .attr("y", group.bounds.y - 2)
          .attr("width", group.bounds.width + 4)
          .attr("height", group.bounds.height + 4)
          .attr("fill", "none")
          .attr("stroke", "#2196f3")
          .attr("stroke-width", 2);
      }

      // Draw dots and numbers
      group.dots.forEach((d, i) => {
        groupElement
          .append("circle")
          .attr("cx", d.cx)
          .attr("cy", d.cy)
          .attr("r", 10)
          .attr("fill", isSelected ? "#2196f3" : "#4caf50");

        groupElement
          .append("text")
          .attr("x", d.cx)
          .attr("y", d.cy + 4)
          .text(i + 1)
          .style("fill", "#fff")
          .style("font-size", "10px")
          .style("text-anchor", "middle");
      });

      // Draw labels
      group.labels.forEach((label) => {
        groupElement
          .append("text")
          .attr("x", label.x)
          .attr("y", label.y)
          .text(label.label)
          .style("fill", "#333")
          .style("font-size", "12px")
          .style("font-weight", "bold")
          .style("text-anchor", "end");
      });
    });
  }, [dotGroups, mode, selectedGroup]);

  // Rest of the component remains the same...

  const generateDots = (selection, rowCount, colCount) => {
    const dotSpacing = 30;
    const generatedDots = [];
    const rowLabels = [];

    for (let i = 0; i < rowCount; i++) {
      for (let j = 0; j < colCount; j++) {
        generatedDots.push({
          cx: selection.x + j * dotSpacing,
          cy: selection.y + i * dotSpacing,
        });
      }

      rowLabels.push({
        label: `Row ${i + 1}`,
        x: selection.x - 40,
        y: selection.y + i * dotSpacing,
      });
    }

    setDotGroups((prev) => [
      ...prev,
      {
        id: currentGroupId,
        dots: generatedDots,
        labels: rowLabels,
        bounds: {
          x: selection.x,
          y: selection.y,
          width: selection.width,
          height: selection.height,
        },
        rotation: 0
      },
    ]);
    setCurrentGroupId((prev) => prev + 1);
  };

  const deleteDots = (selection) => {
    setDotGroups((prev) =>
      prev
        .map((group) => ({
          ...group,
          dots: group.dots.filter(
            (dot) =>
              !(
                dot.cx >= selection.x &&
                dot.cx <= selection.x + selection.width &&
                dot.cy >= selection.y &&
                dot.cy <= selection.y + selection.height
              )
          ),
        }))
        .filter((group) => group.dots.length > 0)
    );
  };

  const alignSelected = (alignment) => {
    if (selectedGroup === null) return;

    setDotGroups((prev) =>
      prev.map((group) => {
        if (group.id !== selectedGroup) return group;

        const dots = [...group.dots];
        const bounds = group.bounds;

        const rowGroups = {};
        dots.forEach((dot) => {
          const key = dot.cy;
          if (!rowGroups[key]) rowGroups[key] = [];
          rowGroups[key].push(dot);
        });

        const newDots = [];
        Object.entries(rowGroups).forEach(([y, rowDots]) => {
          const sortedDots = rowDots.sort((a, b) => a.cx - b.cx);
          const rowWidth = (sortedDots.length - 1) * 30;

          sortedDots.forEach((dot, index) => {
            let newX;
            if (alignment === "center") {
              newX = bounds.x + (bounds.width - rowWidth) / 2 + index * 30;
            } else if (alignment === "right") {
              newX = bounds.x + bounds.width - rowWidth + index * 30;
            } else {
              newX = bounds.x + index * 30;
            }
            newDots.push({ ...dot, cx: newX });
          });
        });

        return { ...group, dots: newDots };
      })
    );
  };

  const handleRotate = () => {
    if (selectedGroup === null) return;

    setDotGroups((prev) =>
      prev.map((group) =>
        group.id === selectedGroup
          ? { ...group, rotation: parseInt(rotationDegree) || 0 }
          : group
      )
    );

  };


  const handleStretch = (value) => {
    const newStretchFactor = parseFloat(value);
    setStretchFactor(newStretchFactor);

    setDotGroups((prev) =>
      prev.map((group) =>
        group.id === selectedGroup
          ? { ...group, stretchFactor: newStretchFactor }
          : group
      )
    );
  };
  return (
    <div className="w-full max-w-4xl">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            setMode("add");
            setSelectedGroup(null);
          }}
          className={`px-4 py-2 text-white ${mode === "add" ? "bg-green-500" : "bg-gray-400"}`}
        >
          Add
        </button>
        <button
          onClick={() => {
            setMode("select");
            setSelectedGroup(null);
          }}
          className={`px-4 py-2 text-white ${mode === "select" ? "bg-blue-500" : "bg-gray-400"}`}
        >
          Select
        </button>
        <button
          onClick={() => {
            setMode("delete");
            setSelectedGroup(null);
          }}
          className={`px-4 py-2 text-white ${mode === "delete" ? "bg-red-500" : "bg-gray-400"}`}
        >
          Delete
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => alignSelected("left")}
          className={`px-4 py-2 text-white ${selectedGroup !== null ? "bg-blue-500" : "bg-gray-400"}`}
          disabled={selectedGroup === null}
        >
          Left Align
        </button>
        <button
          onClick={() => alignSelected("center")}
          className={`px-4 py-2 text-white ${selectedGroup !== null ? "bg-blue-500" : "bg-gray-400"}`}
          disabled={selectedGroup === null}
        >
          Center Align
        </button>
        <button
          onClick={() => alignSelected("right")}
          className={`px-4 py-2 text-white ${selectedGroup !== null ? "bg-blue-500" : "bg-gray-400"}`}
          disabled={selectedGroup === null}
        >
          Right Align
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="number"
          value={rotationDegree}
          onChange={(e) => setRotationDegree(e.target.value)}
          placeholder="Enter rotation degree"
          className="px-4 py-2 border rounded"
          disabled={selectedGroup === null}
        />
        <button
          onClick={handleRotate}
          className={`px-4 py-2 text-white ${selectedGroup !== null ? "bg-purple-500" : "bg-gray-400"}`}
          disabled={selectedGroup === null}
        >
          Rotate
        </button>
      </div>

      <svg ref={svgRef}></svg>
    </div>
  );
};

export default InteractiveD3ChartWithNumbers; 