"use client"

import { useState, useEffect } from "react"
import "./editPostPage.scss"
import ReactQuill from "react-quill"
import "react-quill/dist/quill.snow.css"
import apiRequest from "../../lib/apiRequest"
import UploadWidget from "../../components/uploadWidget/UploadWidget"
import { useNavigate, useParams } from "react-router-dom"

function EditPostPage() {
  const [value, setValue] = useState("")
  const [images, setImages] = useState([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [postData, setPostData] = useState(null)
  const navigate = useNavigate()
  const { id } = useParams()

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await apiRequest.get(`/posts/${id}`)
        const post = res.data
        setPostData(post)
        setValue(post.postDetail.desc)
        setImages(post.images)
      } catch (err) {
        console.log(err)
        setError("Failed to load post data")
        navigate("/profile")
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [id, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const inputs = Object.fromEntries(formData)

    if (images.length === 0) {
      setError("Please add at least one image")
      return
    }

    try {
      setLoading(true)
      const res = await apiRequest.put(`/posts/${id}`, {
        postData: {
          title: inputs.title,
          price: Number.parseInt(inputs.price),
          address: inputs.address,
          city: inputs.city,
          bedroom: Number.parseInt(inputs.bedroom),
          bathroom: Number.parseInt(inputs.bathroom),
          type: inputs.type,
          property: inputs.property,
          latitude: inputs.latitude,
          longitude: inputs.longitude,
          images: images,
        },
        postDetail: {
          desc: value,
          utilities: inputs.utilities,
          pet: inputs.pet,
          income: inputs.income,
          size: Number.parseInt(inputs.size),
          school: Number.parseInt(inputs.school),
          bus: Number.parseInt(inputs.bus),
          restaurant: Number.parseInt(inputs.restaurant),
        },
      })
      navigate(`/property/${res.data.id}`)
    } catch (err) {
      console.log(err)
      setError("Failed to update post")
    } finally {
      setLoading(false)
    }
  }

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="editPostPage">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading post data...</p>
        </div>
      </div>
    )
  }

  if (!postData) {
    return (
      <div className="editPostPage">
        <div className="error">
          <p>Post not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="editPostPage">
      <div className="formContainer">
        <div className="header">
          <h1>Edit Property</h1>
          <button onClick={() => navigate(-1)} className="back-btn">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-grid">
              <div className="form-item full-width">
                <label htmlFor="title">Property Title *</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  defaultValue={postData.title}
                  placeholder="Enter property title"
                />
              </div>

              <div className="form-item">
                <label htmlFor="price">Price (₹) *</label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  required
                  min="0"
                  defaultValue={postData.price}
                  placeholder="Enter price"
                />
              </div>

              <div className="form-item">
                <label htmlFor="type">Listing Type *</label>
                <select name="type" required defaultValue={postData.type}>
                  <option value="rent">For Rent</option>
                  <option value="buy">For Sale</option>
                </select>
              </div>

              <div className="form-item">
                <label htmlFor="property">Property Type *</label>
                <select name="property" required defaultValue={postData.property}>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="condo">Condo</option>
                  <option value="land">Land</option>
                </select>
              </div>

              <div className="form-item full-width">
                <label htmlFor="address">Address *</label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  required
                  defaultValue={postData.address}
                  placeholder="Enter full address"
                />
              </div>

              <div className="form-item">
                <label htmlFor="city">City *</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  required
                  defaultValue={postData.city}
                  placeholder="Enter city"
                />
              </div>

              <div className="form-item">
                <label htmlFor="bedroom">Bedrooms *</label>
                <input id="bedroom" name="bedroom" type="number" required min="0" defaultValue={postData.bedroom} />
              </div>

              <div className="form-item">
                <label htmlFor="bathroom">Bathrooms *</label>
                <input id="bathroom" name="bathroom" type="number" required min="0" defaultValue={postData.bathroom} />
              </div>

              <div className="form-item">
                <label htmlFor="latitude">Latitude</label>
                <input
                  id="latitude"
                  name="latitude"
                  type="text"
                  defaultValue={postData.latitude}
                  placeholder="Enter latitude"
                />
              </div>

              <div className="form-item">
                <label htmlFor="longitude">Longitude</label>
                <input
                  id="longitude"
                  name="longitude"
                  type="text"
                  defaultValue={postData.longitude}
                  placeholder="Enter longitude"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Description</h3>
            <div className="description-editor">
              <ReactQuill theme="snow" onChange={setValue} value={value} />
            </div>
          </div>

          <div className="form-section">
            <h3>Additional Details</h3>
            <div className="form-grid">
              <div className="form-item">
                <label htmlFor="size">Size (sqft)</label>
                <input
                  id="size"
                  name="size"
                  type="number"
                  min="0"
                  defaultValue={postData.postDetail.size}
                  placeholder="Enter size in sqft"
                />
              </div>

              <div className="form-item">
                <label htmlFor="utilities">Utilities Policy</label>
                <select name="utilities" defaultValue={postData.postDetail.utilities}>
                  <option value="owner">Owner is responsible</option>
                  <option value="tenant">Tenant is responsible</option>
                  <option value="shared">Shared</option>
                </select>
              </div>

              <div className="form-item">
                <label htmlFor="pet">Pet Policy</label>
                <select name="pet" defaultValue={postData.postDetail.pet}>
                  <option value="allowed">Allowed</option>
                  <option value="not-allowed">Not Allowed</option>
                </select>
              </div>

              <div className="form-item">
                <label htmlFor="income">Income Policy</label>
                <input
                  id="income"
                  name="income"
                  type="text"
                  defaultValue={postData.postDetail.income}
                  placeholder="Income requirements"
                />
              </div>

              <div className="form-item">
                <label htmlFor="school">School Distance (km)</label>
                <input
                  id="school"
                  name="school"
                  type="number"
                  min="0"
                  step="0.1"
                  defaultValue={postData.postDetail.school}
                  placeholder="Distance to nearest school"
                />
              </div>

              <div className="form-item">
                <label htmlFor="bus">Bus Stop Distance (km)</label>
                <input
                  id="bus"
                  name="bus"
                  type="number"
                  min="0"
                  step="0.1"
                  defaultValue={postData.postDetail.bus}
                  placeholder="Distance to nearest bus stop"
                />
              </div>

              <div className="form-item">
                <label htmlFor="restaurant">Restaurant Distance (km)</label>
                <input
                  id="restaurant"
                  name="restaurant"
                  type="number"
                  min="0"
                  step="0.1"
                  defaultValue={postData.postDetail.restaurant}
                  placeholder="Distance to nearest restaurant"
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Updating..." : "Update Property"}
            </button>
            {error && <div className="error-message">{error}</div>}
          </div>
        </form>
      </div>

      <div className="imageContainer">
        <h3>Property Images</h3>
        <div className="image-grid">
          {images.map((image, index) => (
            <div key={index} className="image-item">
              <img src={image || "/placeholder.svg"} alt={`Property ${index + 1}`} />
              <button type="button" onClick={() => removeImage(index)} className="remove-image" title="Remove image">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
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
              </button>
            </div>
          ))}
        </div>
        <div className="upload-section">
          <UploadWidget
            uwConfig={{
              multiple: true,
              cloudName: "dx8tyyenv",
              uploadPreset: "estate",
              folder: "posts",
            }}
            setState={setImages}
          />
          <p>Upload high-quality images of your property</p>
        </div>
      </div>
    </div>
  )
}

export default EditPostPage
