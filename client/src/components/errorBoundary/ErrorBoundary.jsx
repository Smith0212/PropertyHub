"use client"

import React from "react"
import "./errorBoundary.scss"

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
    })
    console.error("Error caught by boundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="errorBoundary">
          <div className="errorContainer">
            <h1>Oops! Something went wrong</h1>
            <p>We are sorry, but something unexpected happened.</p>
            <div className="errorActions">
              <button onClick={() => window.location.reload()} className="retryButton">
                Reload Page
              </button>
              <button onClick={() => (window.location.href = "/")} className="homeButton">
                Go Home
              </button>
            </div>
            {/* {process.env.NODE_ENV === "development" && ( */}
              <details className="errorDetails">
                <summary>Error Details (Development Only)</summary>
                <pre>{this.state.error && this.state.error.toString()}</pre>
                <pre>{this.state.errorInfo.componentStack}</pre>
              </details>
            {/* )} */}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
