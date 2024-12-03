'use client'
import { useState } from 'react'

export default function ImageUploader() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [annotatedImage, setAnnotatedImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return

    setLoading(true)
    const file = e.target.files[0]
    setSelectedImage(URL.createObjectURL(file))

    const formData = new FormData()
    formData.append('image', file)

    try {
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const blob = await response.blob()
      setAnnotatedImage(URL.createObjectURL(blob))
    } catch (error) {
      console.error('Error uploading image:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <h1 className="text-4xl font-bold mb-8">YOLOv8 Object Detection</h1>
      <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="mb-8"
      />
      </div>
      

      <div className="grid grid-cols-2 gap-8">
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

        {loading && <div>Processing...</div>}

        {annotatedImage && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Detected Objects</h2>
            <img
              src={annotatedImage}
              alt="Annotated"
              className="max-w-md rounded-lg shadow-lg"
            />
          </div>
        )}
      </div>
    </main>
  )
}
