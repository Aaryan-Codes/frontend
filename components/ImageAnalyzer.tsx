"use client";
import { useState, useRef, useEffect } from "react";

interface Detection {
  bbox: number[];
  score: number;
  class_id: number;
  class_name: string;
}

export default function ImageAnalyzer() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBox, setSelectedBox] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawBox = (
    ctx: CanvasRenderingContext2D,
    detection: Detection,
    index: number
  ) => {
    const [x1, y1, x2, y2] = detection.bbox;
    const width = x2 - x1;
    const height = y2 - y1;

    // Draw box
    ctx.strokeStyle = selectedBox === index ? "#00ff00" : "#ff0000";
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, y1, width, height);

    // Draw label background
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    const textWidth = ctx.measureText(detection.class_name).width;
    ctx.fillRect(x1, y1 - 25, textWidth + 10, 20);

    // Draw label text
    ctx.fillStyle = "#ffffff";
    ctx.font = "14px Arial";
    ctx.fillText(detection.class_name, x1 + 5, y1 - 10);
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !selectedImage) return;

    const img = new Image();
    img.src = selectedImage;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      detections.forEach((detection, index) => {
        drawBox(ctx, detection, index);
      });
    };
  };

  useEffect(() => {
    redrawCanvas();
  }, [selectedImage, detections, selectedBox]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    detections.forEach((detection, index) => {
      const [x1, y1, x2, y2] = detection.bbox;
      if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
        setSelectedBox(index);
        setIsDragging(true);
        setDragStartPos({ x, y });
      }
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || selectedBox === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - dragStartPos.x;
    const dy = y - dragStartPos.y;

    const newDetections = [...detections];
    const bbox = newDetections[selectedBox].bbox;
    bbox[0] += dx;
    bbox[1] += dy;
    bbox[2] += dx;
    bbox[3] += dy;

    setDetections(newDetections);
    setDragStartPos({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    setLoading(true);
    const file = e.target.files[0];
    setSelectedImage(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("http://localhost:8000/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setDetections(data.detection_data);
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <h1 className="text-4xl font-bold mb-8">YOLOv8 Object Analyzer</h1>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="mb-8"
      />
<div className="flex gap-4">
      {selectedImage && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Original Image</h2>
          <img
            src={selectedImage}
            alt="Selected"
            className="max-w-md rounded-lg shadow-lg"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-8">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="border rounded-lg shadow-lg max-w-md "
        />

        {loading && <div>Processing...</div>}

        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Detected Objects</h2>
          {detections.map((detection, index) => (
            <div key={index} className="flex items-center gap-4">
              <input
                type="text"
                value={detection.class_name}
                onChange={(e) => {
                  const newDetections = [...detections];
                  newDetections[index].class_name = e.target.value;
                  setDetections(newDetections);
                }}
                className="border rounded px-2 py-1"
              />
              <span>Confidence: {(detection.score * 100).toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>
      </div>
    </main>
  );
}
