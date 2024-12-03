"use client";

import ImageAnalyzer from "@/components/ImageAnalyzer";
import ImageUploader from "@/components/ImageUploader";
import FaceDetection from "@/components/Mediapipe";
import dynamic from 'next/dynamic';
import { useState } from "react";


const WebcamDetection = dynamic(
  () => import("@/components/VideoAnalyzer"),
  { ssr: false }
);

export default function Page() {
  const [selected, setSelected] = useState<"analyzer" | "uploader" | "video" | "mediapipe">("uploader");

  return (
    <>
      <div className="p-6 ">
        <div className="flex justify-center w-full">
          <div className={`w-fit flex justify-between p-2 border-gray-300 border rounded-lg shadow-lg`}>
            <span 
              onClick={() => setSelected("uploader")} 
              className={`cursor-pointer px-2 p-1 rounded-md ${selected === "uploader" ? "bg-black text-white" : "bg-white text-black"}`}
            >
              Image Uploader
            </span>
            <span 
              onClick={() => setSelected("analyzer")} 
              className={`cursor-pointer px-2 p-1 rounded-md ${selected === "analyzer" ? "bg-black text-white" : "bg-white text-black"}`}
            >
              Image Analyzer
            </span>
            <span 
              onClick={() => setSelected("video")} 
              className={`cursor-pointer px-2 p-1 rounded-md ${selected === "video" ? "bg-black text-white" : "bg-white text-black"}`}
            >
              Video Processing
            </span>
            <span 
              onClick={() => setSelected("mediapipe")} 
              className={`cursor-pointer px-2 p-1 rounded-md ${selected === "mediapipe" ? "bg-black text-white" : "bg-white text-black"}`}
            >
              MediaPipe
            </span>
          </div>
        </div>
        {selected === "uploader" ? <ImageUploader /> : selected === "analyzer" ? <ImageAnalyzer /> : selected === "video" ? <WebcamDetection/> : <FaceDetection/> }
      </div>
    </>
  );
}
