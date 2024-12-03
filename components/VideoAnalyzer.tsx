import React, { useEffect, useRef, useState } from 'react';

interface Detection {
    x: number;
    y: number;
    width: number;
    height: number;
    label: number;
    id?: string;
}

interface WebSocketResponse {
    detections: Detection[];
}

const stringToColor = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const h = hash % 360;
    const s = 75 + (hash % 25);
    const l = 50 + (hash % 20);
    
    return `hsl(${h}, ${s}%, ${l}%)`;
};

const WebcamDetection: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const [detections, setDetections] = useState<Detection[]>([]);
    const [smoothDetections, setSmoothDetections] = useState<Detection[]>([]);
    const previousDetections = useRef<Detection[]>([]);
    const animationFrameId = useRef<number>();

    const interpolateDetections = (
        previous: Detection[],
        current: Detection[],
        progress: number
    ): Detection[] => {
        return current.map((detection) => {
            const previousDetection = previous.find(p => p.label === detection.label);
            return {
                ...detection,
                x: lerp(previousDetection?.x ?? detection.x, detection.x, progress),
                y: lerp(previousDetection?.y ?? detection.y, detection.y, progress),
                width: lerp(previousDetection?.width ?? detection.width, detection.width, progress),
                height: lerp(previousDetection?.height ?? detection.height, detection.height, progress),
            };
        });
    };

    const lerp = (start: number, end: number, progress: number): number => {
        return start + (end - start) * progress;
    };

    const drawDetections = (detections: Detection[]) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const video = videoRef.current;

        if (canvas && ctx && video) {
            const displayWidth = video.offsetWidth;
            const displayHeight = video.offsetHeight;
            
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            
            const scaleX = displayWidth / video.videoWidth;
            const scaleY = displayHeight / video.videoHeight;

            // Clear canvas before drawing new detections
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            smoothDetections.forEach(({ x, y, width, height, label }) => {
                const scaledX = x * scaleX;
                const scaledY = y * scaleY;
                const scaledWidth = width * scaleX;
                const scaledHeight = height * scaleY;

                ctx.strokeStyle = stringToColor(label.toString());
                ctx.lineWidth = Math.max(2, Math.min(scaleX, scaleY) * 2);
                ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

                ctx.fillStyle = stringToColor(label.toString());
                const fontSize = Math.max(16, Math.min(scaleX, scaleY) * 24);
                ctx.font = `${fontSize}px Arial`;
                ctx.fillText(`${label}`, scaledX, scaledY - 5);
            });
        }
    };

    useEffect(() => {
        if (detections.length === 0) {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            setSmoothDetections([]);
        }
    }, [detections]);

    useEffect(() => {
        let startTime: number;
        const animationDuration = 100;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / animationDuration, 1);

            const smoothed = interpolateDetections(previousDetections.current, detections, progress);
            setSmoothDetections(smoothed);

            if (progress < 1) {
                animationFrameId.current = requestAnimationFrame(animate);
            } else {
                previousDetections.current = detections;
            }
        };

        if (detections.length > 0) {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            startTime = 0;
            animationFrameId.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [detections]);

    useEffect(() => {
        const startWebcam = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
            } catch (err) {
                console.error('Error accessing webcam:', err);
            }
        };

        startWebcam();

        const setupWebSocket = () => {
            wsRef.current = new WebSocket('ws://localhost:8000/ws/detect');

            wsRef.current.onopen = () => {
                console.log('WebSocket connected');
            };

            wsRef.current.onmessage = (event) => {
                const response: WebSocketResponse = JSON.parse(event.data);
                setDetections(response.detections);
                drawDetections(response.detections);
            };

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            wsRef.current.onclose = () => {
                console.log('WebSocket disconnected');
            };
        };

        setupWebSocket();

        const sendFrame = () => {
            const canvas = document.createElement('canvas');
            const video = videoRef.current;

            if (video && wsRef.current?.readyState === WebSocket.OPEN) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

                const base64Data = canvas.toDataURL('image/jpeg').split(',')[1];
                wsRef.current.send(base64Data);
            }
        };

        const interval = setInterval(sendFrame, 100);

        return () => {
            clearInterval(interval);
            wsRef.current?.close();
        };
    }, []);

    useEffect(() => {
        drawDetections(smoothDetections);
    }, [smoothDetections]);

    return (
        <div style={{position: 'relative', width: '100%', maxWidth: '800px', margin: 'auto' }}>
            <video ref={videoRef} style={{ width: '100%' }} autoPlay playsInline muted />
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                }}
            />
        </div>
    );
};

export default WebcamDetection;
