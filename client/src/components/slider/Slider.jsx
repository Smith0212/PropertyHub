"use client"

import { useState } from "react"
import "./slider.scss"

function Slider({ images }) {
  const [imageIndex, setImageIndex] = useState(null)
  const [showAllImages, setShowAllImages] = useState(false)

  // Limit initial display to 4 images
  const displayImages = showAllImages ? images : images.slice(0, 4)
  const hasMoreImages = images.length > 4

  const changeSlide = (direction) => {
    if (direction === "left") {
      if (imageIndex === 0) {
        setImageIndex(images.length - 1)
      } else {
        setImageIndex(imageIndex - 1)
      }
    } else {
      if (imageIndex === images.length - 1) {
        setImageIndex(0)
      } else {
        setImageIndex(imageIndex + 1)
      }
    }
  }

  const handleImageClick = (index) => {
    setImageIndex(index)
  }

  const handleMoreClick = () => {
    setShowAllImages(true)
  }

  return (
    <div className="slider">
      {imageIndex !== null && (
        <div className="fullSlider">
          <div className="arrow" onClick={() => changeSlide("left")}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </div>
          <div className="imgContainer">
            <img src={images[imageIndex] || "/placeholder.svg"} alt="" />
            <div className="image-counter">
              {imageIndex + 1} / {images.length}
            </div>
          </div>
          <div className="arrow" onClick={() => changeSlide("right")}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
          <div className="close" onClick={() => setImageIndex(null)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        </div>
      )}

      <div className="slider-container">
        <div className="bigImage">
          <img src={images[0] || "/placeholder.svg"} alt="" onClick={() => handleImageClick(0)} />
        </div>
        <div className="smallImages">
          {displayImages.slice(1, 4).map((image, index) => (
            <img src={image || "/placeholder.svg"} alt="" key={index} onClick={() => handleImageClick(index + 1)} />
          ))}

          {hasMoreImages && !showAllImages && displayImages.length >= 4 && (
            <div className="more-images" onClick={handleMoreClick}>
              <span>+{images.length - 4} more</span>
            </div>
          )}

          {showAllImages &&
            images
              .slice(4)
              .map((image, index) => (
                <img
                  src={image || "/placeholder.svg"}
                  alt=""
                  key={index + 4}
                  onClick={() => handleImageClick(index + 4)}
                />
              ))}
        </div>
      </div>
    </div>
  )
}

export default Slider
