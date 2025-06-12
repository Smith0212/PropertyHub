"use client"

import { useEffect, useState } from "react"
import "./filter.scss"
import { useSearchParams } from "react-router-dom"

function Filter() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState({
    type: searchParams.get("type") || "",
    city: searchParams.get("city") || "",
    property: searchParams.get("property") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    bedroom: searchParams.get("bedroom") || "",
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setQuery((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Auto-update search params when query changes
  useEffect(() => {
    // Debounce to avoid too many updates
    const timer = setTimeout(() => {
      // Filter out empty values
      const filteredQuery = Object.fromEntries(Object.entries(query).filter(([_, value]) => value !== ""))
      setSearchParams(filteredQuery)
    }, 500)

    return () => clearTimeout(timer)
  }, [query, setSearchParams])

  return (
    <div className="filter">
      <h1>
        {searchParams.get("city") ? (
          <>
            Search results for <b>{searchParams.get("city")}</b>
          </>
        ) : (
          <>All Properties</>
        )}
      </h1>

      <div className="filter-container">
        <div className="filter-row">
          <div className="filter-item location">
            <label htmlFor="city">Location</label>
            <input
              type="text"
              id="city"
              name="city"
              placeholder="City or Location"
              onChange={handleChange}
              value={query.city}
            />
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-item">
            <label htmlFor="type">Type</label>
            <select name="type" id="type" onChange={handleChange} value={query.type}>
              <option value="">Any</option>
              <option value="buy">Buy</option>
              <option value="rent">Rent</option>
            </select>
          </div>

          <div className="filter-item">
            <label htmlFor="property">Property</label>
            <select name="property" id="property" onChange={handleChange} value={query.property}>
              <option value="">Any</option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="condo">Condo</option>
              <option value="land">Land</option>
            </select>
          </div>

          <div className="filter-item">
            <label htmlFor="minPrice">Min Price</label>
            <input
              type="number"
              id="minPrice"
              name="minPrice"
              placeholder="Any"
              onChange={handleChange}
              value={query.minPrice}
            />
          </div>

          <div className="filter-item">
            <label htmlFor="maxPrice">Max Price</label>
            <input
              type="number"
              id="maxPrice"
              name="maxPrice"
              placeholder="Any"
              onChange={handleChange}
              value={query.maxPrice}
            />
          </div>

          <div className="filter-item">
            <label htmlFor="bedroom">Bedrooms</label>
            <select id="bedroom" name="bedroom" onChange={handleChange} value={query.bedroom}>
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5+</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Filter
