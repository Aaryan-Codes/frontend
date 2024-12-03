"use client";

import React, { useEffect, useRef, useState } from "react";
import { FilesetResolver, ObjectDetector } from "@mediapipe/tasks-vision";
import Link from "next/link";

export default function ObjectDetection() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [objectDetector, setObjectDetector] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const setupDetector = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        if (!mounted) return;

        const detector = await ObjectDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/models/efficientdet_lite0.tflite",
            delegate: "GPU",
          },
          scoreThreshold: 0.5,
          runningMode: "VIDEO",
        });

        if (!mounted) return;

        setObjectDetector(detector);
        setIsLoading(false);
        initializeWebcam();
      } catch (err) {
        console.error("Setup error:", err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    setupDetector();
    return () => {
      mounted = false;
    };
  }, []);

  const initializeWebcam = async () => {
    try {
      const constraints = {
        video: {
          width: 640,
          height: 480,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          detectFrame();
        };
      }
    } catch (err) {
      console.error("Webcam error:", err);
      setError("Could not access webcam");
    }
  };

  const detectFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !objectDetector) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Adjust canvas size to match video feed
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const processFrame = async () => {
      const startTimeMs = performance.now();
      const results = await objectDetector.detectForVideo(video, startTimeMs);

      // Clear canvas for new frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the video frame onto the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw bounding boxes and labels
      results.detections.forEach((detection) => {
        const { originX, originY, width, height } = detection.boundingBox;
        const x = originX * canvas.width;
        const y = originY * canvas.height;
        const w = width * canvas.width;
        const h = height * canvas.height;

        // Draw bounding box
        ctx.strokeStyle = "#FF0000";
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, w, h);

        // Draw label
        const label = `${detection.categories[0].categoryName} (${(
          detection.categories[0].score * 100
        ).toFixed(1)}%)`;
        ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
        ctx.fillRect(x, y - 25, ctx.measureText(label).width + 10, 25);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "16px Arial";
        ctx.fillText(label, x + 5, y - 5);
      });

      // Request next frame
      requestAnimationFrame(processFrame);
    };

    processFrame();
  };

  if (isLoading) {
    return <div className="text-white text-center">Loading object detection...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">Error: {error}</div>;
  }

  return (
    <div className="relative overflow-hidden flex items-center justify-center h-screen">
      <div className="relative z-10 text-center">
        <h1 className="text-2xl text-white mb-8">Object Detection</h1>

        <div className="flex flex-col items-center">
          <div className="relative w-[640px] h-[480px] bg-black">
            <video
              ref={videoRef}
              className="absolute top-0 left-0 w-full h-full"
              playsInline
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
            />
          </div>

          <div className="flex gap-4 mt-6">
            <Link
              href="/"
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
