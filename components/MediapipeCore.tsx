"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from 'next/dynamic';
const Stage = dynamic(() => import('react-konva').then((mod) => mod.Stage), { ssr: false });
const Layer = dynamic(() => import('react-konva').then((mod) => mod.Layer), { ssr: false });
const Rect = dynamic(() => import('react-konva').then((mod) => mod.Rect), { ssr: false });
const Text = dynamic(() => import('react-konva').then((mod) => mod.Text), { ssr: false });

import {
  Detection,
  FilesetResolver,
  ObjectDetector
} from "@mediapipe/tasks-vision";

const MediapipeCore = () => {
  const [objectDetector, setObjectDetector] = useState<ObjectDetector | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [runningMode, setRunningMode] = useState("IMAGE");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isWebcamEnabled, setIsWebcamEnabled] = useState(false);

  useEffect(() => {
    const initializeObjectDetector = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
      );
      const detector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
          delegate: "GPU"
        },
        scoreThreshold: 0.5,
        runningMode
      });
      setObjectDetector(detector);
    };

    initializeObjectDetector();
  }, [runningMode]);

  const handleImageDetection = async (event: React.MouseEvent<HTMLImageElement>) => {
    if (!objectDetector) {
      alert("Object Detector is still loading. Please try again.");
      return;
    }

    if (runningMode === "VIDEO") {
      setRunningMode("IMAGE");
      await objectDetector.setOptions({ runningMode: "IMAGE" });
    }

    const imageElement = event.currentTarget as HTMLImageElement;
    const detectionResult = await objectDetector.detect(imageElement);
    setDetections(detectionResult.detections);
  };

  const enableWebcam = async () => {
    if (!objectDetector) {
      console.log("Wait! objectDetector not loaded yet.");
      return;
    }

    setIsWebcamEnabled(true);
    if (videoRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.play();

      const detectFromVideo = async () => {
        if (runningMode === "IMAGE") {
          setRunningMode("VIDEO");
          await objectDetector.setOptions({ runningMode: "VIDEO" });
        }

        if (videoRef.current) {
          const result = await objectDetector.detectForVideo(
            videoRef.current,
            performance.now()
          );
          setDetections(result.detections);
        }
        requestAnimationFrame(detectFromVideo);
      };

      detectFromVideo();
    }
  };

  return (
    <div>
      <h1>Object Detection with Konva</h1>
      <div style={{ position: "relative", display: "inline-block" }}>
        {isWebcamEnabled ? (
          <video ref={videoRef} style={{ width: "640px", height: "480px" }} />
        ) : (
          <img
            src="/sample-image.jpg"
            alt="Detect Objects"
            style={{ width: "640px", height: "480px" }}
            onClick={handleImageDetection}
          />
        )}

        <div
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none"
          }}
        >
          <Stage width={640} height={480}>
            <Layer>
              {detections.map((detection, index) => (
                <React.Fragment key={index}>
                  <Rect
                    x={detection.boundingBox.originX}
                    y={detection.boundingBox.originY}
                    width={detection.boundingBox.width}
                    height={detection.boundingBox.height}
                    stroke="red"
                    strokeWidth={2}
                  />
                  <Text
                    x={detection.boundingBox.originX}
                    y={detection.boundingBox.originY - 20}
                    text={`${detection.categories[0].categoryName}
                      ${detection.categories[0].score * 100}%`}
                    fontSize={16}
                    fill="white"
                    padding={4}
                    backgroundColor="black"
                  />
                </React.Fragment>
              ))}
            </Layer>
          </Stage>
        </div>
      </div>

      {!isWebcamEnabled && (
        <button onClick={enableWebcam}>Enable Webcam</button>
      )}
    </div>
  );
};

export default MediapipeCore;
